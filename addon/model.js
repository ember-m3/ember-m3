import Ember from 'ember';
import SchemaManager from './schema-manager';

const { get, isEqual } = Ember;

class EmbeddedInternalModel {
  constructor({ id, modelName, _data}) {
    this.id = id;
    this.modelName = modelName;
    this._data = _data;

    this.record = null;
  }

  createSnapshot() {
    return {
      record: this.record,

      serialize(options) {
        return this.record._store.serializerFor('-ember-m3').serialize(this, options);
      }
    };
  }
}

function resolveValue(key, value, store, schema) {
  let reference = schema.computeAttributeReference(key, value);
  if (reference) {
    return store.peekRecord(reference.type || '-ember-m3', reference.id);
  }

  let nested = schema.computeNestedModel(key, value);
  if (nested) {
    let internalModel = new EmbeddedInternalModel({
      id: nested.id,
      modelName: nested.type,
      _data: nested.attributes,
    });
    let model = new MegamorphicModel({
      store,
      _internalModel: internalModel,
    });
    internalModel.record = model;

    return model;
  }

  if (Array.isArray(value)) {
    return value.map(entry => resolveValue(key, entry, store, schema));
  }

  return value;
}

function setDiff(a, b) {
  let result = [];
  for (let i=0, j=0; i < a.length; ++i) {
    for (; j<b.length && b[j] < a[i]; ++j);

    if (j < b.length && a[i] === b[j]) {
      continue;
    } else {
      result.push(a[i]);
    }
  }
  return result;
}

/**
  Calculate the changed keys from prior and new `data`s.  This follows similar
  semantics to `InternalModel._changedKeys`.

  The key difference is that omitted attributes and new attributes are treated
  as changes, instead of ignored.

  There is another difference, which is that there's no notion of
  `_inflightAttributes` or `_attributes`, but this will likely need to change
  when m3 composes a write story.
*/
function calculateChangedKeys(oldValue, newValue) {
  let oldKeys = Object.keys(oldValue).sort();
  let newKeys = Object.keys(newValue).sort();

  // omitted keys are treated as changes
  let result = setDiff(oldKeys, newKeys);

  for (let i=0; i<newKeys.length; ++i) {
    let key = newKeys[i];
    if (!isEqual(oldValue[key], newValue[key])) {
      result.push(key);
    }
  }

  return result;
}

const YesManAttributes = {
  has() {
    return true;
  }
};

export default class MegamorphicModel extends Ember.Object {
  init(properties) {
    this._super(...arguments);
    this._store = properties.store;
    this._internalModel = properties._internalModel;
    this._modelName = this._internalModel.modelName;
    this.id = this._internalModel.id;
    this._cache = Object.create(null);
    this._schema = SchemaManager;
  }

  static get isModel() {
    return true;
  }

  static get klass() {
    return MegamorphicModel;
  }

  static get attributes () {
    return YesManAttributes;
  }

  static eachRelationship(/* callback */) {
  }

  static create(properties) {
    return new this(properties);
  }

  __defineNonEnumerable(property) {
    this[property.name] = property.descriptor.value;
  }

  _assignAttributes(attributes) {
    this._internalModel._data = attributes;
  }

  _notifyProperties(keys) {
    Ember.beginPropertyChanges();
    let key;
    for (let i = 0, length = keys.length; i < length; i++) {
      key = keys[i];
      let oldValue = this._cache[key];
      let newValue = this._internalModel._data[key];

      let oldWasModel = oldValue && oldValue.constructor === MegamorphicModel;
      let newIsObject = typeof newValue === 'object';

      if (oldWasModel && newIsObject) {
        oldValue._didReceiveNestedProperties(this._internalModel._data[key]);
      } else {
        // anything -> undefined | primitive
        delete this._cache[key];
        this.notifyPropertyChange(key);
      }
    }
    Ember.endPropertyChanges();
  }

  _didReceiveNestedProperties(data) {
    let changedKeys = calculateChangedKeys(this._internalModel._data, data);
    this._internalModel._data = data;
    if (changedKeys.length > 0) {
      this._notifyProperties(changedKeys);
    }
  }

  _changedKeys(data) {
    return calculateChangedKeys(this._internalModel._data, data);
  }

  changedAttributes() {
    // TODO: this will always report nothing has changed; bc we just `set` to
    // `_data` and don't make a data/attributes distinction.  We coooould, if
    // serializers actually need to know changed attrs.
    return this._internalModel.changedAttributes();
  }

  trigger() {}

  get _debugContainerKey() {
    return 'MegamorphicModel';
  }

  debugJSON() {
    return this._internalModel._data;
  }

  eachAttribute(callback) {
    // Properties in `data` are treated as attributes for serialization purposes
    // if the schema does not consider them references
    Object.keys(this._internalModel._data).forEach(callback);
  }

  unloadRecord() {
    // can't call unloadRecord on nested m3 models
    this._internalModel.unloadRecord();
    this._store._queryCache.unloadRecord(this);
  }

  set(key, value) {
    // TODO: need to be able to update relationships
    this._internalModel._data[key] = value;
    delete this._cache[key];
  }

  serialize(options) {
    return this._internalModel.createSnapshot().serialize(options);
  }

  save(options) {
    // TODO: we could return a PromiseObject as DS.Model does
    return this._internalModel.save(options);
  }

  unknownProperty(key) {
    if (key in this._cache) {
      return this._cache[key];
    }

    if (! this._schema.isAttributeIncluded(this._modelName, key)) { return; }

    let alias = this._schema.getAttributeAlias(this._modelName, key);
    if (alias) {
      return this._cache[key] = get(this, alias);
    }

    let rawValue = this._internalModel._data[key];
    if (rawValue === undefined) {
      let defaultValue = this._schema.getDefaultValue(this._modelName, key);

      return (this._cache[key] = defaultValue);
    }

    let value = this._schema.transformValue(this._modelName, key, rawValue);

    return (this._cache[key] = resolveValue(key, value, this._store, this._schema));
  }

  setUnknownProperty(key, value) {
    this.set(key, value);
  }

  static toString() {
    return 'MegamorphicModel';
  }

  toString() {
    return `<MegamorphicModel:${this.id}>`;
  }
}

MegamorphicModel.prototype.store = null;
MegamorphicModel.prototype._internalModel = null;
MegamorphicModel.prototype.id = null;
MegamorphicModel.prototype.currentState = null;
MegamorphicModel.prototype.isError = null;
MegamorphicModel.prototype.adapterError = null;

MegamorphicModel.relationshipsByName = new Ember.Map();
