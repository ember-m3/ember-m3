import Ember from 'ember';
import DS from 'ember-data';
import { dasherize } from '@ember/string';

import MegamorphicModel from '../model';
import M3ModelData from '../model-data';
import MegamorphicModelFactory from '../factory';
import SchemaManager from '../schema-manager';
import QueryCache from '../query-cache';

extendStore(DS.Store);
extendDataAdapter(Ember.DataAdapter);

export function extendStore(Store) {
  Store.reopen({
    init() {
      this._super(...arguments);
      this._queryCache = new QueryCache({ store: this });
      this._globalM3Cache = new Object(null);
    },

    /*
      This is a temporary method that mimics
      what will eventually become the `store.preloadData()` API
      in intent (e.g. it pushes data into the store without marking
      it as loaded).
      This is here only until we are able to directly work off of the model-data branches
      of ember-data and ember-m3.
     */
    preloadData(document) {
      let { data, included } = document;

      if (Array.isArray(included)) {
        for (let i = 0; i < included.length; i++) {
          this._preloadSingleResource(included[i]);
        }
      }

      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          this._preloadSingleResource(data[i]);
        }
      } else if (typeof data === 'object' && data !== null) {
        this._preloadSingleResource(data);
      }
    },

    _preloadSingleResource(data) {
      let modelName = dasherize(data.type);
      let modelData = this.modelDataFor(modelName, data.id);

      modelData.pushData(data);
    },

    // Store hooks necessary for using a single model class

    _hasModelFor(modelName) {
      return SchemaManager.includesModel(modelName) || this._super(modelName);
    },

    modelFactoryFor(modelName) {
      if (SchemaManager.includesModel(modelName)) {
        return MegamorphicModelFactory;
      }
      return this._super(modelName);
    },

    adapterFor(modelName) {
      if (SchemaManager.includesModel(modelName)) {
        return this._super('-ember-m3');
      }
      return this._super(modelName);
    },

    serializerFor(modelName) {
      if (SchemaManager.includesModel(modelName)) {
        return this._super('-ember-m3');
      }
      return this._super(modelName);
    },

    createModelDataFor(modelName, id, clientId, storeWrapper) {
      if (SchemaManager.includesModel(modelName)) {
        return new M3ModelData(modelName, id, clientId, storeWrapper, this);
      }
      return this._super(modelName, id, clientId, storeWrapper);
    },

    // queryURL store API

    queryURL(url, options) {
      return this._queryCache.queryURL(url, options);
    },

    unloadURL(cacheKey) {
      return this._queryCache.unloadURL(cacheKey);
    },

    containsURL(cacheKey) {
      return this._queryCache.contains(cacheKey);
    },

    // These two hooks are used for the secondary cache
    // TODO: make secondary caches possible via public API

    _pushInternalModel(jsonAPIResource) {
      let internalModel = this._super(jsonAPIResource);
      if (SchemaManager.includesModel(jsonAPIResource.type)) {
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

export function extendDataAdapter(DataAdapter) {
  DataAdapter.reopen({
    getModelTypes() {
      return this._super(...arguments).concat({
        klass: MegamorphicModel,
        name: '-ember-m3',
      });
    },

    _nameToClass(modelName) {
      if (SchemaManager.includesModel(modelName)) {
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
  after: 'm3-schema-initializer',
};
