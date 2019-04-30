import EmberObject from '@ember/object';
import { Promise, defer, resolve, reject } from 'rsvp';
import { run } from '@ember/runloop';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import sinon from 'sinon';
import stubCalls from '../helpers/stub-calls';

import DS from 'ember-data';

import MegamorphicModel from 'ember-m3/model';
import DefaultSchema from 'ember-m3/services/m3-schema';

const { Serializer } = DS;

module('unit/query-cache', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.sinon = sinon.createSandbox();

    this.owner.register(
      'service:m3-schema',
      class TestSchema extends DefaultSchema {
        includesModel(modelName) {
          return modelName !== 'application';
        }
      }
    );

    this.store = this.owner.lookup('service:store');
    this.adapter = this.store.adapterFor('application');

    this.queryCache = this.store._queryCache;
    this.adapterAjax = this.sinon.stub(this.adapter, 'ajax').returns(resolve());
  }),
    hooks.afterEach(function() {
      this.sinon.restore();
    });

  test('.queryURL uses adapter.ajax to send requests', function(assert) {
    assert.equal(this.adapterAjax.callCount, 0, 'initial callCount 0');

    this.adapterAjax.returns(
      resolve({
        data: {
          id: 1,
          type: 'my-type',
        },
      })
    );

    this.queryCache._buildUrl = this.sinon.stub().returns('/the-url');

    return this.queryCache.queryURL('/uwot').then(() => {
      assert.deepEqual(
        stubCalls(this.queryCache._buildUrl),
        [[this.queryCache + '', ['/uwot']]],
        'adapter.ajax called with right args'
      );

      assert.deepEqual(
        stubCalls(this.adapterAjax),
        [[this.adapter + '', ['/the-url', 'GET', {}]]],
        'adapter.ajax called with right args'
      );
    });
  });

  test('._buildUrl uses the adapter host if no host in the URL', function(assert) {
    this.adapter.host = 'http://library.gg';

    assert.equal(this.queryCache._buildUrl('books/123'), 'http://library.gg/books/123');
    assert.equal(this.queryCache._buildUrl('/books/123'), 'http://library.gg/books/123');

    this.adapter.host = 'http://library.gg:81';

    assert.equal(this.queryCache._buildUrl('books/123'), 'http://library.gg:81/books/123');
    assert.equal(this.queryCache._buildUrl('/books/123'), 'http://library.gg:81/books/123');

    this.adapter.host = 'https://library.gg:81';

    assert.equal(this.queryCache._buildUrl('books/123'), 'https://library.gg:81/books/123');
    assert.equal(this.queryCache._buildUrl('/books/123'), 'https://library.gg:81/books/123');

    this.adapter.host = '//library.gg';

    assert.equal(this.queryCache._buildUrl('books/123'), '//library.gg/books/123');
    assert.equal(this.queryCache._buildUrl('/books/123'), '//library.gg/books/123');

    this.adapter.host = '//library.gg:81';

    assert.equal(this.queryCache._buildUrl('books/123'), '//library.gg:81/books/123');
    assert.equal(this.queryCache._buildUrl('/books/123'), '//library.gg:81/books/123');
  });

  test('._buildUrl ignores adapter host if host is specified', function(assert) {
    this.adapter.host = 'http://foodcourt.gg';

    assert.equal(
      this.queryCache._buildUrl('http://library.gg/books/123'),
      'http://library.gg/books/123'
    );
  });

  test('._buildUrl passes absolute paths through if adapter has no host', function(assert) {
    this.adapter.host = undefined;

    assert.equal(this.queryCache._buildUrl('/books/123'), '/books/123');

    // host: '/' is treated as an empty host by ember data
    this.adapter.host = '/';

    assert.equal(this.queryCache._buildUrl('/books/123'), '/books/123');
  });

  test('._buildUrl uses the adapter namespace if the URL is relative', function(assert) {
    this.adapter.namespace = 'api/v1';

    // ember-data implicitly converts namespaces to absolute paths, so preserve
    // those semantics here
    assert.equal(this.queryCache._buildUrl('books/123'), '/api/v1/books/123');

    this.adapter.namespace = '/api/v1';

    assert.equal(this.queryCache._buildUrl('books/123'), '/api/v1/books/123');
  });

  test('._buildUrl does not include adapter namespace if the path is absolute', function(assert) {
    this.adapter.namespace = '/api/v1';

    assert.equal(this.queryCache._buildUrl('/books/123'), '/books/123');
  });

  test('._buildUrl uses the adapter host and namespace for relative paths', function(assert) {
    this.adapter.host = 'http://library.gg';
    this.adapter.namespace = '/api/v1';

    assert.equal(this.queryCache._buildUrl('books/123'), 'http://library.gg/api/v1/books/123');
    assert.equal(this.queryCache._buildUrl('/books/123'), 'http://library.gg/books/123');
  });

  test('_buildUrl throws for relative paths if no host or namespace is provided', function(assert) {
    this.adapter.host = undefined;
    this.adapter.namespace = undefined;

    assert.throws(() => {
      this.queryCache._buildUrl('books/123');
    }, `store.queryURL('books/123') is invalid.  Absolute paths are required.  Either add a 'host' or 'namespace' property to your -ember-m3 adapter or call 'queryURL' with an absolute path.`);
  });

  test('.queryURL can accept params', function(assert) {
    assert.equal(this.adapterAjax.callCount, 0, 'initial callCount 0');

    this.adapterAjax.returns(
      resolve({
        data: {
          id: 1,
          type: 'my-type',
        },
      })
    );

    return this.queryCache.queryURL('/uwot', { params: { param: 'value' } }).then(() => {
      assert.deepEqual(
        stubCalls(this.adapterAjax),
        [[this.adapter + '', ['/uwot', 'GET', { data: { param: 'value' } }]]],
        'adapter.ajax called with right args'
      );
    });
  });

  test('.queryURL can accept a method', function(assert) {
    assert.equal(this.adapterAjax.callCount, 0, 'initial callCount 0');

    this.adapterAjax.returns(
      resolve({
        data: {
          id: 1,
          type: 'my-type',
        },
      })
    );

    return this.queryCache.queryURL('/uwot', { method: 'POST' }).then(() => {
      assert.deepEqual(
        stubCalls(this.adapterAjax),
        [[this.adapter + '', ['/uwot', 'POST', {}]]],
        'adapter.ajax called with right args'
      );
    });
  });

  test('a custom -ember-m3 adapter can be registered', function(assert) {
    let payload = {
      data: {
        id: 1,
        type: 'my-type',
      },
    };
    let customAdapter = EmberObject.create({
      ajax: this.sinon.stub().returns(resolve(payload)),
      defaultSerializer: '-default',
      toString: () => 'my-adapter',
      destroy() {},
    });
    this.owner.register('adapter:-ember-m3', customAdapter, {
      singleton: true,
      instantiate: false,
    });

    return this.queryCache.queryURL('/uwot').then(() => {
      assert.deepEqual(
        stubCalls(customAdapter.ajax),
        [['my-adapter', ['/uwot', 'GET', {}]]],
        'adapter.ajax called with right args'
      );
    });
  });

  test('a custom -ember-m3 serializer can be registered', function(assert) {
    assert.expect(4);

    let payload = {
      data: {
        id: 1,
        type: 'my-type',
      },
    };
    let customSerializer = EmberObject.create({
      normalizeResponse(store, modelClass, rawPayload, cacheKey, requestType) {
        assert.equal(modelClass, MegamorphicModel, 'model is passed to normalizeResponse');
        assert.deepEqual(rawPayload, payload, 'payload is passed to normalizeResponse');
        assert.strictEqual(cacheKey, null, 'cacheKey is passed to normalizeResponse');
        assert.equal(requestType, 'queryURL', 'requestTypis passss normalizeResponse');

        return payload;
      },
    });

    this.owner.register('serializer:-ember-m3', customSerializer, {
      singleton: true,
      instantiate: false,
    });

    this.adapterAjax.returns(resolve(payload));

    return this.queryCache.queryURL('/uwot');
  });

  test('.queryURL can resolve with individual models', function(assert) {
    let payload = {
      data: {
        id: 1,
        type: 'something-or-other',
        attributes: {},
      },
    };

    this.adapterAjax.returns(resolve(payload));

    return this.queryCache.queryURL('/uwot').then(fulfilledValue => {
      assert.equal(fulfilledValue.constructor, MegamorphicModel);
      assert.equal(fulfilledValue.get('id'), 1);
    });
  });

  test('.queryURL can resolve with a record array of models', function(assert) {
    let payload = {
      data: [
        {
          id: 1,
          type: 'something-or-other',
          attributes: {},
        },
        {
          id: 2,
          type: 'something-or-other',
          attributes: {},
        },
      ],
    };

    this.adapterAjax.returns(resolve(payload));

    return this.queryCache.queryURL('/uwot').then(fulfilledValue => {
      assert.deepEqual(fulfilledValue.toArray().map(x => x.id), ['1', '2']);
    });
  });

  test('.queryURL resolves with record arrays that have unloaded records removed', function(assert) {
    let payload = {
      data: [
        {
          id: 1,
          type: 'something-or-other',
          attributes: {},
        },
        {
          id: 2,
          type: 'something-or-other',
          attributes: {},
        },
      ],
    };

    this.adapterAjax.returns(resolve(payload));

    return this.queryCache
      .queryURL('/uwot')
      .then(fulfilledValue => {
        assert.deepEqual(fulfilledValue.toArray().map(x => x.id), ['1', '2']);

        run(() => fulfilledValue.objectAt(0).unloadRecord());
        assert.deepEqual(fulfilledValue.toArray().map(x => x.id), ['2']);

        let newRecord = this.store.createRecord('something', { id: '3' });
        fulfilledValue.pushObject(newRecord);

        assert.deepEqual(fulfilledValue.toArray().map(x => x.id), ['2', '3']);

        run(() => {
          newRecord.deleteRecord();
          newRecord.unloadRecord();
        });

        return fulfilledValue;
      })
      .then(fulfilledValue => {
        assert.deepEqual(fulfilledValue.toArray().map(x => x.id), ['2']);
      });
  });

  test('.queryURL caches its results when given a cacheKey', function(assert) {
    let firstPayload = {
      data: {
        id: 1,
        type: 'something-or-other',
        attributes: {},
      },
    };
    let secondPayload = {
      data: {
        id: 2,
        type: 'something-or-other',
        attributes: {},
      },
    };
    this.adapterAjax.returns(resolve(firstPayload));

    let options = { cacheKey: 'uwot' };

    return this.queryCache
      .queryURL('/uwot', options)
      .then(model => {
        assert.equal(model.id, 1, 'the returned promise fulfills with the model');
      })
      .then(() => {
        this.adapterAjax.returns(resolve(secondPayload));
        let cachedResult = this.queryCache.queryURL('/uwot', options);
        assert.equal(
          typeof cachedResult.then,
          'function',
          'cached values are returned as thenables'
        );
        return cachedResult;
      })
      .then(model => {
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
      },
    };
    let secondPayload = {
      data: {
        id: 2,
        type: 'something-or-other',
        attributes: {},
      },
    };
    this.adapterAjax.returns(resolve(firstPayload));

    return this.queryCache
      .queryURL('/uwot')
      .then(model => {
        assert.equal(model.id, 1, 'the returned promise fulfills with the model');
      })
      .then(() => {
        this.adapterAjax.returns(resolve(secondPayload));
        return this.queryCache.queryURL('/uwot');
      })
      .then(model => {
        assert.equal(model.id, 2, 'the returned promise fulfills with the model');
        assert.equal(this.adapterAjax.callCount, 2, 'adapter.ajax is called again');
      });
  });

  test('queryURL skips the cache when reload: true', function(assert) {
    let firstPayload = {
      data: {
        id: 1,
        type: 'something-or-other',
        attributes: { name: 'first' },
      },
    };
    let secondPayload = {
      data: {
        id: 2,
        type: 'something-or-other',
        attributes: { name: 'subsequent' },
      },
    };
    this.adapterAjax.returns(resolve(firstPayload));

    let cacheKey = 'uwot';

    return this.queryCache
      .queryURL('/uwot', { cacheKey })
      .then(model => {
        assert.equal(model.id, 1, 'the returned promise fulfills with the model');
        assert.equal(model.get('name'), 'first', 'first value is returned');
      })
      .then(() => {
        this.adapterAjax.returns(resolve(secondPayload));
        return this.queryCache.queryURL('/uwot', { cacheKey, reload: true });
      })
      .then(model => {
        assert.equal(model.id, 2, 'the returned promise fulfills with the model');
        assert.equal(model.get('name'), 'subsequent', 'the second value is returned');
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
      },
    };
    let secondPayload = {
      data: {
        id: 1,
        type: 'something-or-other',
        attributes: {
          name: 'sandy',
        },
      },
    };
    let deferredBackgroundReload = defer();
    this.adapterAjax.returns(resolve(firstPayload));

    let cacheKey = 'uwot';

    return this.queryCache
      .queryURL('/uwot', { cacheKey })
      .then(model => {
        assert.equal(model.get('name'), 'sally', 'the returned promise fulfills with the model');
      })
      .then(() => {
        this.adapterAjax.returns(deferredBackgroundReload.promise);
        return this.queryCache.queryURL('/uwot', {
          cacheKey,
          backgroundReload: true,
        });
      })
      .then(model => {
        assert.equal(
          model.get('name'),
          'sally',
          'the returned promise fulfills with the cached model'
        );
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
      },
    };
    let secondPayload = {
      data: {
        id: 2,
        type: 'my-other-type',
        attributes: {},
      },
    };

    this.adapterAjax.returns(resolve(firstPayload));

    let options = { cacheKey: 'uwot' };

    return this.queryCache
      .queryURL('/uwot', options)
      .then(model => {
        assert.equal(model.id, '1', 'the returned promise fulfills with the model');
        model.unloadRecord();
      })
      .then(() => {
        this.adapterAjax.returns(resolve(secondPayload));
        return this.queryCache.queryURL('/uwot', options);
      })
      .then(model => {
        assert.equal(model.id, '2', 'cache is cleared when model is unloaded');
        assert.equal(this.adapterAjax.callCount, 2, 'adapter.ajax is called again');
      })
      .then(() => {
        return this.queryCache.queryURL('/uwot', options);
      })
      .then(model => {
        assert.equal(model.id, '2', 'cache can be used after being cleared');
        assert.equal(this.adapterAjax.callCount, 2, 'adapter.ajax is not called again');
      });
  });

  test('the cache entry for an array of models is invalidated when any model is unloaded', function(assert) {
    let firstPayload = {
      data: [
        {
          id: 1,
          type: 'my-type',
          attributes: {},
        },
        {
          id: 2,
          type: 'my-type',
          attributes: {},
        },
      ],
    };
    let secondPayload = {
      data: [
        {
          id: 3,
          type: 'my-type',
          attributes: {},
        },
      ],
    };

    this.adapterAjax.returns(resolve(firstPayload));

    let options = { cacheKey: 'uwot' };

    return this.queryCache
      .queryURL('/uwot', options)
      .then(models => {
        assert.deepEqual(
          models.map(x => x.id),
          ['1', '2'],
          'the returned promise fulfills with the models'
        );
        models.objectAt(0).unloadRecord();
      })
      .then(() => {
        this.adapterAjax.returns(resolve(secondPayload));
        return this.queryCache.queryURL('/uwot', options);
      })
      .then(models => {
        assert.deepEqual(
          models.map(x => x.id),
          ['3'],
          'cache is cleared when any member model is unloaded'
        );
        assert.equal(this.adapterAjax.callCount, 2, 'adapter.ajax is called again');
      })
      .then(() => {
        return this.queryCache.queryURL('/uwot', options);
      })
      .then(models => {
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
      },
    };
    let secondPayload = {
      data: {
        id: 2,
        type: 'my-type',
        attributes: {},
      },
    };

    this.adapterAjax.returns(resolve(firstPayload));

    let options = { cacheKey: 'uwot' };
    let siblingOptions = { cacheKey: 'alt-uwot' };

    return this.queryCache
      .queryURL('/uwot', options)
      .then(model => {
        assert.equal(model.id, '1');
        assert.equal(this.adapterAjax.callCount, 1);
        return this.queryCache.queryURL('/alt-uwot', siblingOptions);
      })
      .then(model => {
        assert.equal(model.id, '1');
        assert.equal(this.adapterAjax.callCount, 2);
        // we expect this to invalidate both caches
        model.unloadRecord();

        this.adapterAjax.returns(resolve(secondPayload));

        return this.queryCache.queryURL('/uwot', options);
      })
      .then(model => {
        assert.equal(model.id, '2');
        assert.equal(this.adapterAjax.callCount, 3);

        return this.queryCache.queryURL('/alt-uwot', siblingOptions);
      })
      .then(model => {
        assert.equal(model.id, '2');
        assert.equal(this.adapterAjax.callCount, 4);
      });
  });

  test('the cache entry for a query is invalidated by cacheKey', function(assert) {
    let firstPayload = {
      data: {
        id: 1,
        type: 'my-type',
        attributes: {},
      },
    };

    this.adapterAjax.returns(resolve(firstPayload));

    let cacheKey = 'uwot';
    let options = { cacheKey };

    return this.queryCache.queryURL('/uwot', options).then(() => {
      this.queryCache.unloadURL(cacheKey);

      assert.notOk(this.queryCache.contains(cacheKey));
    });
  });

  test('contains by cacheKey correctly returns true when a query is cached', function(assert) {
    let firstPayload = {
      data: {
        id: 1,
        type: 'my-type',
        attributes: {},
      },
    };

    this.adapterAjax.returns(resolve(firstPayload));

    let cacheKey = 'uwot';
    let options = { cacheKey };

    return this.queryCache.queryURL('/uwot', options).then(() => {
      assert.ok(this.queryCache.contains(cacheKey));
    });
  });

  test('models are removed from results when they are unloaded', function(assert) {
    let firstPayload = {
      data: [
        {
          id: 1,
          type: 'my-type',
          attributes: {},
        },
        {
          id: 2,
          type: 'my-type',
          attributes: {},
        },
      ],
    };

    let secondPayload = {
      data: [
        {
          id: 2,
          type: 'my-type',
          attributes: {},
        },
        {
          id: 3,
          type: 'my-type',
          attributes: {},
        },
      ],
    };

    this.adapterAjax.withArgs('/uwot').returns(resolve(firstPayload));
    this.adapterAjax.withArgs('/okay').returns(resolve(secondPayload));

    return Promise.all([this.queryCache.queryURL('/uwot'), this.queryCache.queryURL('/okay')]).then(
      ([firstResult, secondResult]) => {
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
      }
    );
  });

  test('queryURL returns a record array that can be updated', function(assert) {
    let firstPayload = {
      data: [
        {
          id: 1,
          type: 'my-type',
          attributes: {},
        },
        {
          id: 2,
          type: 'my-type',
          attributes: {},
        },
      ],
    };

    let secondPayload = {
      data: [
        {
          id: 1,
          type: 'my-type',
          attributes: {},
        },
        {
          id: 3,
          type: 'my-type',
          attributes: {},
        },
      ],
    };

    this.adapterAjax.returns(resolve(firstPayload));

    return this.queryCache.queryURL('/ohai').then(models => {
      assert.deepEqual(models.toArray().map(x => x.id), ['1', '2'], 'models are initially correct');

      this.adapterAjax.returns(resolve(secondPayload));

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
      data: [
        {
          id: 1,
          type: 'my-type',
          attributes: {},
        },
        {
          id: 2,
          type: 'my-type',
          attributes: {},
        },
      ],
    };

    this.adapterAjax.returns(resolve(payload));
    return this.queryCache
      .queryURL('/ohai', { method: 'POST', params: { q: 'v' } })
      .then(models => models.update())
      .then(() => {
        assert.deepEqual(
          stubCalls(this.adapterAjax),
          [
            [this.adapter + '', ['/ohai', 'POST', { data: { q: 'v' } }]],
            [this.adapter + '', ['/ohai', 'POST', { data: { q: 'v' } }]],
          ],
          'adapter.ajax called with right args'
        );
      });
  });

  test('queryURL goes through a serializer to normalize responses', function(assert) {
    let payload = {
      name: 'name name?',
      wat: 'definitely',
    };

    this.owner.register(
      'serializer:application',
      Serializer.extend({
        normalizeResponse(store, modelClass, payload /*, id, requestType */) {
          return {
            data: {
              id: 1,
              type: 'my-type',
              attributes: payload,
            },
          };
        },
      })
    );

    this.adapterAjax.returns(resolve(payload));
    return this.queryCache.queryURL('/hello').then(model => {
      assert.equal(model.get('name'), 'name name?');
      assert.equal(model.get('wat'), 'definitely');
    });
  });

  test('queryURL batch requests to same cacheKey', function(assert) {
    let payload = {
      data: [
        {
          id: 2,
          type: 'my-type',
          attributes: {},
        },
        {
          id: 3,
          type: 'my-type',
          attributes: {},
        },
      ],
    };
    let cacheKey = 'uwot';
    let options = { cacheKey };

    this.adapterAjax.returns(resolve(payload));
    let promise1 = this.queryCache.queryURL('/uwot', options);
    // second call to `queryURL` before the first request finishes
    let promise2 = this.queryCache.queryURL('/uwot', options);
    assert.equal(promise1, promise2);
  });

  test('.queryURL uses queryURL adapter hook if available', function(assert) {
    let params = { param: 'paramValue' };

    this.adapter.queryURL = this.sinon.stub().returns(
      resolve({
        data: {
          id: '1',
          type: 'something-or-other',
          attributes: {},
        },
      })
    );

    // add cacheKey to confirm only select options are passed down
    let options = { cacheKey: 'cached-value', params };

    this.adapter.namespace = 'ns';
    return this.queryCache.queryURL('test-url', options).then(() => {
      assert.deepEqual(
        stubCalls(this.adapter.queryURL),
        [[this.adapter + '', ['/ns/test-url', 'GET', { params }]]],
        'adapter.queryURL is called'
      );
      assert.equal(this.adapterAjax.called, false, '`adapter.ajax` is not called');
    });
  });

  test('.cacheURL inserts consistently inserts a promise into cache', function(assert) {
    assert.expect(3);
    const mockResult = { id: 1, foo: 'bar' };

    this.queryCache.cacheURL('foo-bar', mockResult);
    const cachedResult = this.queryCache.queryURL('/foo-bar', { cacheKey: 'foo-bar' });

    assert.ok(cachedResult && cachedResult.then, 'cachedResult is a promise');

    return cachedResult.then(result => {
      assert.equal(this.adapterAjax.callCount, 0, 'adapter.ajax is never called');
      assert.deepEqual(mockResult, result, 'queryURL returned cached result');
    });
  });

  test('.cacheURL supports unloading of models and invalidates cache', function(assert) {
    assert.expect(2);

    let firstPayload = {
      data: {
        id: 1,
        type: 'uw0tm8',
        attributes: {},
      },
    };

    let secondPayload = {
      data: {
        id: 2,
        type: 'my-other-type',
        attributes: {},
      },
    };

    this.adapterAjax.returns(resolve(firstPayload));

    return this.queryCache
      .queryURL('/foo-bar', { cacheKey: 'foo-bar' })
      .then(model => {
        assert.equal(model.id, '1', 'Sanity check to ensure id is what we expected');
        this.queryCache.cacheURL('bar', model);
        this.adapterAjax.returns(resolve(secondPayload));
        model.unloadRecord();
      })
      .then(() => this.queryCache.queryURL('/foo-bar', { cacheKey: 'bar' }))
      .then(model => {
        assert.equal(model.id, '2', 'unloadRecord clears the entry for entry of cacheURL');
      });
  });

  test('queryURL evicts cache if the request rejects', function(assert) {
    assert.expect(1);

    let cacheKey = 'uwot';
    let options = { cacheKey };

    this.adapterAjax.returns(reject(new Error('An error occurred.')));

    return this.queryCache.queryURL('/uwot', options).catch(() => {
      assert.notOk(this.queryCache.contains(cacheKey));
    });
  });
});
