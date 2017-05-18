import Ember from 'ember';
import SchemaManager from './schema-manager';
// TODO: rollup lodash or write our own setdiff; also lodash's difference
// doesn't seem to require sort so it's presumably O(n^2) but w/e
// import { difference as setDiff} from 'lodash';

const { get, isEqual } = Ember;

function resolveValue(key, value, store, schema) {
  let reference = schema.computeAttributeReference(key, value);
  if (reference) {
    return store.peekRecord(reference.type || '-ember-m3', reference.id);
  }

  let nested = schema.computeNestedModel(key, value);
  if (nested) {
    return new MegamorphicModel({
      store: store,
      _internalModel: {
        id: nested.id,
        modelName: nested.type,
        _data: nested.attributes,
      }
    });
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
    return [];
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

  trigger() {}

  get _debugContainerKey() {
    return 'MegamorphicModel';
  }

  debugJSON() {
    return this._internalModel._data;
  }

  eachAttribute(callback) {
    Object.keys(this._internalModel._data).forEach(callback);
  }

  unloadRecord() {
    // can't call unloadRecord on nested m3 models
    this._internalModel.unloadRecord();
    this._store._queryCache.unloadRecord(this);
  }

  set(key, value) {
    this._internalModel._data[key] = value;
    delete this._cache[key];
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
if(defaultValue === undefined
  && !(this._internalModel._data.$deletedFields || []).includes(key)
  && ![
    'doNotShowInFeed','cachedCommentTotal', 'shouldAutofocus', 'shareType',
    'socialDetail', 'highlightedComments', 'originalUpdate', 'header', 'searchId',
    'publicIdentifier', 'originalId', 'entity', 'videoPlayMetadata', 'aspectRatio',
    'description', 'title', 'likedByOrganizationActor',
  ].includes(key)) {
  self.console.log('qq', this._internalModel._data.$type, key);
}
      return (this._cache[key] = defaultValue);
    }

    let value = this._schema.transformValue(this._modelName, key, rawValue);

    return (this._cache[key] = resolveValue(key, value, this._store, this._schema));
  }

  static toString() {
    return 'MegamorphicModel';
  }

  toString() {
    return `<MegamorphicModel:${this.id}>`;
  }
}

MegamorphicModel.relationshipsByName = new Ember.Map();
