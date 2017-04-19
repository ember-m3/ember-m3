export default class QueryCache {
  constructor({ store }) {
    this._store = store;
    this.__adapter = null;
  }

  queryURL(url, params={}, { cacheKey=null }) {
    let method = params.method || 'GET';
  }

  get _adapter() {
    return this.__adapter || (this.__adapter = this._store.adapterFor('-ember-m3'));
  }
}
