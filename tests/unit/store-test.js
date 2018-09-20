import { A } from '@ember/array';
import { run } from '@ember/runloop';
import DS from 'ember-data';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import sinon from 'sinon';
import DefaultSchema from 'ember-m3/services/m3-schema';
import M3ReferenceArray from 'ember-m3/m3-reference-array';

module('unit/store', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.sinon = sinon.createSandbox();

    this.Author = DS.Model.extend({
      name: DS.attr('string'),
    });
    this.Author.toString = () => 'Author';
    this.owner.register('model:author', this.Author);

    this.owner.register(
      'service:m3-schema',
      class TestSchema extends DefaultSchema {
        includesModel(modelName) {
          return /^com.example.bookstore\./i.test(modelName);
        }
      }
    );
    this.store = this.owner.lookup('service:store');
  });

  hooks.afterEach(function() {
    this.sinon.restore();
  });

  test('store.push correctly handles m3-reference-array', function(assert) {
    // push book1 into the store
    const book1 = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439064873',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Chamber of Secrets`,
          },
        },
      });
    });
    // create array with book1
    const array1 = M3ReferenceArray.create({
      modelName: '-ember-m3',
      content: A([book1]),
      store: this.store,
      manager: this.store._recordArrayManager,
      key: 'relatedBooks',
    });
    // push model with array with book1 into store
    const model1 = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            relatedBooks: array1,
          },
        },
      });
    });
    // check that model in the store, it should just have book1
    assert.equal(
      this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439708180').get('relatedBooks')
        .length,
      1,
      'relatedBooks has 1 book'
    );

    //push book2 into the store
    const book2 = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439136365',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Prisoner of Azkaban`,
          },
        },
      });
    });
    // create array with book1 and book2
    const array2 = M3ReferenceArray.create({
      modelName: '-ember-m3',
      content: A([book1, book2]),
      store: this.store,
      manager: this.store._recordArrayManager,
      key: 'relatedBooks',
    });
    // update model with array with book1 and book2
    const model2 = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            relatedBooks: array2,
          },
        },
      });
    });
    // check model again, should have book1 and book2
    assert.equal(
      this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439708180').get('relatedBooks')
        .length,
      2,
      'relatedBooks has 2 books'
    );
  });

  test('records are added to, and unloaded from, the global m3 cache', function(assert) {
    run(() =>
      this.store.push({
        data: [
          {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
          },
          {
            id: 'isbn:9780439708180/chapter/1',
            type: 'com.example.bookstore.Chapter',
          },
          {
            id: 'isbn:9780439064873',
            type: 'com.example.bookstore.Book',
          },
          {
            id: 'isbn:9780439708180/chapter/2',
            type: 'com.example.bookstore.Chapter',
          },
          {
            id: 'author:1',
            type: 'author',
            attributes: {
              name: 'JK Rowling',
            },
          },
        ],
      })
    );

    assert.deepEqual(
      Object.keys(this.store._identityMap._map).sort(),
      ['author', 'com.example.bookstore.book', 'com.example.bookstore.chapter'],
      'Identity map contains expected types'
    );

    let bookIds = A(this.store._internalModelsFor('com.example.bookstore.book')._models).mapBy(
      'id'
    );

    assert.deepEqual(
      bookIds,
      ['isbn:9780439708180', 'isbn:9780439064873'],
      'Identity map contains expected models - book'
    );

    let chapterIds = A(
      this.store._internalModelsFor('com.example.bookstore.chapter')._models
    ).mapBy('id');

    assert.deepEqual(
      chapterIds,
      ['isbn:9780439708180/chapter/1', 'isbn:9780439708180/chapter/2'],
      'Identity map contains expected models - chapter'
    );

    assert.equal(this.store.hasRecordForId('author', 'author:1'), true);

    assert.deepEqual(
      Object.keys(this.store._globalM3Cache).sort(),
      [
        'isbn:9780439064873',
        'isbn:9780439708180',
        'isbn:9780439708180/chapter/1',
        'isbn:9780439708180/chapter/2',
      ],
      'global cache contains all m3 models, but no ds models'
    );

    run(() =>
      this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439708180').unloadRecord()
    );

    assert.deepEqual(
      Object.keys(this.store._globalM3Cache).sort(),
      ['isbn:9780439064873', 'isbn:9780439708180/chapter/1', 'isbn:9780439708180/chapter/2'],
      'global cache can unload records'
    );

    run(() => this.store.unloadAll());

    assert.deepEqual(
      Object.keys(this.store._globalM3Cache),
      [],
      'global cache can unload all records'
    );
  });
});
