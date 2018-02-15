import { module, test } from 'qunit';
import { assert } from '@ember/debug';
import M3ModelData from 'ember-m3/model-data';
import SchemaManager from 'ember-m3/schema-manager';

const modelDataKey = ({ modelName, id }) => `${modelName}:${id}`;

module('unit/model-data', function(hooks) {
  hooks.beforeEach(function() {
    let storeWrapper = (this.storeWrapper = {
      modelDatas: {},
      disconnectedModelDatas: {},

      modelDataFor(modelName, id) {
        let key = modelDataKey({ modelName, id });
        return (
          this.modelDatas[key] ||
          (this.modelDatas[key] = new M3ModelData(modelName, id, null, storeWrapper))
        );
      },

      disconnectRecord(modelName, id) {
        let key = modelDataKey({ modelName, id });
        assert(`Disconnect record called for missing model data ${key}`, this.modelDatas[key]);
        this.disconnectedModelDatas[key] = this.modelDatas[key];
        delete this.modelDatas[key];
      },
    });

    SchemaManager.registerSchema({
      computeBaseModelName(modelName) {
        return modelName === 'com.bookstore.projected-book' ? 'com.bookstore.book' : null;
      },
    });

    this.mockModelData = function() {
      return this.storeWrapper.modelDataFor('com.bookstore.book', '1');
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

  test('`.getOrCreateNestedModelData` reuses model datas', function(assert) {
    let modelData = this.mockModelData();
    let nestedModelData = modelData.getOrCreateNestedModelData(
      'preface',
      'com.bookstore.chapter',
      '1',
      null
    );

    assert.notEqual(nestedModelData, null, 'Expected nested model data to be returned');

    let anotherNestedModelData = modelData.getOrCreateNestedModelData(
      'preface',
      'com.bookstore.chapter',
      '1',
      null
    );

    assert.strictEqual(
      nestedModelData,
      anotherNestedModelData,
      'The nested model data must be the same'
    );
  });

  test('`.unloadRecord` disconnects the model data from the store', function(assert) {
    let modelData = this.mockModelData();

    // unload
    modelData.unloadRecord();

    assert.strictEqual(
      this.storeWrapper.disconnectedModelDatas[modelDataKey(modelData)],
      modelData,
      'Expected the model data to have been disconnected'
    );
  });

  test('projection model data initializes and register in base model data', function(assert) {
    let projectedModelData = this.storeWrapper.modelDataFor('com.bookstore.projected-book', '1');

    let baseModelData = this.storeWrapper.modelDatas[
      modelDataKey({
        modelName: 'com.bookstore.book',
        id: '1',
      })
    ];

    assert.notEqual(baseModelData, null, 'Expected base model data to be initialized');
    assert.deepEqual(
      baseModelData._projections,
      [baseModelData, projectedModelData],
      'Expected projected model data to be in the projections list'
    );
  });
});
