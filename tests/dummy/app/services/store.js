import DS from 'ember-data';
import Ember from 'ember';
import MegamorphicModel from 'ember-m3/model';

export default DS.Store.extend({
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
});

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
