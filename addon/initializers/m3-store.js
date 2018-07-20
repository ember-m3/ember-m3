import DS from 'ember-data';
import DataAdapter from '@ember/debug/data-adapter';
import { inject } from '@ember/service';
import { get } from '@ember/object';

import MegamorphicModel from '../model';
import M3ModelData from '../model-data';
import MegamorphicModelFactory from '../factory';
import QueryCache from '../query-cache';

extendStore(DS.Store);
extendDataAdapter(DataAdapter);

/**
 * @param {DS.Store} Store ember-data Store to be extended
 */
export function extendStore(Store) {
  Store.reopen({
    _schemaManager: inject('m3-schema-manager'),

    init() {
      this._super(...arguments);
      this._queryCache = new QueryCache({ store: this });
      this._globalM3Cache = new Object(null);
    },

    // Store hooks necessary for using a single model class

    _hasModelFor(modelName) {
      return get(this, '_schemaManager').includesModel(modelName) || this._super(modelName);
    },

    _modelFactoryFor(modelName) {
      if (get(this, '_schemaManager').includesModel(modelName)) {
        return MegamorphicModelFactory;
      }
      return this._super(modelName);
    },

    adapterFor(modelName) {
      if (get(this, '_schemaManager').includesModel(modelName)) {
        return this._super('-ember-m3');
      }
      return this._super(modelName);
    },

    serializerFor(modelName) {
      if (get(this, '_schemaManager').includesModel(modelName)) {
        return this._super('-ember-m3');
      }
      return this._super(modelName);
    },

    createModelDataFor(modelName, id, clientId, storeWrapper) {
      let schemaManager = get(this, '_schemaManager');
      if (schemaManager.includesModel(modelName)) {
        return new M3ModelData(modelName, id, clientId, storeWrapper, schemaManager, null, null);
      }
      return this._super(modelName, id, clientId, storeWrapper);
    },

    /**
     * A thin wrapper around the API response that knows how to look up relationships.
     *
     * @param {string} url The URL path to query.
     * @param {Object} options
     * @param {string} [options.method=GET] The HTTP method to use.
     * @param {Object} [options.params] The parameters to include
     * @param {string} [options.cacheKey] A string to uniquely identify this request.
     * @param {boolean} [options.reload=false]
     * @param {boolean} [options.backgroundReload=false]
     * @returns {Promise}
     */
    queryURL(url, options) {
      return this._queryCache.queryURL(url, options);
    },

    cacheURL(cacheKey, result) {
      return this._queryCache.cacheURL(cacheKey, result);
    },

    /**
     * Manually unload the cached response identified by cacheKey
     *
     * @param {string} cacheKey
     * @returns
     */
    unloadURL(cacheKey) {
      return this._queryCache.unloadURL(cacheKey);
    },

    /**
     * Check existence of the cachedKey in cache
     *
     * @param {string} cacheKey
     * @returns {boolean}
     */
    containsURL(cacheKey) {
      return this._queryCache.contains(cacheKey);
    },

    // These two hooks are used for the secondary cache
    // TODO: make secondary caches possible via public API

    _pushInternalModel(jsonAPIResource) {
      let internalModel = this._super(jsonAPIResource);
      if (get(this, '_schemaManager').includesModel(jsonAPIResource.type)) {
        this._globalM3Cache[internalModel.id] = internalModel;
      }
      return internalModel;
    },

    _removeFromIdMap(internalModel) {
      delete this._globalM3Cache[internalModel.id];
      return this._super(internalModel);
    },
  });
}

/**
 * @param {DataAdapter} DataAdapter
 */
export function extendDataAdapter(DataAdapter) {
  DataAdapter.reopen({
    _schemaManager: inject('m3-schema-manager'),

    getModelTypes() {
      return this._super(...arguments).concat({
        klass: MegamorphicModel,
        name: '-ember-m3',
      });
    },

    _nameToClass(modelName) {
      if (get(this, '_schemaManager').includesModel(modelName)) {
        return MegamorphicModel;
      }
      return this._super(...arguments);
    },
  });
}

export function initialize() {}

export default {
  name: 'm3-store',
  initialize,
};
