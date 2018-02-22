import { get } from '@ember/object';
import { A } from '@ember/array';
import { resolve } from 'rsvp';

import MegamorphicModel from './model';
import M3RecordArray from './record-array';

function stripSlash(str, stripLeading, stripTrailing) {
  let startSlash = stripLeading && str.charAt(0) === '/';
  let endSlash = stripTrailing && str.charAt(str.length - 1) === '/';
  return str.slice(startSlash ? 1 : 0, endSlash ? -1 : str.length);
}

export default class QueryCache {
  constructor({ store }) {
    this._store = store;
    this._recordArrayManager = this._store.recordArrayManager;
    this._queryCache = new Object(null);
    this._reverseQueryCache = new Object(null);
    this.__adapter = null;
  }

  queryURL(
    url,
    {
      params = null,
      method = 'GET',
      cacheKey = null,
      reload = false,
      backgroundReload = false,
    } = {},
    array
  ) {
    let options = {};
    if (params) {
      options.data = params;
    }

    let cachedValue = cacheKey ? this._queryCache[cacheKey] : undefined;
    let adapterUrl = this._buildUrl(url);
    let loadPromise;

    if (backgroundReload || reload || cachedValue === undefined) {
      loadPromise = this._adapter.ajax(adapterUrl, method, options).then(rawPayload => {
        let serializer = this._store.serializerFor('-ember-m3');
        let payload = serializer.normalizeResponse(
          this._store,
          MegamorphicModel,
          rawPayload,
          cacheKey,
          'query-url'
        );
        let result = this._createResult(payload, { url, params, method, cacheKey }, array);

        if (cacheKey) {
          this._addResultToCache(result, cacheKey);
        }
        return result;
      });
    }

    if (reload || cachedValue === undefined) {
      return loadPromise;
    } else {
      return resolve(cachedValue);
    }
  }

  unloadRecord(record) {
    let { id } = record;
    let matchingQueryCacheKeys = this._reverseQueryCache[id];
    if (!matchingQueryCacheKeys) {
      return;
    }

    for (let i = 0; i < matchingQueryCacheKeys.length; ++i) {
      let invalidatedCacheKey = matchingQueryCacheKeys[i];
      delete this._queryCache[invalidatedCacheKey];
    }
    delete this._reverseQueryCache[id];
  }

  unloadURL(cacheKey) {
    delete this._queryCache[cacheKey];
  }

  contains(cacheKey) {
    return !!this._queryCache[cacheKey];
  }

  _buildUrl(url) {
    let parts = [];

    let needsHost = false;
    let needsNamespace = false;
    let host;
    let namespace;

    // add a hoost if we need to, ie if
    //  1. no host is present in url and
    //  2. a host is specified on the adapter
    if (/^\/\//.test(url) || /http(s)?:\/\//.test(url)) {
      needsHost = false;
      needsNamespace = false;
    } else {
      needsHost = true;
      needsNamespace = !(url.charAt(0) === '/');
    }

    if (needsHost) {
      host = stripSlash(get(this._adapter, 'host') || '', false, true);
      if (host.length > 0) {
        parts.push(host);
      }
    }

    if (needsNamespace) {
      // if we have a host we'll get '/' from joining, otherwise if we're
      // producing only a path respect whatever the namespace is configured as
      let stripLeadingSlash = parts.length > 0;
      namespace = stripSlash(get(this._adapter, 'namespace') || '', stripLeadingSlash, true);
      if (namespace.length > 0) {
        parts.push(namespace);
      }
    }

    if (parts.length > 0) {
      parts.push(stripSlash(url, true, true));
      url = parts.join('/');
    }

    if (needsHost && !host && url.charAt(0) !== '/') {
      if (needsNamespace && namespace) {
        // relative namespaces are implicitly converted to absolute, as with
        // ember data.
        //
        // namespace: 'library'
        // queryURL('books/1')
        // => '/library/books/1'
        url = `/${url}`;
      } else {
        // With no host, no namespace and a relative url we don't know what
        // request to make.  We could just make a relative request but then it
        // will resolved relative to either the base href (if a BASE tag is
        // present) or the current `location.pathname`
        throw new Error(
          `store.queryURL('${url}') is invalid.  Absolute paths are required.  Either add a 'host' or 'namespace' property to your -ember-m3 adapter or call 'queryURL' with an absolute path.`
        );
      }
    }
    return url;
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

    if (result.constructor === M3RecordArray) {
      for (let i = 0; i < result.content.length; ++i) {
        this._addRecordToReverseCache(result.content[i], cacheKey);
      }
    } else {
      this._addRecordToReverseCache(result, cacheKey);
    }
  }

  _addRecordToReverseCache({ id }, cacheKey) {
    let cacheKeys = (this._reverseQueryCache[id] = this._reverseQueryCache[id] || []);
    // no need to check for presence as we're only here b/c of a cache miss
    cacheKeys.push(cacheKey);
  }

  _createRecordArray(internalModels, query) {
    let array = M3RecordArray.create({
      modelName: '-ember-m3',
      content: A(),
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

  toString() {
    return 'QueryCache';
  }
}
