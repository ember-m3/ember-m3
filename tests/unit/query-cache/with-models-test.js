import { test } from 'qunit';
import { default as moduleFor }  from 'ember-qunit/module-for';
import sinon from 'sinon';

import Ember from 'ember';

import { initialize as initializeStore } from 'ember-m3/initializers/m3-store';
import SchemaManager from 'ember-m3/schema-manager';

const { RSVP: { resolve }} = Ember;


moduleFor('m3:query-cache', 'unit/query-cache/with-models', {
  integration: true,

  beforeEach() {
    this.sinon = sinon.sandbox.create();
    initializeStore(this);

    this.queryCache = this.store()._queryCache;
    this.adapterAjax = this.sinon.stub(this.adapter(), 'ajax').returns(resolve());

    SchemaManager.registerSchema({
      includesModel(/* modelName */) {
        return true;
      },

      computeAttributeReference(/* key, value */) {
      },

      computeNestedModel(/* key, value */) {
      },

      models: {
      }
    });
  },

  afterEach() {
    this.sinon.restore();
  },

  store: function() {
    return this.container.lookup('service:store');
  },

  adapter: function() {
    return this.store().adapterFor('application');
  },
});

test('the cache entry for a single record is invalidated when that record is unloaded', function(assert) {
  let firstPayload = {
    data: {
      id: 1,
      type: 'my-type',
      attributes: {},
    }
  };
  let secondPayload = {
    data: {
      id: 2,
      type: 'my-other-type',
      attributes: {},
    }
  };

  this.adapterAjax.returns(resolve(firstPayload));

  let options = { cacheKey: 'uwot' };

  return this.queryCache.queryURL('/uwot', options).then((record) => {
    assert.equal(record.id, '1', 'the returned promise fulfills with the record');
    record.unloadRecord();
  }).then(() => {
    this.adapterAjax.returns(resolve(secondPayload));
    return this.queryCache.queryURL('/uwot', options);
  }).then((record) => {
    assert.equal(record.id, '2', 'cache is cleared when record is unloaded');
    assert.equal(this.adapterAjax.callCount, 2, 'adapter.ajax is called again');
  }).then(() => {
    return this.queryCache.queryURL('/uwot', options);
  }).then((record) => {
    assert.equal(record.id, '2', 'cache can be used after being cleared');
    assert.equal(this.adapterAjax.callCount, 2, 'adapter.ajax is not called again');
  });
});

test('the cache entry for an array of records is invalidated when any record is unloaded', function(assert) {
  let firstPayload = {
    data: [{
      id: 1,
      type: 'my-type',
      attributes: {},
    }, {
      id: 2,
      type: 'my-type',
      attributes: {},
    }]
  };
  let secondPayload = {
    data: [{
      id: 3,
      type: 'my-type',
      attributes: {},
    }]
  };

  this.adapterAjax.returns(resolve(firstPayload));

  let options = { cacheKey: 'uwot' };

  return this.queryCache.queryURL('/uwot', options).then((records) => {
    assert.deepEqual(records.map(x => x.id), ['1', '2'], 'the returned promise fulfills with the records');
    records[0].unloadRecord();
  }).then(() => {
    this.adapterAjax.returns(resolve(secondPayload));
    return this.queryCache.queryURL('/uwot', options);
  }).then((records) => {
    assert.deepEqual(records.map(x => x.id), ['3'], 'cache is cleared when any member record is unloaded');
    assert.equal(this.adapterAjax.callCount, 2, 'adapter.ajax is called again');
  }).then(() => {
    return this.queryCache.queryURL('/uwot', options);
  }).then((records) => {
    assert.deepEqual(records.map(x => x.id), ['3'], 'cache can be used after being cleared');
    assert.equal(this.adapterAjax.callCount, 2, 'adapter.ajax is not called again');
  });
});

test('multiple cache entries are invalidated if they both involve the same unloaded record', function(assert) {
  let firstPayload = {
    data: {
      id: 1,
      type: 'my-type',
      attributes: {},
    }
  };
  let secondPayload = {
    data: {
      id: 2,
      type: 'my-type',
      attributes: {},
    }
  };

  this.adapterAjax.returns(resolve(firstPayload));

  let options = { cacheKey: 'uwot' };
  let siblingOptions = { cacheKey: 'alt-uwot' };

  return this.queryCache.queryURL('/uwot', options).then((record) => {
    assert.equal(record.id, '1');
    assert.equal(this.adapterAjax.callCount, 1);
    return this.queryCache.queryURL('/alt-uwot', siblingOptions);
  }).then((record) => {
    assert.equal(record.id, '1');
    assert.equal(this.adapterAjax.callCount, 2);
    // we expect this to invalidate both caches
    record.unloadRecord();

    this.adapterAjax.returns(resolve(secondPayload));

    return this.queryCache.queryURL('/uwot', options);
  }).then(record => {
    assert.equal(record.id, '2');
    assert.equal(this.adapterAjax.callCount, 3);

    return this.queryCache.queryURL('/alt-uwot', siblingOptions);
  }).then(record => {
    assert.equal(record.id, '2');
    assert.equal(this.adapterAjax.callCount, 4);
  });
});

