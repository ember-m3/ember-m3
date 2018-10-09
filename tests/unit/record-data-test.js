import { module, test } from 'qunit';
import { assert } from '@ember/debug';
import sinon from 'sinon';
import { zip } from 'lodash';
import { setupTest } from 'ember-qunit';

import M3RecordData from 'ember-m3/record-data';
import DefaultSchema from 'ember-m3/services/m3-schema';

const recordDataKey = ({ modelName, id }) => `${modelName}:${id}`;

module('unit/record-data', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.sinon = sinon.createSandbox();

    this.owner.register(
      'service:m3-schema',
      class TestSchema extends DefaultSchema {
        computeNestedModel(key, value) {
          if (value !== null && typeof value === 'object') {
            return { id: key, type: 'com.exmaple.bookstore.book', attributes: value };
          }
        }

        computeBaseModelName(modelName) {
          return ['com.bookstore.projected-book', 'com.bookstore.excerpt-book'].includes(modelName)
            ? 'com.bookstore.book'
            : null;
        }
      }
    );

    let schemaManager = (this.schemaManager = this.owner.lookup('service:m3-schema-manager'));

    let storeWrapper = (this.storeWrapper = {
      recordDatas: {},
      disconnectedRecordDatas: {},

      recordDataFor(modelName, id, clientId) {
        let key = recordDataKey({ modelName, id });
        return (
          this.recordDatas[key] ||
          (this.recordDatas[key] = new M3RecordData(
            modelName,
            id,
            clientId,
            storeWrapper,
            schemaManager
          ))
        );
      },

      disconnectRecord(modelName, id) {
        let key = recordDataKey({ modelName, id });
        assert(`Disconnect record called for missing recordData ${key}`, this.recordDatas[key]);
        this.disconnectedRecordDatas[key] = this.recordDatas[key];
        delete this.recordDatas[key];
      },

      setRecordId() {},

      isRecordInUse() {
        return false;
      },

      notifyPropertyChange() {},
    });

    this.mockRecordData = function() {
      return this.storeWrapper.recordDataFor('com.bookstore.book', '1');
    };
  });

  hooks.afterEach(function() {
    this.sinon.restore();
  });

  test(`.eachAttribute iterates attributes, in-flight attrs and data`, function(assert) {
    let recordData = new M3RecordData(
      'com.exmaple.bookstore.book',
      '1',
      null,
      this.storeWrapper,
      this.schemaManager,
      null,
      null
    );

    recordData.pushData(
      {
        id: '1',
        attributes: {
          dataAttr: 'value',
        },
      },
      false
    );

    recordData.setAttr('inFlightAttr', 'value');
    recordData.willCommit();
    recordData.setAttr('localAttr', 'value');

    let attrsIterated = [];
    recordData.eachAttribute(attr => attrsIterated.push(attr));

    assert.deepEqual(attrsIterated, ['localAttr', 'inFlightAttr', 'dataAttr']);
  });

  test(`._getChildRecordData returns new recordData`, function(assert) {
    let topRecordData = new M3RecordData(
      'com.exmaple.bookstore.book',
      '1',
      null,
      this.storeWrapper,
      this.schemaManager,
      null,
      null
    );

    assert.strictEqual(topRecordData._parentRecordData, null, 'top recordData has no parent');
    assert.deepEqual(
      topRecordData._childRecordDatas,
      {},
      `initially child recordDatas aren't populated`
    );

    let child1RecordData = topRecordData._getChildRecordData(
      'child1',
      null,
      'com.example.bookstore.book',
      '1'
    );
    let child2RecordData = topRecordData._getChildRecordData(
      'child2',
      null,
      'com.example.bookstore.book',
      '1'
    );

    assert.equal(child1RecordData._parentRecordData, topRecordData, 'child1 -> parent');
    assert.equal(child2RecordData._parentRecordData, topRecordData, 'child2 -> parent');
    assert.deepEqual(
      topRecordData._childRecordDatas,
      {
        child1: child1RecordData,
        child2: child2RecordData,
      },
      'parent -> children'
    );
  });

  test('.schemaInterface can read attributes', function(assert) {
    let recordData = this.mockRecordData();
    let schemaInterface = recordData.schemaInterface;
    recordData.pushData({
      attributes: {
        foo: 'fooVal',
        bar: 'barVal',
      },
    });
    schemaInterface._keyBeingResolved = 'testKey';
    assert.equal(recordData.getAttr('foo'), 'fooVal', 'recordData has foo=fooVal');
    assert.equal(schemaInterface.getAttr('foo'), 'fooVal', 'schemaInterface can read attr');
  });

  test('.schemaInterface cannot write attributes', function(assert) {
    let recordData = this.mockRecordData();
    let schemaInterface = recordData.schemaInterface;

    assert.ok(typeof recordData.setAttr === 'function', 'recordData api is as expected');
    recordData.setAttr('bar', 'barVal');
    assert.equal(recordData.getAttr('bar'), 'barVal', 'recordData can write attr');

    assert.ok(typeof schemaInterface.setAttr === 'function', 'schemaInterface can write attr');
  });

  test('.rollbackAttributes does not call notifyPropertyChange with undefined without hasChangedAttributes', function(assert) {
    assert.expect(1);
    const rollbackAttributesSpy = this.sinon.spy();
    this.storeWrapper.notifyPropertyChange = rollbackAttributesSpy;

    let recordData = new M3RecordData(
      'com.exmaple.bookstore.book',
      '1',
      null,
      this.storeWrapper,
      this.schemaManager,
      null,
      null
    );
    recordData.rollbackAttributes(true);
    assert.equal(rollbackAttributesSpy.getCalls().length, 0, 'rollbackAttributes was not called');
  });

  test('.schemaInterface track dependent keys resolved by ref key', function(assert) {
    let recordData = this.mockRecordData();
    let schemaInterface = recordData.schemaInterface;
    recordData.pushData({
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
    let recordData = this.mockRecordData();

    recordData.didCommit({
      id: 'newId',
      attributes: {},
    });

    assert.deepEqual(
      setRecordId.args,
      [['com.bookstore.book', 'newId', recordData.clientId]],
      'Expected setRecodId to have been called'
    );
  });

  test('`.unloadRecord` disconnects the recordData from the store', function(assert) {
    let recordData = this.mockRecordData();

    // unload
    recordData.unloadRecord();

    assert.strictEqual(
      this.storeWrapper.disconnectedRecordDatas[recordDataKey(recordData)],
      recordData,
      'Expected the recordData to have been disconnected'
    );
  });

  test(`private API _deleteAttr exists`, function(assert) {
    let recordData = this.mockRecordData();
    recordData.pushData({
      id: '1',
      attributes: {
        name: 'Harry Potter and the Chamber of Secrets',
        prequel: `Harry Potter and the Sorcerer's Stone`,
      },
    });

    assert.equal(
      recordData.getAttr('name'),
      'Harry Potter and the Chamber of Secrets',
      'name attr exists'
    );
    assert.equal(
      recordData.getAttr('prequel'),
      `Harry Potter and the Sorcerer's Stone`,
      'prequel attr exists'
    );

    recordData._deleteAttr('name');

    assert.strictEqual(recordData.getAttr('name'), undefined, 'name attr gone');
    assert.equal(
      recordData.getAttr('prequel'),
      `Harry Potter and the Sorcerer's Stone`,
      'prequel attr still exists'
    );
  });

  test('projection recordData initializes and register in base recordData', function(assert) {
    let projectedRecordData = this.storeWrapper.recordDataFor('com.bookstore.projected-book', '1');
    let baseRecordData = this.storeWrapper.recordDatas[
      recordDataKey({
        modelName: 'com.bookstore.book',
        id: '1',
      })
    ];

    assert.notEqual(baseRecordData, null, 'Expected base recordData to be initialized');
    assert.deepEqual(
      baseRecordData._projections,
      [baseRecordData, projectedRecordData],
      'Expected projected recordData to be in the projections list'
    );
  });

  test('nested projection model register in the base model nested recordData', function(assert) {
    let projectionRecordData = this.storeWrapper.recordDataFor('com.bookstore.projected-book', '1');
    let baseRecordData = this.storeWrapper.recordDataFor('com.bookstore.book', '1');

    let nestedProjected = projectionRecordData._getChildRecordData(
      'preface',
      undefined,
      'com.bookstore.chapter'
    );

    assert.ok(
      baseRecordData._childRecordDatas['preface'],
      'Expected base recordData to have created a nested recordData'
    );

    let nestedBase = baseRecordData._getChildRecordData('preface', undefined);
    assert.ok(
      nestedBase._projections.find(x => x === nestedProjected),
      'Expected the nested projection recordData to be registered in the nested base recordData'
    );
  });

  test('setting a nested model to null destroys child recordDatas in all projections', function(assert) {
    let projectionRecordData = this.storeWrapper.recordDataFor('com.bookstore.projected-book', '1');
    let baseRecordData = this.storeWrapper.recordDataFor('com.bookstore.book', '1');

    projectionRecordData.pushData({
      id: '1',
      attributes: {
        name: 'Harry Potter and the Chamber of Secrets',
        prequelBook: {
          name: `Harry Potter and the Sorcerer's Stone`,
        },
      },
    });

    // initialize the child recordData
    projectionRecordData._getChildRecordData('prequelBook', null, 'com.bookstore.book', '1', null);

    assert.ok(
      baseRecordData._childRecordDatas['prequelBook'],
      'Expected base child recordData to have been created as well'
    );

    // reset to null
    baseRecordData.pushData({
      id: '1',
      attributes: {
        prequelBook: null,
      },
    });

    assert.notOk(
      baseRecordData._childRecordDatas['prequelBook'],
      'Expected base child recordData to have been destroyed'
    );
    assert.notOk(
      projectionRecordData._childRecordDatas['prequelBook'],
      'Expected projected child recordData to have been destroyed'
    );
  });

  test('projection recordData unregister from base recordData and the store on unloadRecord', function(assert) {
    let projectionRecordData = this.storeWrapper.recordDataFor('com.bookstore.projected-book', '1');
    let baseRecordData = this.storeWrapper.recordDataFor('com.bookstore.book', '1');

    // unload the recordData
    projectionRecordData.unloadRecord();

    assert.notEqual(
      this.storeWrapper.disconnectedRecordDatas[recordDataKey(projectionRecordData)],
      null,
      'Expected projection recordData to have been disconnected from the store'
    );
    assert.equal(
      baseRecordData._projections.find(x => x === projectionRecordData),
      null,
      'Expected projected recordData to have been removed from the projections'
    );
  });

  test('base recordData is disconnected from the store if there are no more projections', function(assert) {
    let projectionRecordData = this.storeWrapper.recordDataFor('com.bookstore.projected-book', '1');
    let baseRecordData = this.storeWrapper.recordDataFor('com.bookstore.book', '1');

    // unload the projection recordData
    projectionRecordData.unloadRecord();

    assert.notEqual(
      this.storeWrapper.disconnectedRecordDatas[recordDataKey(baseRecordData)],
      null,
      'Expected projection recordData to have been disconnected from the store'
    );
  });

  test('base recordData is not disconnected from the store if there are other projections', function(assert) {
    let projectionRecordData = this.storeWrapper.recordDataFor('com.bookstore.projected-book', '1');
    this.storeWrapper.recordDataFor('com.bookstore.excerpt-book', '1');
    let baseRecordData = this.storeWrapper.recordDataFor('com.bookstore.book', '1');

    // unload the projection recordData
    projectionRecordData.unloadRecord();

    assert.equal(
      this.storeWrapper.disconnectedRecordDatas[recordDataKey(baseRecordData)],
      null,
      'Expected projection recordData to not have been disconnected from the store'
    );
  });

  test('base recordData is not disconnected from the store if the record is in use', function(assert) {
    this.storeWrapper.isRecordInUse = () => true;

    let projectionRecordData = this.storeWrapper.recordDataFor('com.bookstore.projected-book', '1');
    let baseRecordData = this.storeWrapper.recordDataFor('com.bookstore.book', '1');

    // unload the projection recordData
    projectionRecordData.unloadRecord();

    assert.equal(
      this.storeWrapper.disconnectedRecordDatas[recordDataKey(baseRecordData)],
      null,
      'Expected projection recordData to have been disconnected from the store'
    );
  });

  test('projection recordData connects with base recordData when committed with id', function(assert) {
    let projectionRecordData = this.storeWrapper.recordDataFor(
      'com.bookstore.projected-book',
      null,
      1
    );
    let baseRecordData = this.storeWrapper.recordDatas[
      recordDataKey({ modelName: 'com.bookstore.book', id: null })
    ];
    assert.notEqual(baseRecordData, null, 'Expected base recordData to have been created as well');
    assert.ok(
      baseRecordData._projections.find(x => x === projectionRecordData),
      'Expected projection recordData to have been registered'
    );
    assert.equal(
      baseRecordData.clientId,
      projectionRecordData.clientId,
      'Expected the base recordData to have the same clientId as the projection'
    );

    // actually set to be saved
    projectionRecordData.setAttr('name', 'Harry Potter');
    projectionRecordData.setAttr('preface', {
      text: "Harry Potter's preface",
    });

    let setRecordIdSpy = this.sinon.spy(this.storeWrapper, 'setRecordId');

    projectionRecordData.willCommit();

    projectionRecordData.didCommit({
      id: '1',
      attributes: {},
    });

    assert.deepEqual(
      setRecordIdSpy.args,
      [
        ['com.bookstore.projected-book', '1', projectionRecordData.clientId],
        ['com.bookstore.book', '1', baseRecordData.clientId],
      ],
      'Expected server-side ID to be set for the committed records'
    );
    assert.equal(
      projectionRecordData.id,
      '1',
      'Expected projection recordData to have picked up the new ID'
    );
    assert.equal(baseRecordData.id, '1', 'Expected base recordData to have picked up the new ID');

    assert.equal(
      projectionRecordData.getAttr('name'),
      'Harry Potter',
      'Expected primitive attribute to have been retained'
    );
    assert.deepEqual(
      projectionRecordData.getAttr('preface'),
      {
        text: "Harry Potter's preface",
      },
      'Expected complex attribute to have been retained'
    );
  });

  test(`.isAttrDirty check if key is not in inFlight and data and set locally`, function(assert) {
    let recordData = new M3RecordData(
      'com.exmaple.bookstore.book',
      '1',
      null,
      this.storeWrapper,
      this.schemaManager,
      null,
      null
    );

    recordData.pushData(
      {
        id: '1',
        attributes: {
          dataAttr: 'value',
        },
      },
      false
    );

    recordData.setAttr('inFlightAttr', 'value');
    recordData.willCommit();
    recordData.setAttr('localAttr', 'value');

    assert.ok(!recordData.isAttrDirty('dataAttr'), 'data attr is not dirty');
    assert.ok(!recordData.isAttrDirty('inFlightAttr'), 'inFlight attr is not dirty');
    assert.ok(recordData.isAttrDirty('localAttr'), 'local attr is not dirty');
  });

  module('with nested models', function(hooks) {
    hooks.beforeEach(function() {
      this.topRecordData = new M3RecordData(
        'com.exmaple.bookstore.book',
        'top',
        null,
        this.storeWrapper,
        this.schemaManager,
        null,
        null
      );

      this.topRecordData.pushData({
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
      this.child1RecordData = this.topRecordData._getChildRecordData(
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
      this.child2RecordData = this.topRecordData._getChildRecordData(
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
      this.child11RecordData = this.child1RecordData._getChildRecordData(
        'child1_1',
        null,
        'com.exmaple.bookstore.book',
        'child1_1',
        { record: this.child11Model }
      );
    });

    test('.pushData calls reified child recordDatas recursively', function(assert) {
      let pushDataSpy = this.sinon.spy(M3RecordData.prototype, 'pushData');
      let changedKeys = this.topRecordData.pushData(
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
            this.child1RecordData + '',
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
            this.child11RecordData + '',
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

    test('.pushData on a child recordData manually notifies changes', function(assert) {
      this.topRecordData.pushData(
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

    test('.didCommit calls reified child recordDatas recursively', function(assert) {
      let didCommitSpy = this.sinon.spy(M3RecordData.prototype, 'didCommit');
      let changedKeys = this.topRecordData.didCommit({
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
            this.child1RecordData + '',
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
            this.child11RecordData + '',
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

    test('.didCommit on a child recordData manually notifies changes', function(assert) {
      this.topRecordData.didCommit({
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

    test('.commitWasRejected calls reified child recordDatas recursively', function(assert) {
      let commitWasRejectedSpy = this.sinon.spy(M3RecordData.prototype, 'commitWasRejected');
      this.topRecordData.willCommit();
      this.topRecordData.commitWasRejected();

      assert.deepEqual(
        zip(
          commitWasRejectedSpy.thisValues.slice(1).map(x => x + ''),
          commitWasRejectedSpy.args.slice(1)
        ),
        [
          [this.child1RecordData + '', []],
          [this.child11RecordData + '', []],
          [this.child2RecordData + '', []],
        ],
        'commitWasRejected called recursively on children'
      );
    });

    test('.rollbackAttributes calls reified child recordDatas recursively', function(assert) {
      let rollbackAttributesSpy = this.sinon.spy(M3RecordData.prototype, 'rollbackAttributes');
      this.topRecordData.rollbackAttributes();

      assert.deepEqual(
        zip(
          rollbackAttributesSpy.thisValues.slice(1).map(x => x + ''),
          rollbackAttributesSpy.args.slice(1)
        ),
        [
          [this.child1RecordData + '', [true]],
          [this.child11RecordData + '', [true]],
          [this.child2RecordData + '', [true]],
        ],
        'rollbackAttributes called recursively on children'
      );
    });
  });
});
