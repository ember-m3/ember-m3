import Ember from 'ember';
import DS from 'ember-data';

import MegamorphicModel from '../model';

// TODO: this is a stopgap.  We want to replace this with a public
// DS.Model/Schema API
//
export function initialize(application) {
  application.register('service:store', DS.Store.extend({
    _hasModelFor(modelName) {
      if (/com.linkedin.voyager/.test(modelName)) {
        return true;
      }
      return this._super(modelName);
    },
    _internalModelsFor(modelName) {
      if (/com.linkedin.voyager/.test(modelName)) {
        return this._super('com.linkedin.voyager.*');
      }
      return this._super(modelName);
    },
    modelFactoryFor(modelName) {
      if (/com.linkedin.voyager/.test(modelName)) {
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
    getModelTypes() {
      return this._super(...arguments).concat({
        klass: MegamorphicModel,
        name: 'com.linkedin.voyager.*'
      });
    },
    _nameToClass(modelName) {
      if (modelName === 'com.linkedin.voyager.*') {
        return MegamorphicModel;
      }
      return this._super(...arguments);
    }
  })
}

export default {
  name: 'm3-store',
  initialize
};
