import Ember from 'ember';
import DS from 'ember-data';

import MegamorphicModel from '../model';
import M3ModelData from '../model-data';
import MegamorphicModelFactory from '../factory';
import SchemaManager from '../schema-manager';
import QueryCache from '../query-cache';

// TODO: this is a stopgap.  We want to replace this with a public
// DS.Model/Schema API

export function extendStore(Store) {
  Store.reopen({
    init() {
      this._super(...arguments);
      this._queryCache = new QueryCache({ store: this });
      this._globalM3Cache = new Object(null);
    },

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

    createModelDataFor(modelName, id, clientId, storeWrapper, internalModel) {
      if (SchemaManager.includesModel(modelName)) {
        return new M3ModelData(
          modelName,
          id,
          clientId,
          storeWrapper,
          this,
          internalModel
        );
      }
      return this._super(modelName, id, clientId, storeWrapper, internalModel);
    },

    queryURL(url, options) {
      return this._queryCache.queryURL(url, options);
    },

    unloadURL(cacheKey) {
      return this._queryCache.unloadURL(cacheKey);
    },

    containsURL(cacheKey) {
      return this._queryCache.contains(cacheKey);
    },

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

export function initialize() {
  extendStore(DS.Store);
  extendDataAdapter(Ember.DataAdapter);
}

export default {
  name: 'm3-store',
  initialize,
  after: 'm3-schema-initializer',
};
