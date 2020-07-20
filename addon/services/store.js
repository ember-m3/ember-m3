import Store from '@ember-data/store';
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
import { HAS_RECORD_DATA_PACKAGE } from 'ember-m3/-infra/packages';
import {
  recordDataToRecordMap,
  recordDataToQueryCache,
  recordToRecordArrayMap,
} from '../utils/caches';

const emberAssign = assign || merge;

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

export default class M3Store extends Store {
  @inject('m3-schema-manager') _schemaManager;

  init() {
    super.init(...arguments);
    this._queryCache = new QueryCache({ store: this });
    seenTypesPerStore.set(this, new Set());

    this._modifiedInternalModelMapProto = undefined;
    if (CUSTOM_MODEL_CLASS) {
      this._globalM3RecordDataCache = new Object(null);
      this._recordDataToRecordMap = recordDataToRecordMap;
      let defaultSchema = this.getSchemaDefinitionService();
      this.registerSchemaDefinitionService(new SchemaDefinition(this, defaultSchema));
    } else {
      this._globalM3Cache = new Object(null);
    }
  }

  createRecordDataFor(modelName, id, clientId, storeWrapper) {
    let schemaManager = get(this, '_schemaManager');
    if (schemaManager.includesModel(modelName)) {
      seenTypesPerStore.get(this).add(modelName);

      if (get(schemaManager, 'schema').watchModelTypes) {
        next(() => {
          // We need this to execute in the next task queue so that wrapRecord is not called
          // before the M3RecordData is created
          getOwner(this).lookup('data-adapter:main').addedType(modelName);
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

    // TODO: what is the purpose of this check?
    if (HAS_RECORD_DATA_PACKAGE) {
      return super.createRecordDataFor(modelName, id, clientId, storeWrapper);
    }
  }

  // Store hooks necessary for using a single model class
  _hasModelFor(modelName) {
    return get(this, '_schemaManager').includesModel(modelName) || super._hasModelFor(modelName);
  }

  _modelFactoryFor(modelName) {
    if (get(this, '_schemaManager').includesModel(modelName)) {
      return MegamorphicModelFactory;
    }
    return super._modelFactoryFor(modelName);
  }

  adapterFor(modelName) {
    if (get(this, '_schemaManager').includesModel(modelName)) {
      return super.adapterFor('-ember-m3');
    }
    return super.adapterFor(modelName);
  }

  serializerFor(modelName) {
    if (get(this, '_schemaManager').includesModel(modelName)) {
      return super.serializerFor('-ember-m3');
    }
    return super.serializerFor(modelName);
  }

  instantiateRecord(identifier, createRecordArgs, recordDataFor, notificationManager) {
    let recordData = recordDataFor(identifier);
    recordDataToQueryCache.set(recordData, this._queryCache);
    let modelName = identifier.type;
    if (get(this, '_schemaManager').includesModel(modelName)) {
      let createOptions = emberAssign({ _recordData: recordData, store: this }, createRecordArgs);
      // TODO remove the megamorphicModelFactory
      let record = MegamorphicModelFactory.create(createOptions);
      notificationManager.subscribe(identifier, (_identifier, value) => {
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
    return super.instantiateRecord(...arguments);
  }

  teardownRecord(record) {
    if (!(record instanceof MegamorphicModelFactory.class)) {
      let recordArrays = recordToRecordArrayMap.get(record);
      if (recordArrays) {
        recordArrays.forEach((recordArray) => recordArray._removeObject(record));
      }
    }
    return super.teardownRecord(record);
  }

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
  }

  cacheURL(cacheKey, result) {
    return this._queryCache.cacheURL(cacheKey, result);
  }

  /**
   * Manually unload the cached response identified by cacheKey
   *
   * @param {string} cacheKey
   * @returns
   */
  unloadURL(cacheKey) {
    return this._queryCache.unloadURL(cacheKey);
  }

  /**
   * Check existence of the cachedKey in cache
   *
   * @param {string} cacheKey
   * @returns {boolean}
   */
  containsURL(cacheKey) {
    return this._queryCache.contains(cacheKey);
  }

  // override _push to batch change notifications which we're obliged to do
  // since all our properties are treated as volatiles as they come from
  // `unknownProperty`
  _push(jsonApiDoc) {
    let result = super._push(jsonApiDoc);
    flushChanges(this);
    return result;
  }

  // These two hooks are used for the secondary cache
  // TODO: make secondary caches possible via public API

  _pushInternalModel(jsonAPIResource) {
    if (CUSTOM_MODEL_CLASS) {
      return super._pushInternalModel(jsonAPIResource);
    } else {
      let internalModel = super._pushInternalModel(jsonAPIResource);
      let schemaManager = get(this, '_schemaManager');
      let { type } = jsonAPIResource;
      if (schemaManager.includesModel(type)) {
        let baseName = schemaManager.computeBaseModelName(dasherize(type));
        if (baseName === null || baseName === undefined) {
          // only populate base records in the global cache
          this._globalM3Cache[internalModel.id] = internalModel;
        }
      }

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

      return internalModel;
    }
  }
}
