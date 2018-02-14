import { module, test } from 'qunit';
import M3ModelData from 'ember-m3/model-data';
import sinon from 'sinon';
import { zip } from 'lodash';

module('unit/model-data', function(hooks) {
  hooks.beforeEach(function() {
    this.sinon = sinon.sandbox.create();
    this.storeWrapper = null;

    this.mockModelData = function() {
      return new M3ModelData('com.exmaple.bookstore.book', '1', this.storeWrapper, null);
    };
  });

  hooks.afterEach(function() {
    this.sinon.restore();
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

  test(`.constructor populates the parent modelData's .childModelDatas`, function(assert) {
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

    let child1ModelData = new M3ModelData(
      'com.exmaple.bookstore.book',
      '1',
      null,
      this.storeWrapper,
      topModelData,
      'child1'
    );

    let child2ModelData = new M3ModelData(
      'com.exmaple.bookstore.book',
      '1',
      null,
      this.storeWrapper,
      topModelData,
      'child2'
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
      this.child1ModelData = new M3ModelData(
        'com.exmaple.bookstore.book',
        'child1',
        null,
        this.storeWrapper,
        this.topModelData,
        'child1',
        false,
        { record: this.child1Model }
      );

      this.child2Model = {
        _notifyProperties: this.sinon.spy(),
      };
      this.child2ModelData = new M3ModelData(
        'com.exmaple.bookstore.book',
        'child2',
        null,
        this.storeWrapper,
        this.topModelData,
        'child2',
        false,
        { record: this.child2Model }
      );

      this.grandchild1Model = {
        _notifyProperties: this.sinon.spy(),
      };
      this.grandchild1ModelData = new M3ModelData(
        'com.exmaple.bookstore.book',
        'grandchild1_1',
        null,
        this.storeWrapper,
        this.child1ModelData,
        'child1_1',
        false,
        { record: this.grandchild1Model }
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
            this.grandchild1ModelData + '',
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
          this.grandchild1Model._notifyProperties.thisValues.map(x => x + ''),
          this.grandchild1Model._notifyProperties.args
        ),
        [[this.grandchild1Model + '', [['name']]]],
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
            this.grandchild1ModelData + '',
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
          this.grandchild1Model._notifyProperties.thisValues.map(x => x + ''),
          this.grandchild1Model._notifyProperties.args
        ),
        [[this.grandchild1Model + '', [['name']]]],
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
          [this.grandchild1ModelData + '', []],
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
          [this.grandchild1ModelData + '', [true]],
          [this.child2ModelData + '', [true]],
        ],
        'rollbackAttributes called recursively on children'
      );
    });
  });
});
