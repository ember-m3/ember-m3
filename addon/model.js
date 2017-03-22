import Ember from 'ember';

class Schema {
  constructor({ propertyWhitelist,  propertyTransforms } = {}) {
    this._propertyWhitelist = propertyWhitelist;
    this._propertyTransforms = propertyTransforms || {};
  }

  isPropertyIncluded(propName) {
    return !this._propertyWhitelist || this._propertyWhitelist.includes(propName);
  }

  transformValue(propName, value) {
    let transformer = this._propertyTransforms[propName];
    return transformer ? transformer(value) : value;
  }

  static get schemas() {
    return this._schemas || (this._schemas = Object.create(null));
  }

  static schemaFor(modelName) {
    return this.schemas[modelName] || NullSchema;
  }

  static registerSchema(modelName, schema) {
    this.schemas[modelName] = schema;
  }
}

const NullSchema = new Schema();

function dateTransform(value) {
  return new Date(Date.parse(value));
}

Schema.registerSchema('com.linkedin.voyager.collection', new Schema({
  propertyTransforms: {
    'dateAttr': dateTransform,
  }
}));


function resolveValue(value, store) {
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
    return value.map(entry => resolveValue(entry, store));
  }

  return value;
}

export default class MegamorphicModel extends Ember.Object {
  init(properties) {
    this._super(...arguments);
    this._store = properties.store;
    this._internalModel = properties._internalModel;
    this.id = this._internalModel.id;
    this._cache = Object.create(null);
    this._schema = Schema.schemaFor(this._internalModel.modelName);
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

  set() {
    throw new TypeError('not implemented');
  }

  unknownProperty(key) {
    if (! this._schema.isPropertyIncluded(key)) { return; }

    let rawValue = this._internalModel._data[key];
    let value = this._schema.transformValue(key, rawValue);

    return (this._cache[key] = this._cache[key] || resolveValue(value, this._store));
  }

  static toString() {
    return 'MegamorphicModel';
  }
}
