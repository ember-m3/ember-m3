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

      isRecordInUse() {
        return false;
      },
    });

    this.mockInternalModel = (modelName, id) => ({
      id,
      modelName,
      hasRecord: true,
      _record: {
        notifyPropertyChange() {},
      },
    });

    SchemaManager.registerSchema({
      computeBaseModelName(modelName) {
        return ['com.bookstore.projected-book', 'com.bookstore.excerpt-book'].includes(modelName)
          ? 'com.bookstore.book'
          : null;
      },

      computeNestedModel(key, value) {
        if (value !== null && typeof value === 'object') {
          return {
            id: value.id,
            type: value.type,
            attributes: value,
          };
        }
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

  test('nested model data are destroyed, when associated property is set to null', function(assert) {
    let modelData = this.mockModelData();
    modelData.getOrCreateNestedModelData('preface', 'com.bookstore.chapter', '1', null);

    assert.strictEqual(
      modelData.hasNestedModelData('preface'),
      true,
      'Expected nested model data to be added'
    );

    modelData.pushData({
      attributes: {
        name: 'Harry Potter',
        preface: null,
      },
    });

    assert.strictEqual(
      modelData.hasNestedModelData('preface'),
      false,
      'Expected nested data to have been removed'
    );
  });

  test('nested model data are reused, when associated property has updates', function(assert) {
    let modelData = this.mockModelData();
    let beforeNestedModelData = modelData.getOrCreateNestedModelData(
      'preface',
      'com.bookstore.chapter',
      '1',
      this.mockInternalModel('com.bookstore.chapter', '1')
    );

    modelData.pushData({
      attributes: {
        name: 'Harry Potter',
        preface: {
          id: '1',
          type: 'com.bookstore.chapter',
          text: "Harry Potter's preface",
        },
      },
    });

    let afterNestedModelData = modelData.getOrCreateNestedModelData(
      'preface',
      'com.bookstore.chapter',
      '1',
      null
    );

    assert.strictEqual(
      afterNestedModelData,
      beforeNestedModelData,
      'Expected nested model data to have been reused'
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

  test('projection model data unregister from base model data and the store on unloadRecord', function(assert) {
    let projectionModelData = this.storeWrapper.modelDataFor('com.bookstore.projected-book', '1');
    let baseModelData = this.storeWrapper.modelDataFor('com.bookstore.book', '1');

    // unload the model data
    projectionModelData.unloadRecord();

    assert.notEqual(
      this.storeWrapper.disconnectedModelDatas[modelDataKey(projectionModelData)],
      null,
      'Expected projection model data to have been disconnected from the store'
    );
    assert.equal(
      baseModelData._projections.find(x => x === projectionModelData),
      null,
      'Expected projected model data to have been removed from the projections'
    );
  });

  test('base model data is disconnected from the store if there are no more projections', function(assert) {
    let projectionModelData = this.storeWrapper.modelDataFor('com.bookstore.projected-book', '1');
    let baseModelData = this.storeWrapper.modelDataFor('com.bookstore.book', '1');

    // unload the projection model data
    projectionModelData.unloadRecord();

    assert.notEqual(
      this.storeWrapper.disconnectedModelDatas[modelDataKey(baseModelData)],
      null,
      'Expected projection model data to have been disconnected from the store'
    );
  });

  test('base model data is not disconnected from the store if there are other projections', function(assert) {
    let projectionModelData = this.storeWrapper.modelDataFor('com.bookstore.projected-book', '1');
    this.storeWrapper.modelDataFor('com.bookstore.excerpt-book', '1');
    let baseModelData = this.storeWrapper.modelDataFor('com.bookstore.book', '1');

    // unload the projection model data
    projectionModelData.unloadRecord();

    assert.equal(
      this.storeWrapper.disconnectedModelDatas[modelDataKey(baseModelData)],
      null,
      'Expected projection model data to not have been disconnected from the store'
    );
  });

  test('base model data is not disconnected from the store if the record is in use', function(assert) {
    this.storeWrapper.isRecordInUse = () => true;

    let projectionModelData = this.storeWrapper.modelDataFor('com.bookstore.projected-book', '1');
    let baseModelData = this.storeWrapper.modelDataFor('com.bookstore.book', '1');

    // unload the projection model data
    projectionModelData.unloadRecord();

    assert.equal(
      this.storeWrapper.disconnectedModelDatas[modelDataKey(baseModelData)],
      null,
      'Expected projection model data to have been disconnected from the store'
    );
  });

  test('projection model data connects with base model data when committed with id', function(assert) {
    let projectionModelData = this.storeWrapper.modelDataFor('com.bookstore.projected-book', null);

    assert.equal(
      this.storeWrapper.modelDatas[modelDataKey({ modelName: 'com.bookstore.book', id: null })],
      null,
      'Expected base model data to not have been created'
    );

    // actually set to be saved
    projectionModelData.setAttr('name', 'Harry Potter');
    projectionModelData.setAttr('preface', {
      text: "Harry Potter's preface",
    });

    projectionModelData.didCommit({
      id: '1',
      attributes: {},
    });

    let baseModelData = this.storeWrapper.modelDatas[
      modelDataKey({ modelName: 'com.bookstore.book', id: '1' })
    ];

    assert.notEqual(baseModelData, null, 'Expected base model data to have been created');
    assert.ok(
      baseModelData._projections.find(x => x === projectionModelData),
      'Expected projection model data to have been registered'
    );
    assert.strictEqual(
      projectionModelData._data,
      baseModelData._data,
      'Expected projection _data hash to be the same as the base model data'
    );
    assert.equal(
      projectionModelData.getAttr('name'),
      'Harry Potter',
      'Expected primitive attribute to have been retained'
    );
    assert.deepEqual(
      projectionModelData.getAttr('preface'),
      {
        text: "Harry Potter's preface",
      },
      'Expected complex attribute to have been retained'
    );
  });

  test('nested projection model register in the base model nested model data', function(assert) {
    let projectionModelData = this.storeWrapper.modelDataFor('com.bookstore.projected-book', '1');
    let baseModelData = this.storeWrapper.modelDataFor('com.bookstore.book', '1');

    let nestedProjected = projectionModelData.getOrCreateNestedModelData(
      'preface',
      'com.bookstore.chapter'
    );

    assert.strictEqual(
      baseModelData.hasNestedModelData('preface'),
      true,
      'Expected base model data to have created a nested model data'
    );

    let nestedBase = baseModelData.getOrCreateNestedModelData('preface');
    assert.ok(
      nestedBase._projections.find(x => x === nestedProjected),
      'Expected the nested projection model data to be registered in the nested base model data'
    );
  });
});
