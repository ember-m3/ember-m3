export default class QueryCache {
  constructor({ store }) {
    this._store = store;
    this._queryCache = new Object(null);
    this._reverseQueryCache = new Object(null);
    this.__adapter = null;
  }

  queryURL(url, { params=null, method='GET', cacheKey=null }={}) {
    let options = {};
    if (params) {
      options.data = params;
    }

    let cachedValue;
    if (cacheKey && (cachedValue = this._queryCache[cacheKey]) !== undefined) {
      return cachedValue;
    }

    return this._adapter.ajax(
      url,
      method,
      options
    ).then(payload => {
      let result = this._store.push(payload)
      if (cacheKey) {
        this._addResultToCache(result, cacheKey);
      }
      return result;
    });
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

  _addResultToCache(result, cacheKey) {
    this._queryCache[cacheKey] = result;

    if (Array.isArray(result)) {
      for (let i=0; i<result.length; ++i) {
        this._addRecordToReverseCache(result[i], cacheKey);
      }
    } else {
      this._addRecordToReverseCache(result, cacheKey);
    }
  }

  _addRecordToReverseCache(record, cacheKey) {
    let { id } = record;
    let cacheKeys = this._reverseQueryCache[id] = this._reverseQueryCache[id] || [];
    // no need to check for presence as we're only here b/c of a cache miss
    cacheKeys.push(cacheKey);
  }

  get _adapter() {
    return this.__adapter || (this.__adapter = this._store.adapterFor('-ember-m3'));
  }
}
