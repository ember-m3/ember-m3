import EmberObject from '@ember/object';
import { module, test } from 'qunit';
import sinon from 'sinon';
import { setupTest } from 'ember-qunit';
import { zip } from 'lodash';

import DefaultSchema from 'ember-m3/services/m3-schema';
import MegamorphicModelFactory from 'ember-m3/factory';
import StoreMixin from 'ember-m3/mixins/store';

module('unit/initializers/m3-store', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.sinon = sinon.createSandbox();

    this.owner.register(
      'service:m3-schema',
      class TestSchema extends DefaultSchema {
        includesModel(modelName) {
          return /^com.example.bookstore\./i.test(modelName);
        }
      }
    );

    // this indirection is to work around false positives in
    // ember/avoid-leaking-state-in-ember-objects
    this.adapterForStub = this.sinon.stub();
    this.serializerForStub = this.sinon.stub();
    this.modelFactoryForStub = this.sinon.stub();
    let MockStore = EmberObject.extend(
      {
        adapterFor: this.adapterForStub,
        serializerFor: this.serializerForStub,
        _modelFactoryFor: this.modelFactoryForStub,
        registerSchemaDefinitionService: function() {},
        getSchemaDefinitionService: function() {
          return {};
        },
      },
      StoreMixin
    );
    MockStore.toString = () => 'MockStore';

    this.store = MockStore.create({
      // required because it cannot be injected in this case
      _schemaManager: this.owner.lookup('service:m3-schema-manager'),
    });
  });

  hooks.afterEach(function() {
    this.sinon.restore();
  });

  test('it adds `store.queryURL`', function(assert) {
    assert.expect(2);

    assert.equal(typeof this.store.queryURL, 'function', 'queryURL added');
    this.sinon.stub(this.store._queryCache, 'queryURL').callsFake((...args) => {
      assert.deepEqual(
        [...args],
        ['/some-data', { params: { a: '1' } }],
        'arguments are passed down to queryCache'
      );
    });

    this.store.queryURL('/some-data', { params: { a: '1' } });
  });

  test('it adds `store.cacheURL`', function(assert) {
    assert.expect(1);
    assert.equal(typeof this.store.cacheURL, 'function', 'cacheURL added');
  });

  test('it adds `store.unloadURL`', function(assert) {
    assert.expect(2);

    const cacheKey = 'uwot';

    assert.equal(typeof this.store.unloadURL, 'function', 'unloadURL added');
    this.sinon.stub(this.store._queryCache, 'unloadURL').callsFake((...args) => {
      assert.deepEqual([...args], [cacheKey], 'arguments are passed down to queryCache');
    });

    this.store.unloadURL(cacheKey);
  });

  test('it adds `store.containsURL`', function(assert) {
    assert.expect(2);

    const cacheKey = 'uwot';

    assert.equal(typeof this.store.containsURL, 'function', 'containsURL added');
    this.sinon.stub(this.store._queryCache, 'contains').callsFake((...args) => {
      assert.deepEqual([...args], [cacheKey], 'arguments are passed down to queryCache');
    });

    this.store.containsURL(cacheKey);
  });

  test('uses the -ember-m3 adapter for schema-recognized types', function(assert) {
    this.store.adapterFor('non-matching-type');

    assert.deepEqual(
      zip(
        this.adapterForStub.thisValues.map(x => x + ''),
        this.adapterForStub.args
      ),
      [[this.store + '', ['non-matching-type']]],
      'non-matching types are passed through'
    );

    this.store.adapterFor('com.example.bookstore.Book');

    assert.deepEqual(
      zip(
        this.adapterForStub.thisValues.map(x => x + ''),
        this.adapterForStub.args
      ),
      [
        [this.store + '', ['non-matching-type']],
        [this.store + '', ['-ember-m3']],
      ],
      'matching types use the -ember-m3 adapter'
    );
  });

  test('uses the -ember-m3 serializer for schema-recognized types', function(assert) {
    this.store.serializerFor('non-matching-type');

    assert.deepEqual(
      zip(
        this.serializerForStub.thisValues.map(x => x + ''),
        this.serializerForStub.args
      ),
      [[this.store + '', ['non-matching-type']]],
      'non-matching types are passed through'
    );

    this.store.serializerFor('com.example.bookstore.Book');

    assert.deepEqual(
      zip(
        this.serializerForStub.thisValues.map(x => x + ''),
        this.serializerForStub.args
      ),
      [
        [this.store + '', ['non-matching-type']],
        [this.store + '', ['-ember-m3']],
      ],
      'matching types use the -ember-m3 serializer'
    );
  });

  test('uses the -ember-m3 model factory for schema-recognized types', function(assert) {
    this.store._modelFactoryFor('non-matching-type');

    assert.deepEqual(
      zip(
        this.modelFactoryForStub.thisValues.map(x => x + ''),
        this.modelFactoryForStub.args
      ),
      [[this.store + '', ['non-matching-type']]],
      'non-matching types are passed through'
    );

    assert.equal(
      this.store._modelFactoryFor('com.example.bookstore.Book'),
      MegamorphicModelFactory,
      'matching types return the M3 model factory'
    );

    assert.deepEqual(
      zip(
        this.modelFactoryForStub.thisValues.map(x => x + ''),
        this.modelFactoryForStub.args
      ),
      [[this.store + '', ['non-matching-type']]],
      'matching types do not require a call to super'
    );
  });
});
