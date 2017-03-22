import DS from 'ember-data';
import Ember from 'ember';

function applyWhitelist(key) {
  return SCHEMA_WHITELIST.includes(key);
}

const SCHEMA = {
  name: 'mini-profile',
  inherits: 'profile',
  whiltelist: ['firstName', 'lastName', 'company']
};

const SCHEMA_WHITELIST = [
  'FOO', 'BAR', 'BAZ', 'APPLE',
  'FOO', 'BAR', 'BAZ', 'APPLE',
  'FOO', 'BAR', 'BAZ', 'APPLE',
  'FOO', 'BAR', 'BAZ', 'APPLE',
  'FOO', 'BAR', 'BAZ', 'APPLE',
  'FOO', 'BAR', 'BAZ', 'APPLE',
  'FOO', 'BAR', 'BAZ', 'APPLE'
];

class MegamorphicModel extends Ember.Object {
  init(properties) {
    this._super(...arguments);
    this._store = properties.store;
    this._internalModel = properties._internalModel;
    this.id = this._internalModel.id;
    this._cache = Object.create(null);
  }

  static get isModel() {
    return true;
  }

  static get klass() {
    return MegamorphicModel;
  }

  static get attributes () {
    return [];
  }

  static create(properties) {
    return new this(properties);
  }

  // TURBO
  __defineNonEnumerable(property) {
    this[property.name] = property.descriptor.value;
  }

  _notifyProperties(keys) {
    Ember.beginPropertyChanges();
    let key;
    for (let i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      delete this._cache[key];
      this.notifyPropertyChange(key);
    }
    Ember.endPropertyChanges();
  }

  trigger() { }

  get _debugContainerKey() {
    return 'com.voyager.*';
  }

  debugJSON() {
    return this._internalModel._data;
  }

  eachAttribute(callback) {
    Object.keys(this._internalModel._data).forEach(callback);
  }
}

// Ember.Observable.apply(MegamorphicModel.prototype);
MegamorphicModel.prototype.set = function() {
  throw new TypeError('not implemented');
};

MegamorphicModel.prototype.unknownProperty = function(key) {
  if (applyWhitelist(key)) { return; }

  let value = this._internalModel._data[key];

  return (this._cache[key] = this._cache[key] || somethingRather(value, this._store));
};

function somethingRather(value, store) {
  if (typeof value === 'string' && /^urn:li:/.test(value)) {
    return store.peekRecord('com.linkedin.voyager.bagel', value);
  } else if (typeof value === 'object' && value !== null && typeof value.$type === 'string') {
    return new MegamorphicModel({
      store: store,
      _internalModel: {
        id: value.urn,
        _data: value
      }
    });
  } else if (Array.isArray(value)) {
    // arrays are strange
    return value.map(entry => somethingRather(entry, store));
  }

  return value;
}
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
