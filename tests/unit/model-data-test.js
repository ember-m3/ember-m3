import { module, test } from 'qunit';
import M3ModelData from 'ember-m3/model-data';

module('unit/model-data', function(hooks) {
  hooks.beforeEach(function() {
    this.store = null;
    this.storeWrapper = null;

    this.mockModelData = function() {
      return new M3ModelData({
        store: this.store,
        modelName: 'com.bookstore.book',
        clientId: null,
        id: '1',
        storeWrapper: this.storeWrapper,
      });
    };
  });

  test('.schemaInterface can read attributes', function(assert) {
    let modelData = this.mockModelData();
    let schemaInterface = modelData.schemaInterface;
    modelData.pushData({
      attributes: {
        foo: 'fooVal',
        bar: 'barVal',
      },
    });

    assert.equal(modelData.getAttr('foo'), 'fooVal', 'modeldata has foo=fooVal');
    assert.equal(schemaInterface.getAttr('foo'), 'fooVal', 'schemaInterface can read attr');
  });

  test('.schemaInterface cannot write attributes', function(assert) {
    let modelData = this.mockModelData();
    let schemaInterface = modelData.schemaInterface;

    assert.ok(typeof modelData.setAttr === 'function', 'modeldata api is as expected');
    modelData.setAttr('bar', 'barVal');
    assert.equal(modelData.getAttr('bar'), 'barVal', 'modeldata can write attr');

    assert.notOk(
      typeof schemaInterface.setAttr === 'function',
      'schemaInterface cannot write attr'
    );
  });
});
