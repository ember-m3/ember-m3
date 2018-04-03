import { module, test } from 'qunit';
import { assert } from '@ember/debug';
import M3ModelData from 'ember-m3/model-data';
import SchemaManager from 'ember-m3/schema-manager';
import sinon from 'sinon';
import { zip } from 'lodash';

const modelDataKey = ({ modelName, id }) => `${modelName}:${id}`;

module('unit/model-data', function(hooks) {
  hooks.beforeEach(function() {
    this.sinon = sinon.sandbox.create();
    let storeWrapper = (this.storeWrapper = {
      modelDatas: {},
      disconnectedModelDatas: {},

      modelDataFor(modelName, id, clientId) {
        let key = modelDataKey({ modelName, id });
        return (
          this.modelDatas[key] ||
          (this.modelDatas[key] = new M3ModelData(modelName, id, clientId, storeWrapper))
        );
      },

      disconnectRecord(modelName, id) {
        let key = modelDataKey({ modelName, id });
        assert(`Disconnect record called for missing model data ${key}`, this.modelDatas[key]);
        this.disconnectedModelDatas[key] = this.modelDatas[key];
        delete this.modelDatas[key];
      },

      setRecordId() {},

      isRecordInUse() {
        return false;
      },

      notifyPropertyChange() {},
    });

    this.mockModelData = function() {
      return this.storeWrapper.modelDataFor('com.bookstore.book', '1');
    };

    SchemaManager.registerSchema({
      computeNestedModel(key, value) {
        if (value !== null && typeof value === 'object') {
          return { id: key, type: 'com.exmaple.bookstore.book', attributes: value };
        }
      },

      computeBaseModelName(modelName) {
        return ['com.bookstore.projected-book', 'com.bookstore.excerpt-book'].includes(modelName)
          ? 'com.bookstore.book'
          : null;
      },
    });
  });

  hooks.afterEach(function() {
    this.sinon.restore();
    SchemaManager.registerSchema(null);
  });

  test(`.eachAttribute iterates attributes, in-flight attrs and data`, function(assert) {
    let modelData = new M3ModelData(
      'com.exmaple.bookstore.book',
      '1',
      null,
      this.storeWrapper,
      null,
      null
    );

    modelData.pushData(
      {
        id: '1',
        attributes: {
          dataAttr: 'value',
        },
      },
      false
    );

    modelData.setAttr('inFlightAttr', 'value');
    modelData.willCommit();
    modelData.setAttr('localAttr', 'value');

    let attrsIterated = [];
    modelData.eachAttribute(attr => attrsIterated.push(attr));

    assert.deepEqual(attrsIterated, ['localAttr', 'inFlightAttr', 'dataAttr']);
  });

  test(`._getChildModelData returns new model data`, function(assert) {
    let topModelData = new M3ModelData(
      'com.exmaple.bookstore.book',
      '1',
      null,
      this.storeWrapper,
      null,
      null
    );

    assert.strictEqual(topModelData._parentModelData, null, 'top modelData has no parent');
    assert.deepEqual(
      topModelData._childModelDatas,
      {},
      `initially child modelDatas aren't populated`
    );

    let child1ModelData = topModelData._getChildModelData(
      'child1',
      null,
      'com.example.bookstore.book',
      '1'
    );
    let child2ModelData = topModelData._getChildModelData(
      'child2',
      null,
      'com.example.bookstore.book',
      '1'
    );

    assert.equal(child1ModelData._parentModelData, topModelData, 'child1 -> parent');
    assert.equal(child2ModelData._parentModelData, topModelData, 'child2 -> parent');
    assert.deepEqual(
      topModelData._childModelDatas,
      {
        child1: child1ModelData,
        child2: child2ModelData,
      },
      'parent -> children'
    );
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
    schemaInterface._keyBeingResolved = 'testKey';
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

  test('.rollbackAttributes does not call notifyPropertyChange with undefined without hasChangedAttributes', function(assert) {
    assert.expect(1);
    const rollbackAttributesSpy = this.sinon.spy();
    this.storeWrapper.notifyPropertyChange = rollbackAttributesSpy;

    let modelData = new M3ModelData(
      'com.exmaple.bookstore.book',
      '1',
      null,
      this.storeWrapper,
      null,
      null
    );
    modelData.rollbackAttributes(true);
    assert.equal(rollbackAttributesSpy.getCalls().length, 0, 'rollbackAttributes was not called');
  });

  test('.schemaInterface track dependent keys resolved by ref key', function(assert) {
    let modelData = this.mockModelData();
    let schemaInterface = modelData.schemaInterface;
    modelData.pushData({
      attributes: {
        '*foo': 'fooVal',
        bar: 'barVal',
      },
    });

    schemaInterface._beginDependentKeyResolution('foo');
    assert.equal(schemaInterface.getAttr('*foo'), 'fooVal', 'schemaInterface can read attr');
    schemaInterface._endDependentKeyResolution('foo');

    assert.equal(
      schemaInterface._getDependentResolvedKeys('*foo')[0],
      'foo',
      'schemaInterface tracks dependent property computed using ref key'
    );
  });

  test('`.didCommit` sets the ID of the record in the store', function(assert) {
    let setRecordId = this.sinon.spy(this.storeWrapper, 'setRecordId');

    let modelData = this.mockModelData();

    modelData.didCommit({
      id: 'newId',
      attributes: {},
    });

    assert.deepEqual(
      setRecordId.args,
      [['com.bookstore.book', 'newId', modelData.clientId]],
      'Expected setRecodId to have been called'
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

  test('nested projection model register in the base model nested model data', function(assert) {
    let projectionModelData = this.storeWrapper.modelDataFor('com.bookstore.projected-book', '1');
    let baseModelData = this.storeWrapper.modelDataFor('com.bookstore.book', '1');

    let nestedProjected = projectionModelData._getChildModelData(
      'preface',
      undefined,
      'com.bookstore.chapter'
    );

    assert.ok(
      baseModelData._childModelDatas['preface'],
      'Expected base model data to have created a nested model data'
    );

    let nestedBase = baseModelData._getChildModelData('preface', undefined);
    assert.ok(
      nestedBase._projections.find(x => x === nestedProjected),
      'Expected the nested projection model data to be registered in the nested base model data'
    );
  });

  test('setting a nested model to null destroys child model datas in all projections', function(assert) {
    let projectionModelData = this.storeWrapper.modelDataFor('com.bookstore.projected-book', '1');
    let baseModelData = this.storeWrapper.modelDataFor('com.bookstore.book', '1');

    projectionModelData.pushData({
      id: '1',
      attributes: {
        name: 'Harry Potter and the Chamber of Secrets',
        prequelBook: {
          name: `Harry Potter and the Sorcerer's Stone`,
        },
      },
    });

    // initialize the child model data
    projectionModelData._getChildModelData('prequelBook', null, 'com.bookstore.book', '1', null);

    assert.ok(
      baseModelData._childModelDatas['prequelBook'],
      'Expected base child model data to have been created as well'
    );

    // reset to null
    baseModelData.pushData({
      id: '1',
      attributes: {
        prequelBook: null,
      },
    });

    assert.notOk(
      baseModelData._childModelDatas['prequelBook'],
      'Expected base child model data to have been destroyed'
    );
    assert.notOk(
      projectionModelData._childModelDatas['prequelBook'],
      'Expected projected child model data to have been destroyed'
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
    let projectionModelData = this.storeWrapper.modelDataFor(
      'com.bookstore.projected-book',
      null,
      1
    );
    let baseModelData = this.storeWrapper.modelDatas[
      modelDataKey({ modelName: 'com.bookstore.book', id: null })
    ];
    assert.notEqual(baseModelData, null, 'Expected base model data to have been created as well');
    assert.ok(
      baseModelData._projections.find(x => x === projectionModelData),
      'Expected projection model data to have been registered'
    );
    assert.equal(
      baseModelData.clientId,
      projectionModelData.clientId,
      'Expected the base model data to have the same clientId as the projection'
    );

    // actually set to be saved
    projectionModelData.setAttr('name', 'Harry Potter');
    projectionModelData.setAttr('preface', {
      text: "Harry Potter's preface",
    });

    let setRecordIdSpy = this.sinon.spy(this.storeWrapper, 'setRecordId');

    projectionModelData.willCommit();

    projectionModelData.didCommit({
      id: '1',
      attributes: {},
    });

    assert.deepEqual(
      setRecordIdSpy.args,
      [
        ['com.bookstore.projected-book', '1', projectionModelData.clientId],
        ['com.bookstore.book', '1', baseModelData.clientId],
      ],
      'Expected server-side ID to be set for the committed records'
    );
    assert.equal(
      projectionModelData.id,
      '1',
      'Expected projection model data to have picked up the new ID'
    );
    assert.equal(baseModelData.id, '1', 'Expected base model data to have picked up the new ID');

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

  module('with nested models', function(hooks) {
    hooks.beforeEach(function() {
      this.topModelData = new M3ModelData(
        'com.exmaple.bookstore.book',
        'top',
        null,
        this.storeWrapper,
        null,
        null
      );

      this.topModelData.pushData({
        attributes: {
          name: 'name',
          child1: {
            name: 'c1',
            child1_1: {
              name: 'c1.1',
            },
          },
          child2: {
            name: 'c2',
          },
          child3: {
            name: 'c3',
          },
        },
      });

      this.child1Model = {
        _notifyProperties: this.sinon.spy(),
      };
      this.child1ModelData = this.topModelData._getChildModelData(
        'child1',
        null,
        'com.exmaple.bookstore.book',
        'child1',
        {
          record: this.child1Model,
        }
      );

      this.child2Model = {
        _notifyProperties: this.sinon.spy(),
      };
      this.child2ModelData = this.topModelData._getChildModelData(
        'child2',
        null,
        'com.exmaple.bookstore.book',
        'child2',
        {
          record: this.child2Model,
        }
      );

      this.child11Model = {
        _notifyProperties: this.sinon.spy(),
      };
      this.child11ModelData = this.child1ModelData._getChildModelData(
        'child1_1',
        null,
        'com.exmaple.bookstore.book',
        'child1_1',
        { record: this.child11Model }
      );
    });

    test('.pushData calls reified child model datas recursively', function(assert) {
      let pushDataSpy = this.sinon.spy(M3ModelData.prototype, 'pushData');
      let changedKeys = this.topModelData.pushData(
        {
          attributes: {
            name: 'new name',
            child1: {
              name: 'c1_new',
              child1_1: {
                name: 'c1.1_new',
              },
            },
            child3: 3,
          },
        },
        true
      );

      assert.deepEqual(
        changedKeys.sort(),
        ['name', 'child3'].sort(),
        'changed attributes are returned'
      );
      assert.deepEqual(
        zip(pushDataSpy.thisValues.slice(1).map(x => x + ''), pushDataSpy.args.slice(1)),
        [
          [
            this.child1ModelData + '',
            [
              {
                attributes: {
                  name: 'c1_new',
                  child1_1: {
                    name: 'c1.1_new',
                  },
                },
              },
              true,
              true,
            ],
          ],
          [
            this.child11ModelData + '',
            [
              {
                attributes: {
                  name: 'c1.1_new',
                },
              },
              true,
              true,
            ],
          ],
        ],
        'pushData called recursively on children'
      );
    });

    test('.pushData on a child modelData manually notifies changes', function(assert) {
      this.topModelData.pushData(
        {
          attributes: {
            name: 'new name',
            child1: {
              name: 'c1_new',
              child1_1: {
                name: 'c1.1_new',
              },
            },
            child3: 3,
          },
        },
        true
      );

      assert.deepEqual(
        zip(
          this.child1Model._notifyProperties.thisValues.map(x => x + ''),
          this.child1Model._notifyProperties.args
        ),
        [[this.child1Model + '', [['name']]]],
        'child1._notifyProperties called'
      );

      assert.deepEqual(
        zip(
          this.child11Model._notifyProperties.thisValues.map(x => x + ''),
          this.child11Model._notifyProperties.args
        ),
        [[this.child11Model + '', [['name']]]],
        'grandchild1_1._notifyProperties called'
      );

      assert.equal(
        this.child2Model._notifyProperties.callCount,
        0,
        'child2._notifyProperties not called'
      );
    });

    test('.didCommit calls reified child model datas recursively', function(assert) {
      let didCommitSpy = this.sinon.spy(M3ModelData.prototype, 'didCommit');
      let changedKeys = this.topModelData.didCommit({
        attributes: {
          name: 'new name',
          child1: {
            name: 'c1_new',
            child1_1: {
              name: 'c1.1_new',
            },
          },
          child3: 3,
        },
      });

      assert.deepEqual(
        changedKeys.sort(),
        ['name', 'child3'].sort(),
        'changed attributes are returned'
      );
      assert.deepEqual(
        zip(didCommitSpy.thisValues.slice(1).map(x => x + ''), didCommitSpy.args.slice(1)),
        [
          [
            this.child1ModelData + '',
            [
              {
                attributes: {
                  name: 'c1_new',
                  child1_1: {
                    name: 'c1.1_new',
                  },
                },
              },
              true,
            ],
          ],
          [
            this.child11ModelData + '',
            [
              {
                attributes: {
                  name: 'c1.1_new',
                },
              },
              true,
            ],
          ],
        ],
        'didCommit called recursively on children'
      );
    });

    test('.didCommit on a child modelData manually notifies changes', function(assert) {
      this.topModelData.didCommit({
        attributes: {
          name: 'new name',
          child1: {
            name: 'c1_new',
            child1_1: {
              name: 'c1.1_new',
            },
          },
          child3: 3,
        },
      });

      assert.deepEqual(
        zip(
          this.child1Model._notifyProperties.thisValues.map(x => x + ''),
          this.child1Model._notifyProperties.args
        ),
        [[this.child1Model + '', [['name']]]],
        'child1._notifyProperties called'
      );

      assert.deepEqual(
        zip(
          this.child11Model._notifyProperties.thisValues.map(x => x + ''),
          this.child11Model._notifyProperties.args
        ),
        [[this.child11Model + '', [['name']]]],
        'grandchild1_1._notifyProperties called'
      );

      assert.equal(
        this.child2Model._notifyProperties.callCount,
        0,
        'child2._notifyProperties not called'
      );
    });

    test('.commitWasRejected calls reified child model datas recursively', function(assert) {
      let commitWasRejectedSpy = this.sinon.spy(M3ModelData.prototype, 'commitWasRejected');
      this.topModelData.willCommit();
      this.topModelData.commitWasRejected();

      assert.deepEqual(
        zip(
          commitWasRejectedSpy.thisValues.slice(1).map(x => x + ''),
          commitWasRejectedSpy.args.slice(1)
        ),
        [
          [this.child1ModelData + '', []],
          [this.child11ModelData + '', []],
          [this.child2ModelData + '', []],
        ],
        'commitWasRejected called recursively on children'
      );
    });

    test('.rollbackAttributes calls reified child model datas recursively', function(assert) {
      let rollbackAttributesSpy = this.sinon.spy(M3ModelData.prototype, 'rollbackAttributes');
      this.topModelData.rollbackAttributes();

      assert.deepEqual(
        zip(
          rollbackAttributesSpy.thisValues.slice(1).map(x => x + ''),
          rollbackAttributesSpy.args.slice(1)
        ),
        [
          [this.child1ModelData + '', [true]],
          [this.child11ModelData + '', [true]],
          [this.child2ModelData + '', [true]],
        ],
        'rollbackAttributes called recursively on children'
      );
    });
  });
});
