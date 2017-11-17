import Ember from 'ember';
import { module, test } from 'qunit';
import { merge } from 'ember-m3/util';

const { assign } = Ember;

module('unit/util', function() {
  test('merge should handle flat objects', function(assert) {
    let now = new Date();
    let data = {
      sameProp: 'sameValue',
      stringProp: 'stringValue',
      numberProp: 1,
      dateProp: now,
      arrayProp: [1, 2, 3],
      nullProp: null,
      nonNullProp: 'stringValue',
      untouchedProp: 'unchangedValue'
    };

    let updates = {
      sameProp: 'sameValue',
      stringProp: 'newStringValue',
      numberProp: 2,
      dateProp: new Date(now + 1000),
      arrayProp: [4, 5, 6],
      nullProp: 'nonNullValue',
      nonNullProp: null
    };

    let expectedChangedKeys = [
      'stringProp',
      'numberProp',
      'dateProp',
      'arrayProp',
      'nullProp',
      'nonNullProp'
    ];

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

    let expectedChangedKeys = [
      ['objectProp', 'stringProp',
        ['nestedObjectProp', 'stringProp']
      ],
      'nullObject',
      'nonNullObject'
    ];

    let changedKeys = merge(data, updates);

    assert.deepEqual(data, assign({
      untouchedObject: data.untouchedObject,
    }, updates));
    assert.deepEqual(changedKeys, expectedChangedKeys);
  });

  test('returns no changes for undefined updates', function(assert) {
    let changedKeys = merge({}, undefined);

    assert.deepEqual(changedKeys, []);
  });
});
