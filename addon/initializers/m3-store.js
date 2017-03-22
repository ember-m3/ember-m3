import Ember from 'ember';
import DS from 'ember-data';

import MegamorphicModel from '../model';
import SchemaSingleton from '../schema';

// TODO: this is a stopgap.  We want to replace this with a public
// DS.Model/Schema API
//
export function initialize(application) {
  application.register('service:store', DS.Store.extend({
    init() {
      this._super(...arguments);
      this._typeMatcher = SchemaSingleton._typeMatcher;
    },

    _hasModelFor(modelName) {
      return this._typeMatcher(modelName) || this._super(modelName);
    },

    _internalModelsFor(modelName) {
      if (this._typeMatcher(modelName)) {
        return this._super('m3-model');
      }
      return this._super(modelName);
    },

    modelFactoryFor(modelName) {
      if (this._typeMatcher(modelName)) {
        return {
          class: MegamorphicModel,
          create(props) {
            return new MegamorphicModel(props);
          }
        };
      }
      return this._super(modelName);
    }
  }));

  Ember.DataAdapter.reopen({
    init() {
      this._super(...arguments);
      this._typeMatcher = SchemaSingleton._typeMatcher;
    },

    getModelTypes() {
      return this._super(...arguments).concat({
        klass: MegamorphicModel,
        name: 'm3-model'
      });
    },

    _nameToClass(modelName) {
      if (this._typeMatcher(modelName)) {
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
