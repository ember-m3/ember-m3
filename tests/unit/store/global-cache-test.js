import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { run } from '@ember/runloop';
import DefaultSchema from 'ember-m3/services/m3-schema';
import DS from 'ember-data';
import { A } from '@ember/array';
import sinon from 'sinon';

module('unit/store/global-cache', function(hooks) {
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
        _isProjection(modelName) {
          return /-projection$/i.test(modelName);
        }

        includesModel(modelName) {
          return /^com.example.bookstore\./i.test(modelName);
        }

        computeAttributeReference(key, value, modelName, schemaInterface) {
          let refId = schemaInterface.getAttr(`*${key}`);
          if (refId !== undefined) {
            let type = this._isProjection(modelName)
              ? 'com.example.bookstore.BookProjection'
              : null;

            return {
              id: refId,
              type,
            };
          }
        }

        computeBaseModelName(normalizedProjectionModelName) {
          if (this._isProjection(normalizedProjectionModelName)) {
            return normalizedProjectionModelName.substring(
              0,
              normalizedProjectionModelName.length - '-projection'.length
            );
          }
        }
      }
    );
    this.store = this.owner.lookup('service:store');
  });

  hooks.afterEach(function() {
    this.sinon.restore();
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

  test('projections are not added to the global m3 cache', function(assert) {
    run(() =>
      this.store.push({
        data: {
          type: 'com.example.bookstore.Book',
          id: 'urn:book:1',
          attributes: {
            title: 'A History of the English Speaking Peoples',
            '*otherBook': 'urn:book:2',
          },
        },
        included: [
          {
            type: 'com.example.bookstore.Book',
            id: 'urn:book:2',
            attributes: {
              title: 'The 30 Years War',
            },
          },
          {
            type: 'com.example.bookstore.BookProjection',
            id: 'urn:book:1',
          },
          {
            type: 'com.example.bookstore.BookProjection',
            id: 'urn:book:2',
          },
        ],
      })
    );

    let baseIds = this.store
      .peekAll('com.example.bookstore.Book')
      .map(x => x.id)
      .sort();
    assert.deepEqual(baseIds, ['urn:book:1', 'urn:book:2'], 'base records in cache');

    let projectionIds = this.store
      .peekAll('com.example.bookstore.BookProjection')
      .map(x => x.id)
      .sort();
    assert.deepEqual(projectionIds, ['urn:book:1', 'urn:book:2'], 'projection records in cache');

    let projectedBook = this.store.peekRecord('com.example.bookstore.BookProjection', 'urn:book:1');
    assert.equal(
      projectedBook.get('title'),
      'A History of the English Speaking Peoples',
      'projected attribute'
    );
    assert.equal(
      projectedBook.get('otherBook.title'),
      'The 30 Years War',
      'projected reference attribute'
    );
    assert.equal(
      projectedBook.get('otherBook._modelName'),
      'com.example.bookstore.book-projection',
      'projected reference can be projected record'
    );

    let baseBook = this.store.peekRecord('com.example.bookstore.Book', 'urn:book:1');
    assert.equal(
      baseBook.get('title'),
      'A History of the English Speaking Peoples',
      'base attribute'
    );
    assert.equal(baseBook.get('otherBook.title'), 'The 30 Years War', 'base reference attribute');
    assert.equal(
      baseBook.get('otherBook._modelName'),
      'com.example.bookstore.book',
      'base reference is a base record'
    );
  });
});
