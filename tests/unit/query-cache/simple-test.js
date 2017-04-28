import { test } from 'qunit';
import { default as moduleFor }  from 'ember-qunit/module-for';
import sinon from 'sinon';
import { zip } from 'lodash';

import Ember from 'ember';

import { initialize as initializeStore } from 'ember-m3/initializers/m3-store';
import QueryCache from 'ember-m3/query-cache';

const { RSVP: { resolve }} = Ember;

function stubCalls(stub) {
  return zip(
    stub.thisValues.map(x => x+''),
    stub.args
  );
}

moduleFor('m3:query-cache', 'unit/query-cache/simple', {
  integration: true,

  beforeEach() {
    this.sinon = sinon.sandbox.create();
    initializeStore(this);

    this.queryCache = new QueryCache({ store: this.store() });
    this.adapterAjax = this.sinon.stub(this.adapter(), 'ajax').returns(resolve());
    this.storePush = this.sinon.stub(this.store(), 'push');
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

test('.queryURL uses adapter.ajax to send requests', function(assert) {
  assert.equal(this.adapterAjax.callCount, 0, 'initial callCount 0');

  return this.queryCache.queryURL('/uwot').then(() => {
    assert.deepEqual(
      stubCalls(this.adapterAjax),
      [[this.adapter()+'', ['/uwot', 'GET', {}]]],
      'adapter.ajax called with right args'
    );
  });
});

test('.queryURL can accept params', function(assert) {
  assert.equal(this.adapterAjax.callCount, 0, 'initial callCount 0');

  return this.queryCache.queryURL('/uwot', { params: { param: 'value' }}).then(() => {
    assert.deepEqual(
      stubCalls(this.adapterAjax),
      [[this.adapter()+'', ['/uwot', 'GET', { data: { param: 'value' }}]]],
      'adapter.ajax called with right args'
    );
  });
});

test('.queryURL can accept a method', function(assert) {
  assert.equal(this.adapterAjax.callCount, 0, 'initial callCount 0');

  return this.queryCache.queryURL('/uwot', { method: 'POST' }).then(() => {
    assert.deepEqual(
      stubCalls(this.adapterAjax),
      [[this.adapter()+'', ['/uwot', 'POST', {}]]],
      'adapter.ajax called with right args'
    );
  });
});

test('a custom -ember-m3 adapter can be registered', function(assert) {
  let customAdapter = {
    ajax: this.sinon.stub().returns(resolve()),
    toString: () => 'my-adapter',
    destroy() {},
  };
  this.register('adapter:-ember-m3', customAdapter, { singleton: true, instantiate: false });

  return this.queryCache.queryURL('/uwot').then(() => {
    assert.deepEqual(
      stubCalls(customAdapter.ajax),
      [['my-adapter', ['/uwot', 'GET', {}]]],
      'adapter.ajax called with right args'
    );
  });
});

test('.queryURL pushes the resulting payload into the store and fulfills its returned promise wit the return value', function(assert) {
  let payload = {
    data: {
      id: 1,
      type: 'something-or-other',
      attributes: {},
    }
  };
  let record = { record: 'the-record' };

  this.adapterAjax.returns(resolve(payload));
  this.storePush.returns(record);

  return this.queryCache.queryURL('/uwot').then((fulfilledValue) => {
    assert.equal(fulfilledValue, record, 'the returned promise fulfills with the record');

    assert.deepEqual(
      stubCalls(this.storePush),
      [[this.store()+'', [payload]]],
      'store.push is called correctly'
    );
  });
});

test('.queryURL caches its results when given a cacheKey', function(assert) {
  let payload = {
    data: {
      id: 1,
      type: 'something-or-other',
      attributes: {},
    }
  };
  let record = { record: 'the-record' };

  this.adapterAjax.returns(resolve(payload));
  this.storePush.returns(record);

  let options = { cacheKey: 'uwot' };

  return this.queryCache.queryURL('/uwot', options).then((fulfilledValue) => {
    assert.equal(fulfilledValue, record, 'the returned promise fulfills with the record');

    assert.deepEqual(
      stubCalls(this.storePush),
      [[this.store()+'', [payload]]],
      'store.push is called correctly'
    );
  }).then(() => {
    this.storePush.returns(null);
    return this.queryCache.queryURL('/uwot', options);
  }).then((fulfilledValue) => {
    assert.equal(fulfilledValue, record, 'the returned promise fulfills with the record');

    assert.equal(this.adapterAjax.callCount, 1, 'adapter.ajax is not called again (cache hit)');
    assert.deepEqual(
      stubCalls(this.storePush),
      [[this.store()+'', [payload]]],
      'store.push is not called again (cache hit)'
    );
  });
});

test('queryURL does not cache results when not given a cacheKey', function(assert) {
  let payload = {
    data: {
      id: 1,
      type: 'something-or-other',
      attributes: {},
    }
  };
  let record = { record: 'the-record' };

  this.adapterAjax.returns(resolve(payload));
  this.storePush.returns(record);

  return this.queryCache.queryURL('/uwot').then((fulfilledValue) => {
    assert.equal(fulfilledValue, record, 'the returned promise fulfills with the record');

    assert.deepEqual(
      stubCalls(this.storePush),
      [[this.store()+'', [payload]]],
      'store.push is called correctly'
    );
  }).then(() => {
    this.storePush.returns(null);
    return this.queryCache.queryURL('/uwot');
  }).then((fulfilledValue) => {
    assert.equal(fulfilledValue, null, 'results are not cached without a cache key');
    assert.equal(this.adapterAjax.callCount, 2, 'adapter.ajax is called again');
  });
});
