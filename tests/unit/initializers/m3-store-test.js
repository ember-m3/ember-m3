import { module, test } from 'qunit';
import sinon from 'sinon';
import { zip } from 'lodash';

import Ember from 'ember';

import MegamorphicModelFactory from 'ember-m3/factory';
import SchemaManager from 'ember-m3/schema-manager';
import { extendStore } from 'ember-m3/initializers/m3-store';

module('unit/initializers/m3-store', {
  beforeEach() {
    this.sinon = sinon.sandbox.create();

    SchemaManager.registerSchema({
      includesModel(modelName) {
        return /^com.example.bookstore\./i.test(modelName);
      },

      computeAttributeReference() { },

      isAttributeArrayReference() { },

      computeNestedModel() { },

      models: { }
    });

    let MockStore = Ember.Object.extend({
      adapterFor: this.adapterForStub = this.sinon.stub(),
      serializerFor: this.serializerForStub = this.sinon.stub(),
      modelFactoryFor: this.modelFactoryForStub = this.sinon.stub(),
    });
    MockStore.toString = () => 'MockStore';
    extendStore(MockStore);

    this.store = MockStore.create();
  },

  afterEach() {
    this.sinon.restore();
  },
});

test('it adds `store.queryURL`', function(assert) {
  assert.expect(2);

  assert.equal(typeof this.store.queryURL, 'function', 'queryURL added');
  this.sinon.stub(this.store._queryCache, 'queryURL').callsFake((...args) => {
    assert.deepEqual(
      [...args],
      ['/some-data', { params: { a: '1' }}],
      'arguments are passed down to queryCache'
    );
  });

  this.store.queryURL('/some-data', { params: { a: '1' }});
});

test('it adds `store.unloadURL`', function(assert) {
  assert.expect(2);

  const cacheKey = 'uwot';

  assert.equal(typeof this.store.unloadURL, 'function', 'unloadURL added');
  this.sinon.stub(this.store._queryCache, 'unloadURL').callsFake((...args) => {
    assert.deepEqual(
      [...args],
      [cacheKey],
      'arguments are passed down to queryCache'
    );
  });

  this.store.unloadURL(cacheKey);
});

test('it adds `store.containsURL`', function(assert) {
  assert.expect(1);

  const cacheKey = 'uwot';

  assert.equal(typeof this.store.containsURL, 'function', 'containsURL added');
  this.sinon.stub(this.store._queryCache, 'containsURL').callsFake((...args) => {
    assert.deepEqual(
      [...args],
      [cacheKey],
      'arguments are passed down to queryCache'
    );
  });

  this.store.containsURL(cacheKey);
});

test('uses the -ember-m3 adapter for schema-recognized types', function(assert) {
  this.store.adapterFor('non-matching-type');

  assert.deepEqual(
    zip(this.adapterForStub.thisValues.map(x => x + ''), this.adapterForStub.args),
    [
      [this.store + '', ['non-matching-type']],
    ],
    'non-matching types are passed through'
  );

  this.store.adapterFor('com.example.bookstore.Book');

  assert.deepEqual(
    zip(this.adapterForStub.thisValues.map(x => x + ''), this.adapterForStub.args),
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
    zip(this.serializerForStub.thisValues.map(x => x + ''), this.serializerForStub.args),
    [
      [this.store + '', ['non-matching-type']],
    ],
    'non-matching types are passed through'
  );

  this.store.serializerFor('com.example.bookstore.Book');

  assert.deepEqual(
    zip(this.serializerForStub.thisValues.map(x => x + ''), this.serializerForStub.args),
    [
      [this.store + '', ['non-matching-type']],
      [this.store + '', ['-ember-m3']],
    ],
    'matching types use the -ember-m3 serializer'
  );
});

test('uses the -ember-m3 model factory for schema-recognized types', function(assert) {
  this.store.modelFactoryFor('non-matching-type');

  assert.deepEqual(
    zip(this.modelFactoryForStub.thisValues.map(x => x + ''), this.modelFactoryForStub.args),
    [
      [this.store + '', ['non-matching-type']],
    ],
    'non-matching types are passed through'
  );

  assert.equal(
    this.store.modelFactoryFor('com.example.bookstore.Book'),
    MegamorphicModelFactory,
    'matching types return the M3 model factory'
  );

  assert.deepEqual(
    zip(this.modelFactoryForStub.thisValues.map(x => x + ''), this.modelFactoryForStub.args),
    [
      [this.store + '', ['non-matching-type']],
    ],
    'matching types do not require a call to super'
  );
});
