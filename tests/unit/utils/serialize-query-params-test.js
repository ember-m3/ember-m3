import { module, test } from 'qunit';
import serializeQueryParams from 'ember-m3/utils/serialize-query-params';

module('unit/utils/serialize-query-params', function () {
  test('simple object with only one property serialization', function (assert) {
    let queryParms = {
      a: 'b',
    };
    let serializedQueryParams = serializeQueryParams(queryParms);

    assert.equal(serializedQueryParams, 'a=b', 'one property serialization');
  });

  test('simple object with multiple properties serialization', function (assert) {
    let queryParms = {
      a: 'b',
      c: 123,
    };
    let serializedQueryParams = serializeQueryParams(queryParms);

    assert.equal(serializedQueryParams, 'a=b&c=123', 'multiple properties serialization');
  });
});
