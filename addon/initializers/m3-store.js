import Ember from 'ember';
import DS from 'ember-data';

import MegamorphicModel from '../model';
import MegamorphicModelFactory from '../factory';
import SchemaManager from '../schema-manager';
import QueryCache from '../query-cache';

// TODO: this is a stopgap.  We want to replace this with a public
// DS.Model/Schema API
//
export function initialize() {
  DS.Store.reopen({
    init() {
      this._super(...arguments);
      this._queryCache = new QueryCache({ store: this });
    },

    _hasModelFor(modelName) {
      return SchemaManager.includesModel(modelName) || this._super(modelName);
    },

    _internalModelsFor(modelName) {
      if (SchemaManager.includesModel(modelName)) {
        // Here we could allow schemas to have multiple id-spaces
        return this._super('-ember-m3');
      }
      return this._super(modelName);
    },

    modelFactoryFor(modelName) {
      if (SchemaManager.includesModel(modelName)) {
        return MegamorphicModelFactory;
      }
      return this._super(modelName);
    },

    serializerFor(modelName) {
      if (SchemaManager.includesModel(modelName)) {
        return this._super('-ember-m3');
      }
      return this._super(modelName);
    },

    queryURL(url, options) {
      return this._queryCache.queryURL(url, options);
    },
  })

  Ember.DataAdapter.reopen({
    getModelTypes() {
      return this._super(...arguments).concat({
        klass: MegamorphicModel,
        name: '-ember-m3'
      });
    },

    _nameToClass(modelName) {
      if (SchemaManager.includesModel(modelName)) {
        return MegamorphicModel;
      }
      return this._super(...arguments);
    }
  });
}

export default {
  name: 'm3-store',
  initialize,
  after: 'm3-schema-initializer',
};
