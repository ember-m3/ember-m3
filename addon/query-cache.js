import Ember from 'ember';

import MegamorphicModel from './model';
import QueryCachePopulatedRecordArray from './query-cache-populated-record-array';

export default class QueryCache {
  constructor({ store }) {
    this._store = store;
    this._recordArrayManager = this._store.recordArrayManager;
    this._queryCache = new Object(null);
    this._reverseQueryCache = new Object(null);
    this.__adapter = null;
  }

  queryURL(url, { params=null, method='GET', cacheKey=null, reload=false, backgroundReload=false }={}, array) {
    let options = {};
    if (params) {
      options.data = params;
    }

    let cachedValue = cacheKey ? this._queryCache[cacheKey] : undefined;
    let loadPromise;

    if (backgroundReload || reload || cachedValue === undefined) {
      loadPromise = this._adapter.ajax(
        url,
        method,
        options
      ).then(rawPayload => {
        let serializer = this._store.serializerFor('-ember-m3');
        let payload = serializer.normalizeResponse(this._store, MegamorphicModel, rawPayload, cacheKey, 'query-url');
        let result = this._createResult(payload, { url, params, method, cacheKey }, array);

        if (cacheKey) {
          this._addResultToCache(result, cacheKey);
        }
        return result;
      });
      // TODO: .catch ?
    }

    if (reload || cachedValue === undefined) {
      return loadPromise;
    } else {
      // TODO: resolve cachedvalue
      return cachedValue;
    }
  }

  unloadRecord(record) {
    let { id } = record;
    let matchingQueryCacheKeys = this._reverseQueryCache[id];
    if (!matchingQueryCacheKeys) { return; }

    for (let i=0; i<matchingQueryCacheKeys.length; ++i) {
      let invalidatedCacheKey = matchingQueryCacheKeys[i];
      delete this._queryCache[invalidatedCacheKey];
    }
    delete this._reverseQueryCache[id];
  }

  _createResult(payload, query, array) {
    let internalModelOrModels = this._store._push(payload);

    if (array) {
      array._setInternalModels(internalModelOrModels);
      return array;
    } else if (Array.isArray(internalModelOrModels)) {
      return this._createRecordArray(internalModelOrModels, query);
    } else {
      return internalModelOrModels.getRecord();
    }
  }

  _addResultToCache(result, cacheKey) {
    this._queryCache[cacheKey] = result;

    if (result.constructor === QueryCachePopulatedRecordArray) {
      for (let i=0; i<result.content.length; ++i) {
        this._addRecordToReverseCache(result.content[i], cacheKey);
      }
    } else {
      this._addRecordToReverseCache(result, cacheKey);
    }
  }

  _addRecordToReverseCache({ id }, cacheKey) {
    let cacheKeys = this._reverseQueryCache[id] = this._reverseQueryCache[id] || [];
    // no need to check for presence as we're only here b/c of a cache miss
    cacheKeys.push(cacheKey);
  }

  _createRecordArray(internalModels, query) {
    let array = QueryCachePopulatedRecordArray.create({
      modelName: '-ember-m3',
      content: Ember.A(),
      store: this._store,
      manager: this._recordArrayManager,

      queryCache: this,
      query,
    });

    array._setInternalModels(internalModels);

    this._recordArrayManager._adapterPopulatedRecordArrays.push(array);

    return array;
  }

  get _adapter() {
    return this.__adapter || (this.__adapter = this._store.adapterFor('-ember-m3'));
  }
}
