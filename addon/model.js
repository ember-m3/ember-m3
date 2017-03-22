import Ember from 'ember';
import SchemaSingleton from './schema';

function resolveValue(value, store, schema) {
  if (schema._idMatcher(value)) {
    return store.peekRecord('m3-model', value);
  } else if (schema._nestedModelMatcher(value)) {
    return new MegamorphicModel({
      store: store,
      _internalModel: {
        id: value.urn,
        _data: value
      }
    });
  } else if (Array.isArray(value)) {
    // arrays are strange
    return value.map(entry => resolveValue(entry, store, schema));
  }

  return value;
}

export default class MegamorphicModel extends Ember.Object {
  init(properties) {
    this._super(...arguments);
    this._store = properties.store;
    this._internalModel = properties._internalModel;
    this._modelName = this._internalModel.modelName;
    this.id = this._internalModel.id;
    this._cache = Object.create(null);
    this._schema = SchemaSingleton;
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

  trigger() {}

  get _debugContainerKey() {
    return 'com.voyager.*';
  }

  debugJSON() {
    return this._internalModel._data;
  }

  eachAttribute(callback) {
    Object.keys(this._internalModel._data).forEach(callback);
  }

  set() {
    throw new TypeError('not implemented');
  }

  unknownProperty(key) {
    if (! this._schema.isAttributeIncluded(this._modelName, key)) { return; }

    let rawValue = this._internalModel._data[key];
    let value = this._schema.transformValue(this._modelName, key, rawValue);

    return (this._cache[key] = this._cache[key] || resolveValue(value, this._store, this._schema));
  }

  static toString() {
    return 'MegamorphicModel';
  }
}
