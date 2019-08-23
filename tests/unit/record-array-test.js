import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';
import { run } from '@ember/runloop';
import M3RecordArray from 'ember-m3/record-array';
import { flushChanges } from 'ember-m3/utils/notify-changes';
import { isArray } from '@ember/array';
import MutableArray from '@ember/array/mutable';

module('unit/record-array', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register(
      'services:m3-schema',
      class TestSchema extends DefaultSchema {
        includesModel() {
          return true;
        }
      }
    );
    this.store = this.owner.lookup('service:store');

    run(() => {
      this.store.pushPayload('com.example.bookstore.Book', {
        data: [
          {
            id: 'isbn:1',
            type: 'com.example.bookstore.Book',
            attributes: {
              title: 'pretty good book',
            },
          },
          {
            id: 'isbn:2',
            type: 'com.example.bookstore.Book',
            attributes: {
              title: 'pretty okay book',
            },
          },
        ],
      });
    });

    this.createRecordArray = function() {
      let recordArray = M3RecordArray.create();
      recordArray.store = this.store;
      return recordArray;
    };
  });

  test('initially record arrays are unresolved', function(assert) {
    let recordArray = this.createRecordArray();
    assert.equal(recordArray._resolved, false);
  });

  test('RecordArray is a mutable Ember Array', function(assert) {
    assert.ok(isArray(this.createRecordArray()));
    assert.ok(MutableArray.detect(this.createRecordArray()));
  });

  test('requesting an object resolves the record array', function(assert) {
    let recordArray = this.createRecordArray();
    assert.equal(recordArray._resolved, false, 'initialy unresolved');
    assert.strictEqual(recordArray.objectAt(0), undefined, 'array is empty');
    assert.equal(recordArray._resolved, true, 'requesting object resolved array');

    recordArray = this.createRecordArray();
    assert.equal(recordArray._resolved, false, 'initialy unresolved');
    assert.strictEqual(recordArray.get('firstObject'), undefined, 'array is empty');
    assert.equal(recordArray._resolved, true, 'requesting object resolved array');
  });

  test('references can be resolved to records lazily', function(assert) {
    let recordArray = this.createRecordArray();
    recordArray._setReferences([
      { id: 'isbn:1', type: null },
      { id: 'isbn:2', type: 'com.example.bookstore.Book' },
    ]);

    let willChangeCount = 0;
    let didChangeCount = 0;
    recordArray.addArrayObserver({
      arrayWillChange() {
        ++willChangeCount;
      },
      arrayDidChange() {
        ++didChangeCount;
      },
    });

    assert.deepEqual(recordArray.mapBy('title'), ['pretty good book', 'pretty okay book']);
    assert.equal(willChangeCount, 0, 'resolving references does not trigger change events');
    assert.equal(didChangeCount, 0, 'resolving references does not trigger change events');
  });

  test('updating a record array invalidates content and makes it unresolved', function(assert) {
    let recordArray = this.createRecordArray();

    assert.equal(recordArray._resolved, false, 'initialy unresolved');
    recordArray._setReferences([
      { id: 'isbn:1', type: null },
      { id: 'isbn:2', type: 'com.example.bookstore.Book' },
    ]);
    assert.equal(recordArray._resolved, false, 'unresolved after setting references');
    assert.equal(recordArray.get('firstObject.title'), 'pretty good book', 'reference resolved');
    assert.equal(recordArray._resolved, true, 'lazily resolved');

    recordArray._setReferences([{ id: 'isbn:2', type: 'com.example.bookstore.Book' }]);
    assert.equal(recordArray._resolved, false, 'unresolved when references change');
  });

  test('a record array can resolve new values', function(assert) {
    let recordArray = this.createRecordArray();

    recordArray._setReferences([{ id: 'isbn:1', type: null }]);
    assert.deepEqual(recordArray.mapBy('title'), ['pretty good book']);

    let book2 = this.store.peekRecord('com.example.bookstore.Book', 'isbn:2');
    recordArray.pushObject(book2);

    assert.deepEqual(recordArray.mapBy('title'), ['pretty good book', 'pretty okay book']);
  });

  test('setting internal models resolves the record array', function(assert) {
    let recordArray = this.createRecordArray();

    recordArray._setReferences([{ id: 'isbn:1', type: null }]);
    assert.equal(recordArray._resolved, false, 'initially unresolved');

    let book2 = this.store.peekRecord('com.example.bookstore.Book', 'isbn:2');

    let internalModels = [book2._internalModel];
    recordArray._setInternalModels(internalModels);

    assert.equal(recordArray._resolved, true, 'setting internal models resolves the record array');
    assert.deepEqual(
      recordArray.mapBy('title'),
      ['pretty okay book'],
      'setting internal models clears prior content'
    );
  });

  test('setting references triggers a deferred didChange event', function(assert) {
    let recordArray = this.createRecordArray();
    let willChangeCount = 0;
    let didChangeArray = null;
    let didChangeCount = 0;
    let didChangeArgs = [];
    recordArray.addArrayObserver({
      arrayWillChange() {
        ++willChangeCount;
      },
      arrayDidChange(array, ...args) {
        ++didChangeCount;
        didChangeArray = array;
        didChangeArgs.push(args);
      },
    });
    recordArray._setReferences([{ id: 'isbn:1', type: null }]);

    assert.equal(willChangeCount, 0, 'no eager willChange');
    assert.equal(didChangeCount, 0, 'no eager didChange');

    flushChanges(this.store);

    // don't store enough info for willChange
    assert.equal(willChangeCount, 0, 'deferred willChange');
    assert.equal(didChangeCount, 1, 'deferred didChange');
    assert.strictEqual(didChangeArray, recordArray, 'didChange array is correct');
    assert.deepEqual(didChangeArgs, [[0, 0, 0]], 'didChange args are correct');
  });

  test('replacing records triggers an eager didChange event', function(assert) {
    let recordArray = this.createRecordArray();
    let willChangeCount = 0;
    let didChangeCount = 0;
    let didChangeArray = null;
    let didChangeArgs = [];
    recordArray.addArrayObserver({
      arrayWillChange() {
        ++willChangeCount;
      },
      arrayDidChange(array, ...args) {
        ++didChangeCount;
        didChangeArray = array;
        didChangeArgs.push(args);
      },
    });
    let book1 = this.store.peekRecord('com.example.bookstore.Book', 'isbn:1');
    recordArray.pushObject(book1);

    assert.equal(willChangeCount, 0, 'eager willChange not fired');
    assert.equal(didChangeCount, 1, 'eager didChange fired');
    assert.strictEqual(didChangeArray, recordArray, 'eager didChange fired - array');
    assert.deepEqual(didChangeArgs, [[0, 0, 1]], 'eager didChange fired - args');

    didChangeArray = null;
    didChangeArgs = [];

    recordArray.popObject();

    assert.equal(willChangeCount, 0, 'eager willChange not fired');
    assert.equal(didChangeCount, 2, 'eager didChange fired');
    assert.strictEqual(didChangeArray, recordArray, 'eager didChange fired - second call - array');
    assert.deepEqual(didChangeArgs, [[0, 1, 0]], 'eager didChange fired - second call - args');

    recordArray.pushObject(book1);
    recordArray.pushObject(book1);

    didChangeArray = null;
    didChangeArgs = [];

    recordArray.popObject(book1);

    assert.equal(willChangeCount, 0, 'eager willChange not fired');
    assert.equal(didChangeCount, 5, 'eager didChange fired');
    assert.strictEqual(didChangeArray, recordArray, 'eager didChange fired - third call - array');
    assert.deepEqual(didChangeArgs, [[1, 1, 0]], 'eager didChange fired - third call - args');
  });

  module('RecordArrayManager api', function() {
    test('internal moodels can be added and removed from the RecordArrayManager api', function(assert) {
      let recordArray = this.createRecordArray();
      let book1 = this.store.peekRecord('com.example.bookstore.Book', 'isbn:1');
      let book2 = this.store.peekRecord('com.example.bookstore.Book', 'isbn:2');

      assert.deepEqual(recordArray.toArray().mapBy('id'), [], 'record array empty');

      recordArray._pushInternalModels([book1._internalModel, book2._internalModel]);

      assert.deepEqual(
        recordArray.toArray().mapBy('id'),
        ['isbn:1', 'isbn:2'],
        '_pushInternalModels'
      );

      recordArray._removeInternalModels([book1._internalModel]);

      assert.deepEqual(recordArray.toArray().mapBy('id'), ['isbn:2'], '_removeInternalModels');
    });

    test('adding internal models forces resolution', function(assert) {
      let recordArray = this.createRecordArray();
      recordArray._setReferences([
        {
          id: 'isbn:1',
          type: 'com.example.bookstore.Book',
        },
      ]);

      assert.equal(recordArray.length, 1, 'length is 1');
      assert.equal(recordArray._resolved, false, 'length does not resolve');

      let book2 = this.store.peekRecord('com.example.bookstore.Book', 'isbn:2');
      recordArray._pushInternalModels([book2._internalModel]);

      assert.equal(recordArray._resolved, true, '_pushInternalModels resolves');
      assert.deepEqual(recordArray.toArray().mapBy('id'), ['isbn:1', 'isbn:2'], 'records added');
    });

    test('unresolved references can be removed', function(assert) {
      let recordArray = this.createRecordArray();
      recordArray._setReferences([
        {
          id: 'isbn:1',
          type: 'com.example.bookstore.Book',
        },
        {
          id: 'isbn:2',
          type: 'com.example.bookstore.Book',
        },
      ]);

      assert.equal(recordArray.length, 2, 'length is 2');

      let book2 = this.store.peekRecord('com.example.bookstore.Book', 'isbn:2');
      recordArray._removeInternalModels([book2._internalModel]);

      assert.equal(recordArray._resolved, false, '_removeInternalModels does not resolve');
      assert.deepEqual(recordArray.toArray().mapBy('id'), ['isbn:1'], 'records removed');
    });
  });
});
