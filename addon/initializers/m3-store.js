import DS from 'ember-data';
import DebugAdapter from '../adapters/debug-adapter';
import { inject } from '@ember/service';
import { get } from '@ember/object';
import { IS_RECORD_DATA, gte } from 'ember-compatibility-helpers';
import M3RecordData from '../record-data';
import MegamorphicModelFactory from '../factory';
import QueryCache from '../query-cache';
import { flushChanges } from '../utils/notify-changes';
import { dasherize } from '@ember/string';
import { getOwner } from '@ember/application';
import seenTypesPerStore from '../utils/seen-types-per-store';
import { next } from '@ember/runloop';

const STORE_OVERRIDES = {
  _schemaManager: inject('m3-schema-manager'),

  init() {
    this._super(...arguments);
    this._queryCache = new QueryCache({ store: this });
    this._globalM3Cache = new Object(null);
    seenTypesPerStore.set(this, new Set());

    if (gte('ember-data', '3.12.0-alpha.0')) {
      this._modifiedInternalModelMapProto = undefined;
    }
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

  /**
   * A thin wrapper around the API response that knows how to look up references
   *
   * @param {string} url The URL path to query
   * @param {Object} options
   * @param {string} [options.method=GET] The HTTP method to use
   * @param {Object} [options.params] The parameters to include
   * @param {string} [options.cacheKey] A string to uniquely identify this request
   * @param {boolean} [options.reload=false] If true, issue a request even a cached value exists
   * @param {boolean} [options.backgroundReload=false] If true and a cached value exists,
   * issue a non-blocking request but immediately fulfill with the cached value
   * @returns {Promise<M3RecordData|RecordArray,Error>} Promise for loading `url` that fulfills to
   * an `M3RecordData` if the response is a single resource or a `RecordArray` of `M3RecordData`s
   * if the response is an array of resources
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

  // override _push to batch change notifications which we're obliged to do
  // since all our properties are treated as volatiles as they come from
  // `unknownProperty`
  _push(jsonApiDoc) {
    let result = this._super(jsonApiDoc);
    flushChanges(this);
    return result;
  },

  // These two hooks are used for the secondary cache
  // TODO: make secondary caches possible via public API

  _pushInternalModel(jsonAPIResource) {
    let internalModel = this._super(jsonAPIResource);
    let schemaManager = get(this, '_schemaManager');
    let { type } = jsonAPIResource;
    if (schemaManager.includesModel(type)) {
      let baseName = schemaManager.computeBaseModelName(dasherize(type));
      if (baseName === null || baseName === undefined) {
        // only populate base records in the global cache
        this._globalM3Cache[internalModel.id] = internalModel;
      }
    }

    if (gte('ember-data', '3.12.0-alpha.0')) {
      if (this._modifiedInternalModelMapProto === undefined) {
        let store = this;
        // set this up for removals
        let proto = (this._modifiedInternalModelMapProto = Object.getPrototypeOf(
          this._internalModelsFor(self.modelName)
        ));

        let originalRemove = proto.remove;
        proto.__originalRemove = originalRemove;
        proto.remove = function remove(internalModel) {
          delete store._globalM3Cache[internalModel.id];
          return originalRemove.apply(this, arguments);
        };
        this._internalModelMapModified = true;
      }
    }

    return internalModel;
  },

  willDestroy() {
    if (gte('ember-data', '3.12.0-alpha.0')) {
      if (this._modifiedInternalModelMapProto !== undefined) {
        let proto = this._modifiedInternalModelMapProto;
        proto.remove = proto.__originalRemove;
        this._modifiedInternalModelMapProto = undefined;
      }
    }
    return this._super();
  },
};

if (!gte('ember-data', '3.12.0-alpha.0')) {
  STORE_OVERRIDES._removeFromIdMap = function _removeFromIdMap(internalModel) {
    delete this._globalM3Cache[internalModel.id];
    return this._super(internalModel);
  };
}

function createRecordDataFor(modelName, id, clientId, storeWrapper) {
  let schemaManager = get(this, '_schemaManager');
  if (schemaManager.includesModel(modelName)) {
    seenTypesPerStore.get(this).add(modelName);

    if (get(schemaManager, 'schema').watchModelTypes) {
      next(() => {
        // We need this to execute in the next task queue so that wrapRecord is not called
        // before the M3RecordData is created
        getOwner(this)
          .lookup('data-adapter:main')
          .addedType(modelName);
      });
    }
    return new M3RecordData(modelName, id, clientId, storeWrapper, schemaManager, null, null);
  }

  return this._super(modelName, id, clientId, storeWrapper);
}

if (IS_RECORD_DATA) {
  STORE_OVERRIDES.createRecordDataFor = createRecordDataFor;
} else {
  STORE_OVERRIDES.createModelDataFor = createRecordDataFor;
}

extendStore(DS.Store);

/**
 * @param {DS.Store} Store ember-data Store to be extended
 */
export function extendStore(Store) {
  Store.reopen(STORE_OVERRIDES);
}

/*
 Configures a registry with injections on Ember applications
 for the m3 store. Accepts an optional namespace argument.

 @method initializeDebugAdapter
 @param {Ember.Registry} registry
 */
function initializeDebugAdapter(registry) {
  registry.register('data-adapter:main', DebugAdapter);
}

export function initialize(application) {
  initializeDebugAdapter(application);
}

export default {
  name: 'm3-store',
  initialize,
};
