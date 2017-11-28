import Ember from 'ember';
import { module, test } from 'qunit';
import { merge, isObject } from 'ember-m3/util';

const { assign } = Ember;

module('unit/util', function() {
  test('merge should handle flat objects', function(assert) {
    let data = {
      sameProp: 'sameValue',
      stringProp: 'stringValue',
      numberProp: 1,
      arrayProp: [1, 2, 3],
      nullProp: null,
      nonNullProp: 'stringValue',
      untouchedProp: 'unchangedValue'
    };

    let updates = {
      sameProp: 'sameValue',
      stringProp: 'newStringValue',
      numberProp: 2,
      arrayProp: [4, 5, 6],
      nullProp: 'nonNullValue',
      nonNullProp: null
    };

    let expectedChangedKeys = {
      stringProp: true,
      numberProp: true,
      arrayProp: true,
      nullProp: true,
      nonNullProp: true,
    };

    let changedKeys = merge(data, updates);

    assert.deepEqual(data, assign({}, data, updates));
    assert.deepEqual(changedKeys, expectedChangedKeys);
  });

  test('merge should handle objects', function(assert) {
    let data = {
      objectProp: {
        stringProp: 'stringValue',
        nestedObjectProp: {
          stringProp: 'stringValue'
        },
      },
      sameObject: {
        sameProp: 'stringValue',
      },
      nullObject: null,
      nonNullObject: {
        stringProp: 'stringProp',
      },
      untouchedObject: {
        stringProp: 'stringProp'
      }
    };

    let updates = {
      objectProp: {
        stringProp: 'newStringValue',
        nestedObjectProp: {
          stringProp: 'newStringValue'
        },
      },
      sameObject: {
        sameProp: 'stringValue',
      },
      nullObject: {
        stringProp: 'newStringValue'
      },
      nonNullObject: null
    };

    let expectedChangedKeys = {
      objectProp: {
        stringProp: true,
        nestedObjectProp: {
          stringProp: true,
        },
      },
      nullObject: true,
      nonNullObject: true,
    };

    let changedKeys = merge(data, updates);

    assert.deepEqual(data, assign({
      untouchedObject: data.untouchedObject,
    }, updates));
    assert.deepEqual(changedKeys, expectedChangedKeys);
  });

  test('returns no changes for undefined updates', function(assert) {
    let changedKeys = merge({}, undefined);

    assert.deepEqual(changedKeys, {});
  });

  test('handles type changes in the properties', function(assert) {
    let data = {
      objectProp: {
        stringProp: 'stringValue'
      },
      stringProp: 'stringValue',
      numberProp: 1,
    };

    let updates = {
      objectProp: 'stringValue',
      stringProp: {
        stringProp: 'stringValue'
      },
      // checks whether Date is treated as object
      numberProp: new Date()
    };

    let expectedChangedKeys = {
      objectProp: true,
      stringProp: true,
      numberProp: true,
    };

    let changedKeys = merge(data, updates);

    // we don't have omitted keys, so data must look like updates
    assert.deepEqual(data, updates);
    assert.deepEqual(changedKeys, expectedChangedKeys);
  });

  test('isObject should correctly return true/false', function(assert) {
    assert.equal(isObject(undefined), false);
    assert.equal(isObject(null), false);
    assert.equal(isObject([]), false);
    assert.equal(isObject(1), false);
    assert.equal(isObject(''), false);
    assert.equal(isObject({}), true);
    assert.equal(isObject(new Date()), true);
  });
});
