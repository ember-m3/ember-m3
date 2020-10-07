import BaseRecordArray from './base-record-array';

export default class QueryArray extends BaseRecordArray {
  init(options = {}) {
    super.init(options, ...arguments);

    this.isLoaded = true;
    this.isUpdating = false;
    this._updatingPromise = null;
  }

  update() {
    if (this.isUpdating) {
      return this._updatingPromise;
    }

    this.setProperties({
      isLoaded: false,
      isUpdating: true,
    });

    this._updatingPromise = this._update().finally(() => {
      this._updatingPromise = null;
      if (this.isDestroying || this.isDestroyed) {
        return;
      }
      this.setProperties({
        isLoaded: true,
        isUpdating: false,
      });
    });

    return this._updatingPromise;
  }

  _update() {
    if (!this.query) {
      throw new Error(`QueryArray requires a query property`);
    }

    let { url, params, method, cacheKey } = this.query;

    return this.queryCache.queryURL(url, { params, method, cacheKey }, this);
  }
}
