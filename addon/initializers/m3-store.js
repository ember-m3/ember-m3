import Ember from 'ember';
import DS from 'ember-data';

import MegamorphicModel from '../model';
import MegamorphicModelFactory from '../factory';
import SchemaManager from '../schema-manager';

// TODO: this is a stopgap.  We want to replace this with a public
// DS.Model/Schema API
//
export function initialize(application) {
  application.register('service:store', DS.Store.extend({
    _hasModelFor(modelName) {
      return SchemaManager.includesModel(modelName) || this._super(modelName);
    },

    _internalModelsFor(modelName) {
      if (SchemaManager.includesModel(modelName)) {
        return this._super('m3-model');
      }
      return this._super(modelName);
    },

    modelFactoryFor(modelName) {
      if (SchemaManager.includesModel(modelName)) {
        return MegamorphicModelFactory;
      }
      return this._super(modelName);
    }
  }));

  Ember.DataAdapter.reopen({
    getModelTypes() {
      return this._super(...arguments).concat({
        klass: MegamorphicModel,
        name: 'm3-model'
      });
    },

    _nameToClass(modelName) {
      if (SchemaManager.includesModel(modelName)) {
        return MegamorphicModel;
      }
      return this._super(...arguments);
    }
  })
}

export default {
  name: 'm3-store',
  initialize,
  after: 'm3-schema-initializer',
};
