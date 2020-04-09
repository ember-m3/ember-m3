import { inject } from '@ember/service';
import { get } from '@ember/object';
import M3RecordData from '../record-data';
import MegamorphicModelFactory from '../factory';
import QueryCache from '../query-cache';
import { flushChanges } from '../utils/notify-changes';
import { dasherize } from '@ember/string';
import { getOwner } from '@ember/application';
import seenTypesPerStore from '../utils/seen-types-per-store';
import { next } from '@ember/runloop';
import { assign, merge } from '@ember/polyfills';
import { CUSTOM_MODEL_CLASS } from 'ember-m3/-infra/features';
import { HAS_EMBER_DATA_PACKAGE } from 'ember-m3/-infra/packages';
import { GTE_VERSION_3_12, IS_RECORD_DATA } from 'ember-m3/-infra/versions';
import MegamorphicModel from '../model';
import require from 'require';

const emberAssign = assign || merge;

export const recordDataToRecordMap = new WeakMap();
export const recordDataToQueryCache = new WeakMap();
export const recordToRecordArrayMap = new WeakMap();

function internalModelFactoryRemoveMonkeyPatch(internalModel) {
  if (typeof internalModel.store._globalM3Cache !== 'undefined') {
    delete internalModel.store._globalM3Cache[internalModel.id];
  }

  return this.__originalRemove.apply(this, arguments);
}

let internalModelFactoryRemoveMonkeyPatched = false;

class SchemaDefinition {
  constructor(store, dsModelSchema) {
    this.store = store;
    this.dsModelSchema = dsModelSchema;
    this._internalModelMapModified = false;
  }
  attributesDefinitionFor(identifier) {
    let modelName;
    if (identifier.type) {
      modelName = identifier.type;
    } else {
      modelName = identifier;
    }
    if (get(this.store, '_schemaManager').includesModel(modelName)) {
      if (identifier) {
        return this.store.recordDataFor(identifier).attributesDefinition();
      } else {
        return {};
      }
    }
    return this.dsModelSchema.attributesDefinitionFor(modelName);
  }
  relationshipsDefinitionFor(identifier) {
    let modelName;
    if (identifier.type) {
      modelName = identifier.type;
    } else {
      modelName = identifier;
    }
    if (get(this.store, '_schemaManager').includesModel(modelName)) {
      return Object.create(null);
    }
    return this.dsModelSchema.relationshipsDefinitionFor(modelName);
  }
  doesTypeExist(modelName) {
    if (get(this.store, '_schemaManager').includesModel(modelName)) {
      return true;
    }
    return this.dsModelSchema.doesTypeExist(modelName);
  }
}

const StoreMixin = {
  _schemaManager: inject('m3-schema-manager'),

  init() {
    this._super(...arguments);
    this._queryCache = new QueryCache({ store: this });
    seenTypesPerStore.set(this, new Set());

    if (GTE_VERSION_3_12) {
      this._modifiedInternalModelMapProto = undefined;
    }
    if (CUSTOM_MODEL_CLASS) {
      this._globalM3RecordDataCache = new Object(null);
      this._recordDataToRecordMap = recordDataToRecordMap;
      let defaultSchema = this.getSchemaDefinitionService();
      this.registerSchemaDefinitionService(new SchemaDefinition(this, defaultSchema));
    } else {
      this._globalM3Cache = new Object(null);
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

  instantiateRecord(identifier, createRecordArgs, recordDataFor, notificationManager) {
    let recordData = recordDataFor(identifier);
    recordDataToQueryCache.set(recordData, this._queryCache);
    let modelName = identifier.type;
    if (get(this, '_schemaManager').includesModel(modelName)) {
      let createOptions = emberAssign({ _recordData: recordData, store: this }, createRecordArgs);
      // TODO remove the megamorphicModelFactory
      let record = MegamorphicModelFactory.create(createOptions);
      notificationManager.subscribe(identifier, (identifier, value) => {
        if (value === 'state') {
          record.notifyPropertyChange('isNew');
          record.notifyPropertyChange('isDeleted');
        } else if (value === 'identity') {
          record.notifyPropertyChange('id');
        }
      });
      record._setIdentifier(identifier);
      return record;
    }
    return this._super(...arguments);
  },

  teardownRecord(record) {
    if (!(record instanceof MegamorphicModel)) {
      let recordArrays = recordToRecordArrayMap.get(record);
      if (recordArrays) {
        recordArrays.forEach(recordArray => recordArray._removeObject(record));
      }
    }
    return this._super(record);
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
   * @param {Object} [options.adapterOptions] The custom options to pass along to the `queryURL` function on the adapter
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
    if (CUSTOM_MODEL_CLASS) {
      return this._super(jsonAPIResource);
    } else {
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

      if (GTE_VERSION_3_12) {
        if (internalModelFactoryRemoveMonkeyPatched === false) {
          // set this up for removals
          let internalModelFactory = this._internalModelsFor(internalModel.modelName);
          let modelFactoryPrototype = Object.getPrototypeOf(internalModelFactory);

          if (modelFactoryPrototype.remove !== internalModelFactoryRemoveMonkeyPatch) {
            modelFactoryPrototype.__originalRemove = modelFactoryPrototype.remove;
            modelFactoryPrototype.remove = internalModelFactoryRemoveMonkeyPatch;

            internalModelFactoryRemoveMonkeyPatched = true;
          }
        }
      }

      return internalModel;
    }
  },
};

if (!GTE_VERSION_3_12) {
  StoreMixin._removeFromIdMap = function _removeFromIdMap(internalModel) {
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
    return new M3RecordData(
      modelName,
      id,
      clientId,
      storeWrapper,
      schemaManager,
      null,
      null,
      this._globalM3RecordDataCache
    );
  }

  if (HAS_EMBER_DATA_PACKAGE) {
    return this._super(modelName, id, clientId, storeWrapper);
  }
}

if (IS_RECORD_DATA) {
  StoreMixin.createRecordDataFor = createRecordDataFor;
} else {
  StoreMixin.createModelDataFor = createRecordDataFor;
}

if (HAS_EMBER_DATA_PACKAGE) {
  const Store = require('ember-data/store').default;
  extendStore(Store);
}

/**
 * @param {DS.Store} Store ember-data Store to be extended
 */
export function extendStore(Store) {
  Store.reopen(StoreMixin);
}

export default StoreMixin;
