import { test } from 'qunit';
import { default as moduleFor }  from 'ember-qunit/module-for';
import sinon from 'sinon';
import { zip } from 'lodash';

import Ember from 'ember';
import DS from 'ember-data';

import { initialize as initializeStore } from 'ember-m3/initializers/m3-store';
import SchemaManager from 'ember-m3/schema-manager';
import MegamorphicModel from 'ember-m3/model';

const { RSVP: { resolve, defer, Promise }, run } = Ember;
const { Serializer } = DS;

function stubCalls(stub) {
  return zip(
    stub.thisValues.map(x => x+''),
    stub.args
  );
}

moduleFor('m3:query-cache', 'unit/query-cache', {
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

test('.queryURL uses adapter.ajax to send requests', function(assert) {
  assert.equal(this.adapterAjax.callCount, 0, 'initial callCount 0');

  this.adapterAjax.returns(resolve({
    data: {
      id: 1,
      type: 'my-type',
    }
  }));

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

  this.adapterAjax.returns(resolve({
    data: {
      id: 1,
      type: 'my-type',
    }
  }));

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

  this.adapterAjax.returns(resolve({
    data: {
      id: 1,
      type: 'my-type',
    }
  }));

  return this.queryCache.queryURL('/uwot', { method: 'POST' }).then(() => {
    assert.deepEqual(
      stubCalls(this.adapterAjax),
      [[this.adapter()+'', ['/uwot', 'POST', {}]]],
      'adapter.ajax called with right args'
    );
  });
});

test('a custom -ember-m3 adapter can be registered', function(assert) {
  let payload = {
    data: {
      id: 1,
      type: 'my-type',
    }
  };
  let customAdapter = {
    ajax: this.sinon.stub().returns(resolve(payload)),
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

test('.queryURL can resolve with individual models', function(assert) {
  let payload = {
    data: {
      id: 1,
      type: 'something-or-other',
      attributes: {},
    }
  };

  this.adapterAjax.returns(resolve(payload));

  return this.queryCache.queryURL('/uwot').then((fulfilledValue) => {
    assert.equal(fulfilledValue.constructor, MegamorphicModel);
    assert.equal(fulfilledValue.get('id'), 1);
  });
});

test('.queryURL can resolve with a record array of models', function(assert) {
  let payload = {
    data: [{
      id: 1,
      type: 'something-or-other',
      attributes: {},
    }, {
      id: 2,
      type: 'something-or-other',
      attributes: {},
    }]
  };

  this.adapterAjax.returns(resolve(payload));

  return this.queryCache.queryURL('/uwot').then((fulfilledValue) => {
    assert.deepEqual(fulfilledValue.toArray().map(x => x.id), ['1', '2']);
  });
});

test('.queryURL caches its results when given a cacheKey', function(assert) {
  let firstPayload = {
    data: {
      id: 1,
      type: 'something-or-other',
      attributes: {},
    }
  };
  let secondPayload = {
    data: {
      id: 2,
      type: 'something-or-other',
      attributes: {},
    }
  }
  this.adapterAjax.returns(resolve(firstPayload));

  let options = { cacheKey: 'uwot' };

  return this.queryCache.queryURL('/uwot', options).then((model) => {
    assert.equal(model.id, 1, 'the returned promise fulfills with the model');
  }).then(() => {
    this.adapterAjax.returns(resolve(secondPayload));
    return this.queryCache.queryURL('/uwot', options);
  }).then((model) => {
    assert.equal(model.id, 1, 'the returned promise fulfills with the model');
    assert.equal(this.adapterAjax.callCount, 1, 'adapter.ajax is not called again (cache hit)');
  });
});

test('.queryURL does not cache results when not given a cacheKey', function(assert) {
  let firstPayload = {
    data: {
      id: 1,
      type: 'something-or-other',
      attributes: {},
    }
  };
  let secondPayload = {
    data: {
      id: 2,
      type: 'something-or-other',
      attributes: {},
    }
  }
  this.adapterAjax.returns(resolve(firstPayload));

  return this.queryCache.queryURL('/uwot').then((model) => {
    assert.equal(model.id, 1, 'the returned promise fulfills with the model');
  }).then(() => {
    this.adapterAjax.returns(resolve(secondPayload));
    return this.queryCache.queryURL('/uwot');
  }).then((model) => {
    assert.equal(model.id, 2, 'the returned promise fulfills with the model');
    assert.equal(this.adapterAjax.callCount, 2, 'adapter.ajax is called again');
  });
});

test('queryURL skips the cache when reload: true', function(assert) {
  let firstPayload = {
    data: {
      id: 1,
      type: 'something-or-other',
      attributes: {},
    }
  };
  let secondPayload = {
    data: {
      id: 2,
      type: 'something-or-other',
      attributes: {},
    }
  }
  this.adapterAjax.returns(resolve(firstPayload));

  let cacheKey = 'uwot';

  return this.queryCache.queryURL('/uwot', { cacheKey }).then((model) => {
    assert.equal(model.id, 1, 'the returned promise fulfills with the model');
  }).then(() => {
    this.adapterAjax.returns(resolve(secondPayload));
    return this.queryCache.queryURL('/uwot', { cacheKey, reload: true });
  }).then((model) => {
    assert.equal(model.id, 2, 'the returned promise fulfills with the model');
    assert.equal(this.adapterAjax.callCount, 2, 'adapter.ajax is called again');
  });
});

test('queryURL returns the cached result but still updates when backgroundReload: true', function(assert) {
  let firstPayload = {
    data: {
      id: 1,
      type: 'something-or-other',
      attributes: {
        name: 'sally',
      },
    }
  };
  let secondPayload = {
    data: {
      id: 1,
      type: 'something-or-other',
      attributes: {
        name: 'sandy',
      },
    }
  }
  let deferredBackgroundReload = defer();
  this.adapterAjax.returns(resolve(firstPayload));

  let cacheKey = 'uwot';

  return this.queryCache.queryURL('/uwot', { cacheKey }).then((model) => {
    assert.equal(model.get('name'), 'sally', 'the returned promise fulfills with the model');
  }).then(() => {
    this.adapterAjax.returns(deferredBackgroundReload.promise);
    return this.queryCache.queryURL('/uwot', { cacheKey, backgroundReload: true });
  }).then((model) => {
    assert.equal(model.get('name'), 'sally', 'the returned promise fulfills with the cached model');
    assert.equal(this.adapterAjax.callCount, 2, 'adapter.ajax is called again');

    deferredBackgroundReload.resolve(secondPayload);
    return deferredBackgroundReload.promise.then(() => {
      assert.equal(model.get('name'), 'sandy', 'the internal model is asynchronously updated');
    });
  });
});

test('the cache entry for a single model is invalidated when that model is unloaded', function(assert) {
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

  return this.queryCache.queryURL('/uwot', options).then((model) => {
    assert.equal(model.id, '1', 'the returned promise fulfills with the model');
    model.unloadRecord();
  }).then(() => {
    this.adapterAjax.returns(resolve(secondPayload));
    return this.queryCache.queryURL('/uwot', options);
  }).then((model) => {
    assert.equal(model.id, '2', 'cache is cleared when model is unloaded');
    assert.equal(this.adapterAjax.callCount, 2, 'adapter.ajax is called again');
  }).then(() => {
    return this.queryCache.queryURL('/uwot', options);
  }).then((model) => {
    assert.equal(model.id, '2', 'cache can be used after being cleared');
    assert.equal(this.adapterAjax.callCount, 2, 'adapter.ajax is not called again');
  });
});

test('the cache entry for an array of models is invalidated when any model is unloaded', function(assert) {
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

  return this.queryCache.queryURL('/uwot', options).then((models) => {
    assert.deepEqual(models.map(x => x.id), ['1', '2'], 'the returned promise fulfills with the models');
    models.objectAt(0).unloadRecord();
  }).then(() => {
    this.adapterAjax.returns(resolve(secondPayload));
    return this.queryCache.queryURL('/uwot', options);
  }).then((models) => {
    assert.deepEqual(models.map(x => x.id), ['3'], 'cache is cleared when any member model is unloaded');
    assert.equal(this.adapterAjax.callCount, 2, 'adapter.ajax is called again');
  }).then(() => {
    return this.queryCache.queryURL('/uwot', options);
  }).then((models) => {
    assert.deepEqual(models.map(x => x.id), ['3'], 'cache can be used after being cleared');
    assert.equal(this.adapterAjax.callCount, 2, 'adapter.ajax is not called again');
  });
});

test('multiple cache entries are invalidated if they both involve the same unloaded model', function(assert) {
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

  return this.queryCache.queryURL('/uwot', options).then((model) => {
    assert.equal(model.id, '1');
    assert.equal(this.adapterAjax.callCount, 1);
    return this.queryCache.queryURL('/alt-uwot', siblingOptions);
  }).then((model) => {
    assert.equal(model.id, '1');
    assert.equal(this.adapterAjax.callCount, 2);
    // we expect this to invalidate both caches
    model.unloadRecord();

    this.adapterAjax.returns(resolve(secondPayload));

    return this.queryCache.queryURL('/uwot', options);
  }).then(model => {
    assert.equal(model.id, '2');
    assert.equal(this.adapterAjax.callCount, 3);

    return this.queryCache.queryURL('/alt-uwot', siblingOptions);
  }).then(model => {
    assert.equal(model.id, '2');
    assert.equal(this.adapterAjax.callCount, 4);
  });
});


test('models are removed from results when they are unloaded', function(assert) {
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
      id: 2,
      type: 'my-type',
      attributes: {},
    }, {
      id: 3,
      type: 'my-type',
      attributes: {},
    }]
  }

  this.adapterAjax.withArgs('/uwot').returns(resolve(firstPayload));
  this.adapterAjax.withArgs('/okay').returns(resolve(secondPayload));

  return Promise.all([
    this.queryCache.queryURL('/uwot'),
    this.queryCache.queryURL('/okay'),
  ]).then(([firstResult, secondResult]) => {
    assert.deepEqual(
      firstResult.toArray().map(x => x.id),
      ['1', '2'],
      'results are initially correct'
    );
    assert.deepEqual(
      secondResult.toArray().map(x => x.id),
      ['2', '3'],
      'results are initially correct'
    );

    run(() => {
      firstResult.objectAt(1).unloadRecord();
    });

    assert.deepEqual(
      firstResult.toArray().map(x => x.id),
      ['1'],
      'models are removed from queryURL results when unloaded'
    );

    assert.deepEqual(
      secondResult.toArray().map(x => x.id),
      ['3'],
      'models are removed from queryURL results when unloaded'
    );
  });
});

test('queryURL returns a record array that can be updated', function(assert) {
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
      id: 1,
      type: 'my-type',
      attributes: {},
    }, {
      id: 3,
      type: 'my-type',
      attributes: {},
    }]
  };

  this.adapterAjax.returns(resolve(firstPayload));

  return this.queryCache.queryURL('/ohai').then(models => {
    assert.deepEqual(models.toArray().map(x => x.id), ['1', '2'], 'models are initially correct');

    this.adapterAjax.returns(resolve(secondPayload));

    self.stop = true;
    let updatePromise = models.update();

    assert.equal(models.get('isUpdating'), true, 'record array is updating during update');

    return updatePromise.then(fulfillmentValue => {
      assert.equal(fulfillmentValue, models, 'promise fulfills with the existing record array');
      assert.equal(models.get('isLoaded'), true, 'record array is loaded after update');
      assert.equal(models.get('isUpdating'), false, 'record array is not updating after update');

      assert.deepEqual(models.toArray().map(x => x.id), ['1', '3'], 'models are updated');
    });
  });
});

test('update uses the original http method and query params', function(assert) {
  let payload = {
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

  this.adapterAjax.returns(resolve(payload));
  this.queryCache.queryURL('/ohai', { method: 'POST', params: { q: 'v' }}).
    then(models => models.update()).
    then(() => {
      assert.deepEqual(
        stubCalls(this.adapterAjax),
        [
          [this.adapter()+'', ['/ohai', 'POST', { data: { q: 'v' }}]],
          [this.adapter()+'', ['/ohai', 'POST', { data: { q: 'v' }}]],
        ],
        'adapter.ajax called with right args'
      );
    });
});

test('queryURL goes through a serializer to normalize responses', function(assert) {
  let payload = {
    name: 'name name?',
    wat: 'definitely'
  };

  this.register('serializer:application', Serializer.extend({
    normalizeResponse(store, modelClass, payload /*, id, requestType */) {
      return {
        data: {
          id: 1,
          type: 'my-type',
          attributes: payload,
        }
      }
    },
  }));

  this.adapterAjax.returns(resolve(payload));
  this.queryCache.queryURL('/hello').then(model => {
    assert.equal(model.get('name'), 'name name?');
    assert.equal(model.get('wat'), 'definitely');
  });
});
