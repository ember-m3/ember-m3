import { module, test } from 'qunit';
import { isEmbeddedObject } from 'ember-m3/util';

module('unit/util', function() {
  test('isEmbeddedObject should correctly return true/false', function(assert) {
    assert.equal(isEmbeddedObject(undefined), false);
    assert.equal(isEmbeddedObject(null), false);
    assert.equal(isEmbeddedObject([]), false);
    assert.equal(isEmbeddedObject(1), false);
    assert.equal(isEmbeddedObject(''), false);
    assert.equal(isEmbeddedObject({}), true);
    assert.equal(isEmbeddedObject(new Date()), true);
  });
});
