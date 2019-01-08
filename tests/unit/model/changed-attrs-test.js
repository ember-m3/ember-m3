import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

import EmberObject, { get, set } from '@ember/object';
import { Promise } from 'rsvp';
import { run } from '@ember/runloop';
import { isArray } from '@ember/array';

import MegamorphicModel from 'ember-m3/model';
import M3RecordArray from 'ember-m3/record-array';
import DefaultSchema from 'ember-m3/services/m3-schema';

import { recordDataFor } from 'ember-m3/-private';

module('unit/model/changed-attrs', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.store = this.owner.lookup('service:store');

    class TestSchema extends DefaultSchema {
      includesModel() {
        return true;
      }

      computeAttributeReference(key, value, modelName, schemaInterface) {
        let refValue = schemaInterface.getAttr(`*${key}`);
        if (typeof refValue === 'string') {
          return {
            type: null,
            id: refValue,
          };
        } else if (Array.isArray(refValue)) {
          return refValue.map(x => ({
            type: null,
            id: x,
          }));
        }
        return null;
      }

      computeNestedModel(key, value) {
        if (value && typeof value === 'object' && value.constructor !== Date && !isArray(value)) {
          return {
            type: value.type,
            id: value.id,
            attributes: value,
          };
        }
      }
    }
    this.owner.register('service:m3-schema', TestSchema);
  });

  test('.changedAttributes returns the dirty attributes', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            author: 'George R. R. Martin',
            rating: 10,
            expectedPubDate: 'never',
          },
        },
      });
    });
    assert.ok(!model.get('isDirty'), 'model currently not dirty');
    assert.equal(model.currentState.stateName, 'root.loaded.saved', 'model.state loaded.saved');
    run(() => {
      model.set('name', 'Alice in Wonderland');
      model.set('rating', null);
      model.set('expectedPubDate', undefined);
    });
    assert.ok(model.get('isDirty'), 'model is dirty as new values are set on the model');
    assert.equal(
      model.currentState.stateName,
      'root.loaded.updated.uncommitted',
      'model state is updated.uncommitted'
    );
    assert.deepEqual(
      model.changedAttributes(),
      {
        name: ['The Winds of Winter', 'Alice in Wonderland'],
        rating: [10, null],
        expectedPubDate: ['never', undefined],
      },
      'changed attributes should be return as changed'
    );
  });

  test('nested models can report their own changed attributes', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            rating: {
              avg: 10,
            },
          },
        },
      });
    });
    model.set('rating.avg', 11);
    assert.deepEqual(model.get('rating').changedAttributes(), {
      avg: [10, 11],
    });
  });

  test('.changedAttributes returns nested dirty attributes within an object', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            number: 0,
            nextChapter: {
              name: 'The Boy Who whatever',
              number: 1,
              nextChapter: {
                name: 'The Vanishing dunno',
                number: 2,
              },
            },
            authorNotes: {
              value: 'this book should sell well',
            },
          },
        },
      });
    });

    let nested = get(model, 'nextChapter');
    let doubleNested = get(nested, 'nextChapter');

    assert.deepEqual(model.changedAttributes(), {}, 'initially no attributes are changed');
    assert.ok(!model.get('isDirty'), 'model currently not dirty');
    assert.equal(model.currentState.stateName, 'root.loaded.saved', 'model.state loaded.saved');

    run(() => {
      set(model, 'name', 'secret book name');
      set(model, 'newAttr', 'a wild attribute appears!');
    });

    assert.deepEqual(
      model.changedAttributes(),
      {
        name: [`Harry Potter and the Sorcerer's Stone`, 'secret book name'],
        newAttr: [undefined, 'a wild attribute appears!'],
      },
      'initially no attributes are changed'
    );

    run(() => {
      set(nested, 'name', 'a new chapter name');
      set(nested, 'newAttr', 'first chapter; new attr!');
      set(doubleNested, 'number', 24601);
      set(doubleNested, 'anotherNewAttr', 'another new attr!');
      set(model, 'authorNotes', { text: 'this book will definitely sell well' });
    });

    assert.deepEqual(
      model.changedAttributes(),
      {
        name: [`Harry Potter and the Sorcerer's Stone`, 'secret book name'],
        newAttr: [undefined, 'a wild attribute appears!'],
        nextChapter: {
          name: ['The Boy Who whatever', 'a new chapter name'],
          newAttr: [undefined, 'first chapter; new attr!'],
          nextChapter: {
            number: [2, 24601],
            anotherNewAttr: [undefined, 'another new attr!'],
          },
        },
        authorNotes: [
          { value: 'this book should sell well' },
          { text: 'this book will definitely sell well' },
        ],
      },
      'only changed attributes in nested models are included'
    );
    assert.ok(model.get('isDirty'), 'model is dirty as new values are set on the model');
    assert.equal(
      model.currentState.stateName,
      'root.loaded.updated.uncommitted',
      'model state is updated.uncommitted'
    );
  });

  test('.changedAttributes returns [ undefined, object ] for newly created nested models', function(assert) {
    assert.expect(2);

    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            estimatedPubDate: 'January 2622',
          },
        },
      });
    });

    model.set('author', { name: 'Chris' });
    let author = model.get('author');

    assert.deepEqual(
      author.changedAttributes(),
      { name: [undefined, 'Chris'] },
      'Changed attributes for the nested model is correct'
    );
    assert.deepEqual(
      model.changedAttributes(),
      { author: [undefined, { name: [undefined, 'Chris'] }] },
      'Changed attributes for the parent model is correct'
    );
  });

  test('.changedAttributes returns [ null, object ] for nested models that were previously set to null by the server', function(assert) {
    assert.expect(2);

    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            author: null,
            estimatedPubDate: 'January 2622',
          },
        },
      });
    });

    model.set('author', { name: 'Chris' });
    let author = model.get('author');
    assert.deepEqual(
      author.changedAttributes(),
      { name: [undefined, 'Chris'] },
      'Changed attributes for the nested model is correct'
    );
    assert.deepEqual(
      model.changedAttributes(),
      { author: [null, { name: [undefined, 'Chris'] }] },
      'Changed attributes for the parent model is correct'
    );
  });

  test('.changedAttributes returns dirty attributes for arrays of primitive values', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            author: 'George R. R. Martin',
            chapters: ['Windy eh', 'I guess winter was coming after all'],
          },
        },
      });
    });
    assert.ok(!model.get('isDirty'), 'model currently not dirty');
    assert.equal(model.currentState.stateName, 'root.loaded.saved', 'model.state loaded.saved');

    run(() => {
      set(model, 'chapters', ['so windy', 'winter winter']);
    });

    assert.deepEqual(
      model.changedAttributes(),
      {
        chapters: [
          ['Windy eh', 'I guess winter was coming after all'],
          ['so windy', 'winter winter'],
        ],
      },
      '.changedAttributes returns changed arrays'
    );
    assert.ok(model.get('isDirty'), 'model is dirty as new values are set on the model');
    assert.equal(
      model.currentState.stateName,
      'root.loaded.updated.uncommitted',
      'model state is updated.uncommitted'
    );
  });

  test('.changedAttributes returns dirty attributes for arrays of primitive values upon updating the array', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            author: 'George R. R. Martin',
            chapters: ['Windy eh', 'I guess winter was coming after all'],
          },
        },
      });
    });
    assert.ok(!model.get('isDirty'), 'model currently not dirty');
    assert.equal(model.currentState.stateName, 'root.loaded.saved', 'model.state loaded.saved');

    // Pushing simple value to array
    const chapters = model.get('chapters');
    run(() => {
      chapters.pushObject('New Chapter');
    });

    assert.deepEqual(
      model.changedAttributes(),
      {
        chapters: [
          ['Windy eh', 'I guess winter was coming after all'],
          ['Windy eh', 'I guess winter was coming after all', 'New Chapter'],
        ],
      },
      '.changedAttributes returns changed arrays'
    );

    // Pushing simple value to array
    run(() => {
      chapters.pushObject({
        name: 'Windy eh new',
        number: 1,
      });
    });

    assert.ok(chapters.get('lastObject') instanceof MegamorphicModel);
    assert.equal(
      chapters.get('lastObject').get('name'),
      'Windy eh new',
      'new embedded model has right attrs'
    );
    assert.equal(chapters.get('lastObject').get('number'), 1, 'new embedded model has right attrs');

    // Model is dirty
    assert.ok(model.get('isDirty'), 'model is dirty as new values are set on the model');
    assert.equal(
      model.currentState.stateName,
      'root.loaded.updated.uncommitted',
      'model state is updated.uncommitted'
    );
  });

  test('.changedAttributes returns dirty attributes for record array upon updating the array', function(assert) {
    let model = run(() =>
      this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            '*relatedBooks': ['isbn:9780439064873', 'isbn:9780439136365'],
            '*otherRecordArray': [],
          },
        },
        included: [
          {
            id: 'isbn:9780439064873',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Harry Potter and the Chamber of Secrets`,
            },
          },
          {
            id: 'isbn:9780439136365',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Harry Potter and the Prisoner of Azkaban`,
            },
          },
        ],
      })
    );

    let otherRecordArray = get(model, 'otherRecordArray');

    assert.ok(!model.get('isDirty'), 'model currently not dirty');
    assert.equal(model.currentState.stateName, 'root.loaded.saved', 'model.state loaded.saved');

    // Pushing simple value to array
    run(() => {
      otherRecordArray.pushObject(
        this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439064873')
      );
    });

    assert.ok(
      get(model.changedAttributes(), 'otherRecordArray'),
      '.changedAttributes returns changed record arrays'
    );

    assert.ok(
      get(model.changedAttributes(), 'otherRecordArray')[1] instanceof M3RecordArray,
      '.changedAttributes returns changed record arrays and data is instance of RecordArray'
    );

    // Model is dirty
    assert.ok(model.get('isDirty'), 'model is dirty as new values are set on the model');
    assert.equal(
      model.currentState.stateName,
      'root.loaded.updated.uncommitted',
      'model state is updated.uncommitted'
    );
  });

  test('.changedAttributes returns nested dirty attributes within arrays of nested models', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            author: 'George R. R. Martin',
            chapters: [
              {
                name: 'Windy eh',
                number: 1,
              },
              {
                name: `I guess winter was coming after all`,
                number: 2,
              },
            ],
            notes: [{ value: 'Unsure if this book will ever be published' }],
          },
        },
      });
    });

    let nestedModels = get(model, 'chapters');
    set(nestedModels.get('firstObject'), 'name', 'super windy');

    assert.deepEqual(
      model.changedAttributes(),
      {
        chapters: [
          {
            name: ['Windy eh', 'super windy'],
          },
          undefined,
        ],
      },
      '.changedAttributes returns nested dirty attributes within arrays of nested models'
    );
  });

  test('.rollbackAttributes resets state from dirty (uncached)', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
          },
        },
      });
    });

    run(() => {
      model.set('name', 'Some other book');
    });
    assert.ok(model.get('isDirty'), 'model is dirty as new values are set on the model');
    assert.equal(
      model.currentState.stateName,
      'root.loaded.updated.uncommitted',
      'model state is updated.uncommitted'
    );

    run(() => {
      model.rollbackAttributes();
    });

    assert.ok(!model.get('isDirty'), 'model currently not dirty');
    assert.equal(
      model.currentState.stateName,
      'root.loaded.saved',
      'after rolling back model.state loaded.saved'
    );
    assert.equal(
      get(model, 'name'),
      'The Winds of Winter',
      'rollbackAttributes reverts changes to the record'
    );
  });

  test('.rollbackAttributes resets state from dirty (cached)', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
          },
        },
      });
    });

    run(() => {
      model.set('name', 'Some other book');
      // cache new value in resolution cache
      assert.equal(get(model, 'name'), 'Some other book', 'value is set correctly (and cached)');
      model.rollbackAttributes();
    });

    assert.equal(
      get(model, 'currentState.stateName'),
      'root.loaded.saved',
      'after rolling back model.state loaded.saved'
    );
    assert.equal(
      get(model, 'name'),
      'The Winds of Winter',
      'rollbackAttributes reverts changes to the record'
    );
  });

  test('.rollbackAttributes rolls back nested dirty attributes', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            nextChapter: {
              name: 'The first chapter',
            },
          },
        },
      });
    });

    set(model, 'nextChapter.name', 'The beginning');
    assert.equal(get(model, 'nextChapter.name'), 'The beginning', 'nested model attribute changed');

    model.rollbackAttributes();

    assert.equal(
      get(model, 'nextChapter.name'),
      'The first chapter',
      'rollbackAttributes reverts changes to the nested model'
    );

    assert.deepEqual(
      model.changedAttributes(),
      {},
      'after rollback, there are no changed attriutes'
    );
  });

  test('.rollbackAttributes rolls back nested dirty attributes after a rejected save', function(assert) {
    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        updateRecord() {
          return Promise.reject();
        },
      })
    );
    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            nextChapter: {
              name: 'The first chapter',
            },
          },
        },
      });
    });

    set(model, 'nextChapter.name', 'The beginning');
    assert.equal(get(model, 'nextChapter.name'), 'The beginning', 'nested model attribute changed');

    return run(() => model.save()).then(
      value => {
        throw new Error(`unexpected promise fulfillment with value ${value}`);
      },
      () => {
        model.rollbackAttributes();

        assert.equal(
          get(model, 'nextChapter.name'),
          'The first chapter',
          'rollbackAttributes reverts changes to the nested model'
        );

        assert.deepEqual(
          model.changedAttributes(),
          {},
          'after rollback, there are no changed attriutes'
        );
      }
    );
  });

  test('updates from .save do not overwrite attributes  or nested attributes set after .save is called', function(assert) {
    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        updateRecord() {
          return Promise.resolve({
            data: {
              id: 1,
              type: 'com.example.bookstore.Book',
              attributes: {
                name: "Harry Potter and the Sorcerer's Stone",
                author: 'J. K. Rowling',
                nextChapter: {
                  name: 'The Boy Who Lived',
                  number: 1,
                  nextChapter: {
                    name: 'The Vanishing Glass',
                    number: 2,
                  },
                },
              },
            },
          });
        },
      })
    );
    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            author: 'George R. R. Martin',
            nextChapter: {
              name: 'Windy eh',
              number: 1,
              nextChapter: {
                name: `I guess winter was coming after all`,
                number: 2,
              },
            },
          },
        },
      });
    });
    let nestedModel = get(model, 'nextChapter');
    let doubleNested = get(model, 'nextChapter.nextChapter');

    run(() => {
      set(model, 'name', 'Alice in Wonderland');
      set(nestedModel, 'name', 'There must be some first chapter');
      set(doubleNested, 'name', 'Likely there is a second chapter as well');
    });

    return run(() => {
      let savePromise = model.save();

      set(model, 'author', 'Lewis Carroll');
      set(nestedModel, 'number', 6);
      set(doubleNested, 'number', 24601);

      return savePromise.then(() => {
        assert.equal(
          get(model, 'author'),
          'Lewis Carroll',
          'the author was set after save, should not be updated'
        );
        assert.equal(
          get(model, 'name'),
          "Harry Potter and the Sorcerer's Stone",
          'the name of the book is updated from the save'
        );

        assert.equal(
          get(nestedModel, 'number'),
          6,
          'the author was set after save, should not be updated'
        );
        assert.equal(
          get(nestedModel, 'name'),
          'The Boy Who Lived',
          'the name of the first chapter is updated from the save'
        );

        assert.equal(
          get(doubleNested, 'number'),
          24601,
          'the author was set after save, should not be updated'
        );
        assert.equal(
          get(doubleNested, 'name'),
          'The Vanishing Glass',
          'the name of the second chapter is updated from the save'
        );
      });
    });
  });

  test('updates from .save clear changed attributes in nested models within arrays', function(assert) {
    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        updateRecord() {
          return Promise.resolve({
            data: {
              id: 1,
              type: 'com.example.bookstore.Book',
              attributes: {
                name: "Harry Potter and the Sorcerer's Stone",
                author: 'J. K. Rowling',
                chapters: [
                  {
                    name: 'The Boy Who Lived',
                    number: 1,
                  },
                  {
                    name: 'The Vanishing Glass',
                    number: 2,
                  },
                ],
              },
            },
          });
        },
      })
    );
    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            author: 'George R. R. Martin',
            chapters: [
              {
                name: 'Windy eh',
                number: 1,
              },
              {
                name: `I guess winter was coming after all`,
                number: 2,
              },
            ],
          },
        },
      });
    });

    let nestedModels = get(model, 'chapters');
    set(nestedModels.get('firstObject'), 'name', 'super windy');

    assert.deepEqual(
      get(model, 'chapters').map(m => get(m, 'name')),
      ['super windy', 'I guess winter was coming after all'],
      'initially properties reflect locally changed attributes'
    );

    return run(() => {
      let savePromise = model.save();

      set(nestedModels.get('firstObject'), 'name', 'sooooooo super windy');

      return savePromise.then(() => {
        assert.deepEqual(
          get(model, 'chapters').map(m => get(m, 'name')),
          ['The Boy Who Lived', 'The Vanishing Glass'],
          'local changes to nested models within arrays are not preserved after adapter commit'
        );
      });
    });
  });

  test('local nested model within non-array updates without server payload', function(assert) {
    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        updateRecord() {
          return Promise.resolve();
        },
      })
    );

    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            author: 'George R. R. Martin',
            rating: 10,
            expectedPubDate: 'never',
            nextChapter: {
              name: 'Chapter 1',
              number: 1,
              nextChapter: {
                name: 'Chapter 2',
                nunmber: 2,
              },
            },
          },
        },
      });
    });

    let doubleNestedModel = get(model, 'nextChapter.nextChapter');
    set(doubleNestedModel, 'name', 'Chapter 3');
    return run(() =>
      model.save().then(data => {
        assert.deepEqual(recordDataFor(data)._data, {
          name: 'The Winds of Winter',
          author: 'George R. R. Martin',
          rating: 10,
          expectedPubDate: 'never',
          nextChapter: {
            name: 'Chapter 1',
            number: 1,
            nextChapter: {
              name: 'Chapter 3',
              nunmber: 2,
            },
          },
        });
        doubleNestedModel = get(data, 'nextChapter.nextChapter');
        assert.deepEqual(
          doubleNestedModel.changedAttributes(),
          {},
          'doubleNestedModel has no changedAttributes'
        );
        assert.deepEqual(data.changedAttributes(), {}, 'changedAttributes is empty');
      })
    );
  });

  test('local nested model within array updates without server payload', function(assert) {
    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        updateRecord() {
          return Promise.resolve();
        },
      })
    );

    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            author: 'George R. R. Martin',
            rating: 10,
            expectedPubDate: 'never',
            chapters: [
              {
                name: 'Windy eh',
                number: 1,
              },
              {
                name: `I guess winter was coming after all`,
                number: 2,
              },
            ],
          },
        },
      });
    });

    let nestedModels = get(model, 'chapters');
    set(nestedModels.get('firstObject'), 'name', 'super windy');
    return run(() =>
      model.save().then(data => {
        assert.deepEqual(recordDataFor(data)._data, {
          name: 'The Winds of Winter',
          author: 'George R. R. Martin',
          rating: 10,
          expectedPubDate: 'never',
          chapters: [
            {
              name: 'super windy',
              number: 1,
            },
            {
              name: `I guess winter was coming after all`,
              number: 2,
            },
          ],
        });
        assert.deepEqual(data.changedAttributes(), {}, 'changedAttributes is empty');
      })
    );
  });

  test('local nested model within non-array updates overriden by server payload', function(assert) {
    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        updateRecord() {
          return Promise.resolve({
            data: {
              id: 1,
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'The Winds of Winter',
                author: 'George R. R. Martin',
                rating: 10,
                expectedPubDate: 'never',
                nextChapter: {
                  name: 'Chapter 3',
                  number: 1,
                  nextChapter: {
                    name: 'Chapter 4',
                  },
                },
              },
            },
          });
        },
      })
    );

    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            author: 'George R. R. Martin',
            rating: 10,
            expectedPubDate: 'never',
            nextChapter: {
              name: 'Chapter 1',
              number: 1,
              nextChapter: {
                name: 'Chapter 2',
                number: 2,
              },
            },
          },
        },
      });
    });

    let doubleNestedModel = get(model, 'nextChapter.nextChapter');
    set(doubleNestedModel, 'name', 'Chapter 3');
    return run(() =>
      model.save().then(data => {
        assert.deepEqual(recordDataFor(data)._data, {
          name: 'The Winds of Winter',
          author: 'George R. R. Martin',
          rating: 10,
          expectedPubDate: 'never',
          nextChapter: {
            name: 'Chapter 3',
            number: 1,
            nextChapter: {
              name: 'Chapter 4',
              number: 2,
            },
          },
        });
        doubleNestedModel = get(data, 'nextChapter.nextChapter');
        assert.deepEqual(
          doubleNestedModel.changedAttributes(),
          {},
          'doubleNestedModel has no changedAttributes'
        );
        assert.deepEqual(data.changedAttributes(), {}, 'changedAttributes is empty');
      })
    );
  });

  test('local nested model within array updates overriden by server payload', function(assert) {
    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        updateRecord() {
          return Promise.resolve({
            data: {
              id: 1,
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'The Winds of Winter',
                author: 'George R. R. Martin',
                rating: 10,
                expectedPubDate: 'never',
                chapters: [
                  {
                    name: 'Chapter 4',
                    number: 1,
                  },
                ],
              },
            },
          });
        },
      })
    );

    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            author: 'George R. R. Martin',
            rating: 10,
            expectedPubDate: 'never',
            chapters: [
              {
                name: 'Chapter 1',
                number: 1,
              },
              {
                name: 'Chapter 2',
                number: 2,
              },
            ],
          },
        },
      });
    });

    let nestedModel = get(model, 'chapters');
    set(nestedModel.get('firstObject'), 'name', 'super windy');
    return run(() =>
      model.save().then(data => {
        assert.deepEqual(recordDataFor(data)._data, {
          name: 'The Winds of Winter',
          author: 'George R. R. Martin',
          rating: 10,
          expectedPubDate: 'never',
          chapters: [
            {
              name: 'Chapter 4',
              number: 1,
            },
          ],
        });
        assert.deepEqual(data.changedAttributes(), {}, 'changedAttributes is empty');
      })
    );
  });

  test('partial update from server and local changes for nested models within non-array', function(assert) {
    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        updateRecord() {
          return Promise.resolve({
            data: {
              id: 'isbn:9780439708180',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: `Harry Potter and the Sorcerer's Stone`,
                number: 0,
                nextChapter: {
                  name: 'The Boy Who whatever',
                  number: 1,
                },
                authorNotes: {
                  value: 'this book should sell well',
                },
              },
            },
          });
        },
      })
    );

    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            number: 0,
            nextChapter: {
              name: 'The Boy Who whatever',
              number: 1,
              nextChapter: {
                name: 'The Vanishing dunno',
                number: 2,
              },
            },
            authorNotes: {
              value: 'this book should sell well',
            },
          },
        },
      });
    });

    let doubleNestedModel = get(model, 'nextChapter.nextChapter');
    set(doubleNestedModel, 'name', 'The Vanishing Boy');
    return run(() =>
      model.save().then(data => {
        assert.deepEqual(recordDataFor(data)._data, {
          name: `Harry Potter and the Sorcerer's Stone`,
          number: 0,
          nextChapter: {
            name: 'The Boy Who whatever',
            number: 1,
            nextChapter: {
              name: 'The Vanishing Boy',
              number: 2,
            },
          },
          authorNotes: {
            value: 'this book should sell well',
          },
        });
        doubleNestedModel = get(data, 'nextChapter.nextChapter');
        assert.deepEqual(
          doubleNestedModel.changedAttributes(),
          {},
          'doubleNestedModel has no changedAttributes'
        );
        assert.deepEqual(data.changedAttributes(), {}, 'changedAttributes is empty');
      })
    );
  });

  test('partial update from server and local changes for nested models within array', function(assert) {
    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        updateRecord() {
          return Promise.resolve({
            data: {
              id: 'isbn:9780439708180',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: `Harry Potter and the Sorcerer's Stone`,
                number: 0,
                nextChapter: {
                  number: 1,
                  characters: [
                    {
                      name: 'Voldemort',
                      number: 2,
                    },
                  ],
                },
                authorNotes: {
                  value: 'this book should sell well',
                },
              },
            },
          });
        },
      })
    );

    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            number: 0,
            nextChapter: {
              name: 'The Boy Who whatever',
              number: 1,
              characters: [
                {
                  name: 'Harry Potter',
                  number: 2,
                },
                {
                  name: 'Ron',
                  number: 3,
                },
              ],
            },
            authorNotes: {
              value: 'this book should sell well',
            },
          },
        },
      });
    });

    let nestedModel = get(model, 'nextChapter');
    let doubleNestedModel = get(nestedModel, 'characters');
    run(() => {
      set(nestedModel, 'name', 'The Boy Who Lived');
      set(doubleNestedModel.get('firstObject'), 'name', 'Professor Snape');
    });

    return run(() =>
      model.save().then(data => {
        assert.deepEqual(recordDataFor(data)._data, {
          name: `Harry Potter and the Sorcerer's Stone`,
          number: 0,
          nextChapter: {
            name: 'The Boy Who Lived',
            number: 1,
            characters: [
              {
                name: 'Voldemort',
                number: 2,
              },
            ],
          },
          authorNotes: {
            value: 'this book should sell well',
          },
        });
        nestedModel = get(data, 'nextChapter');
        doubleNestedModel = get(nestedModel, 'characters');
        assert.deepEqual(
          nestedModel.changedAttributes(),
          {},
          'nestedModel has no changedAttributes'
        );
        assert.deepEqual(
          doubleNestedModel.get('firstObject').changedAttributes(),
          {},
          'doubleNestedModel has no changedAttributes'
        );
        assert.deepEqual(data.changedAttributes(), {}, 'changedAttributes is empty');
      })
    );
  });

  test('Can set a many embedded property to a semi resolved array containing a mix of pojos and megamorphic models (computeNestedModel does not handle array)', function(assert) {
    assert.expect(5);
    this.owner.register(
      'service:m3-schema',
      class TestSchema extends DefaultSchema {
        includesModel() {
          return true;
        }

        computeNestedModel(key, value) {
          if (Array.isArray(value)) {
            return null;
          }
          assert.ok(
            !(value instanceof MegamorphicModel),
            "We don't pass Megamorphic Models to computeNestedModel"
          );
          let attributesType = value && value.$type;
          if (value !== null && typeof value === 'object') {
            return { id: key, type: attributesType, attributes: value };
          }
        }
      }
    );

    this.store.push({
      data: [
        {
          id: 'urn:book:1',
          type: 'com.bookstore.Book',
          attributes: {
            locations: [
              {
                country: 'US',
                geographicArea: 'California',
                city: 'San Francisco',
                postalCode: '94110',
                description: 'Club house',
                $type: 'OrganizationAddress',
                headquarter: true,
                line1: '1234 Lucky St',
              },
            ],
          },
        },
      ],
    });

    let record = this.store.peekRecord('com.bookstore.Book', 'urn:book:1');

    const currentCollection = record.get('locations').slice();
    const aNewLocation = {
      country: 'MX',
      geographicArea: 'California',
      city: 'Ensenada',
      postalCode: '22810',
      description: 'Home',
      $type: 'OrganizationAddress',
      headquarter: true,
      line1: '555 Main St.',
    };
    record.set('locations', currentCollection.concat(aNewLocation));

    let locations = record.get('locations');
    assert.deepEqual(
      locations.map(l => l.get('country')),
      ['US', 'MX'],
      'Locations retrieved succesfully'
    );
  });

  test('Can set a many embedded property to a semi resolved array containing a mix of pojos and megamorphic models (computeNestedModel does handle array)', function(assert) {
    assert.expect(5);
    this.owner.register(
      'service:m3-schema',
      class TestSchema extends DefaultSchema {
        includesModel() {
          return true;
        }

        computeNestedModel(key, value) {
          if (Array.isArray(value)) {
            return value.map(v => {
              if (v instanceof MegamorphicModel) {
                return v;
              }
              return this.computeNestedModel(key, v);
            });
          }
          assert.ok(
            !(value instanceof MegamorphicModel),
            "We don't pass Megamorphic Models to computeNestedModel"
          );
          let attributesType = value && value.$type;
          if (value !== null && typeof value === 'object') {
            return { id: key, type: attributesType, attributes: value };
          }
        }
      }
    );

    this.store.push({
      data: [
        {
          id: 'urn:book:1',
          type: 'com.bookstore.Book',
          attributes: {
            locations: [
              {
                country: 'US',
                geographicArea: 'California',
                city: 'San Francisco',
                postalCode: '94110',
                description: 'Club house',
                $type: 'OrganizationAddress',
                headquarter: true,
                line1: '1234 Lucky St',
              },
            ],
          },
        },
      ],
    });

    let record = this.store.peekRecord('com.bookstore.Book', 'urn:book:1');

    const currentCollection = record.get('locations').slice();
    const aNewLocation = {
      country: 'MX',
      geographicArea: 'California',
      city: 'Ensenada',
      postalCode: '22810',
      description: 'Home',
      $type: 'OrganizationAddress',
      headquarter: true,
      line1: '555 Main St.',
    };
    record.set('locations', currentCollection.concat(aNewLocation));

    let locations = record.get('locations');
    assert.deepEqual(
      locations.map(l => l.get('country')),
      ['US', 'MX'],
      'Locations retrieved succesfully'
    );
  });
});
