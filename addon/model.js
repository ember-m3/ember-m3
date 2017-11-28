import Ember from 'ember';
import { RootState } from 'ember-data/-private';
import { dasherize } from '@ember/string';

import SchemaManager from './schema-manager';
import M3RecordArray from './record-array';
import { OWNER_KEY, isObject, merge } from './util';

const {
  assert, changeProperties, get, set, propertyDidChange, computed, A
} = Ember;

const {
  deleted: {
    uncommitted: deletedUncommitted
  },
  loaded: {
    saved: loadedSaved
  }
} = RootState;

const FakeAttributeMeta = { isAttribute: true };

class EmbeddedSnapshot {
  constructor(record) {
    this.record = record;
    this.modelName = this.record._internalModel.modelName;
    this.attrs = Object.create(null);
    this.eachAttribute(key => this.attrs[key] = this.record.get(key));
  }

  serialize(options) {
    return this.record._store.serializerFor('-ember-m3').serialize(this, options);
  }

  eachAttribute(callback, binding) {
    return this.record.eachAttribute(callback, binding);
  }

  attr(key) {
    return this.attrs[key];
  }
}

class EmbeddedInternalModel {
  constructor({ id, modelName, _data}) {
    this.id = id;
    this.modelName = modelName;
    this._data = _data;

    this.record = null;
  }

  createSnapshot() {
    return new EmbeddedSnapshot(this.record);
  }
}

function resolveValue(key, value, modelName, store, schema, model) {
  if (schema.isAttributeArrayReference(key, value, modelName)) {
    return resolveRecordArray(key, value, modelName, store, schema, model);
  }

  if (Array.isArray(value)) {
    return resolvePlainArray(key, value, modelName, store, schema, model);
  }

  let reference = schema.computeAttributeReference(key, value, modelName);
  if (reference) {
    if(reference.type === null) {
      // for schemas with a global id-space but multiple types, schemas may
      // report a type of null
      let internalModel = store._globalM3Cache[reference.id];
      return internalModel ? internalModel.getRecord() : null;
    } else {
      // respect the user schema's type if provided
      return store.peekRecord(reference.type, reference.id);
    }
  }

  let nested = schema.computeNestedModel(key, value, modelName);
  if (nested) {
    let internalModel = new EmbeddedInternalModel({
      id: nested.id,
      // maintain consistency with internalmodel.modelName, which is normalized
      // internally within ember-data
      modelName: nested.type ? dasherize(nested.type) : null,
      _data: nested.attributes,
    });
    let nestedModel = new EmbeddedMegamorphicModel({
      store,
      _internalModel: internalModel,
      _parentModel: model,
      _topModel: model._topModel,
      _path: model._path.concat(key)
    });
    internalModel.record = nestedModel;

    return nestedModel;
  }

  return value;
}

function resolvePlainArray(key, value, modelName, store, schema, model) {
  if (value == null) {
    return new Array(0);
  }

  let result = new Array(value.length);

  for (let i=0; i<value.length; ++i) {
    result[i] = resolveValue(key, value[i], modelName, store, schema, model);
  }

  return result;
}

function resolveRecordArray(key, value, modelName, store, schema) {
  let recordArrayManager = store._recordArrayManager;

  let array = M3RecordArray.create({
    modelName: '-ember-m3',
    content: Ember.A(),
    store: store,
    manager: recordArrayManager,
  });

  if (value == null) {
    return array;
  }

  let internalModels = resolveRecordArrayInternalModels(key, value, modelName, store, schema);

  array._setInternalModels(internalModels);

  return array;
}

function resolveRecordArrayInternalModels(key, value, modelName, store, schema) {
  let internalModels = new Array(value.length);
  for (let i=0; i<internalModels.length; ++i) {
    let reference = schema.computeAttributeReference(key, value[i], modelName);
    if (reference) {
      if (reference.type) {
        // for schemas with a global id-space but multiple types, schemas may
        // report a type of null
        internalModels[i] = store._internalModelForId(reference.type, reference.id);
      } else {
        internalModels[i] = store._globalM3Cache[reference.id];
      }
    }
  }

  return internalModels;
}

function disallowAliasSet(object, key, value) {
  throw new Error(`You tried to set '${key}' to '${value}', but '${key}' is an alias in '${object._modelName}' and aliases are read-only`);
}

/**
 * Construct changelist for `_notifyProperties` to invalidate the
 * given property on a given nested model.
 *
 * For example, given the following path and changed keys:
 *  * ```
 * // if the following paths are invalidated
 * // foo.bar.baz.prop1
 * // the input should be:
 * let path = ['foo', 'bar', 'baz'];
 * let changedKey = 'prop1';
 *
 * // the resulting changelist should be:
 * let result = constructChangedKeys(path, changedKeys);
 * // result is:
 * // {
 * //   foo: {
 * //     bar: {
 * //       baz: {
 * //         prop1: true,
 * //       },
 * //     },
 * //   },
 * // }
 * ```
 */
function constructChangedKey(path, changedKey) {
  let result = Object.create(null);
  result[changedKey] = true;
  for (let i = path.length - 1; i >= 0; i--) {
    let nestedKeys = result;
    result = Object.create(null);
    result[path[i]] = nestedKeys;
  }
  return result;
}

class YesManAttributesSingletonClass {
  has() {
    return true;
  }

  // This stub exists for the inspector
  forEach(/* cb */) {
    // cb(meta, name)
    return;
  }
}
const YesManAttributes = new YesManAttributesSingletonClass();

const retrieveFromCurrentState = computed('currentState', function(key) {
  return this._topModel._internalModel.currentState[key];
}).readOnly();

// global buffer for initial properties to work around
//  a)  can't write to `this` before `super`
//  b)  core_object writes properties before calling `init`; this means that no
//      CP or setknownProperty can rely on any initialization
let initProperites = Object.create(null);

export default class MegamorphicModel extends Ember.Object {
  init(properties) {
    // Drop Ember.Object subclassing instead
    super.init(...arguments);
    this._store = properties.store;
    this.id = this._internalModel.id;
    this._internalModel = properties._internalModel;

    this._schema = SchemaManager;

    let baseModelName = this._schema.computeBaseModelName(this._modelName);
    this._baseModel = baseModelName ? this.initBaseModel(baseModelName) : null;
    this._projections = null;
    this._path = this._path || [];

    this._cache = Object.create(null);

    this._topModel = this._topModel || this;
    this._parentModel = this._parentModel || null;
    this._init = true;

    this._flushInitProperties();
  }

  initBaseModel(baseModelName) {
    // TODO document that we are dependent on store.push pushing in included first which has the base record data in it
    let baseModel = this._store.recordForId(baseModelName, this.id);
    // TODO We can probably do it with an observer although it introduces an async behavior
    // TODO Don't forget to remove it when this M3 model has been destroyed
    baseModel._registerProjection(this);
    return baseModel;
  }

  _flushInitProperties() {
    let propertiesToFlush = initProperites;
    initProperites = Object.create(null);

    let keys = Object.keys(propertiesToFlush);
    if (keys.length > 0) {
      for (let i=0; i<keys.length; ++i) {
        let key = keys[i];
        let value = propertiesToFlush[key];
        this.setUnknownProperty(key, value);
      }
    }
  }

  static metaForProperty() {
    return FakeAttributeMeta;
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

  get _modelName() {
    return this.__internalModel.modelName;
  }

  get _internalModel() {
    return this.baseModel ? this.baseModel._internalModel : this.__internalModel;
  }

  set _internalModel(internalModel) {
    this.__internalModel = internalModel;
  }

  __defineNonEnumerable(property) {
    this[property.name] = property.descriptor.value;
  }

  _assignAttributes() {
    // do not do anything as changed keys will apply the changes
    // to discover the changed ones
  }

  _registerProjection(projection) {
    if (!this._projections) {
      this._projections = [];
    }
    this._projections.push(projection);
  }

  _notifyProjections(keys) {
    if (this._projections) {
      for (let i = 0; i < this._projections.length; i++) {
        this._projections[i]._notifyProperties(keys);
      }
    }
  }

  /**
   * Iterates over the given list of changed properties and correctly invalidates their value on
   * model object.
   *
   * Note: the `changedKeys` is a hash, where each key represent a changed property while the value
   * contains either `true` or another hash, describing changed to embedded objects. For example:
   *
   * ```
   * {
   *    foo: true,
   *    bar: {
   *      baz: true,
   *    }
   * }
   * ```
   * represents changes to the following paths:
   * - `foo`
   * - `bar.baz`
   */
  _notifyProperties(changedKeys) {
    let keys = Object.keys(changedKeys);
    if (!keys.length) {
      // the `for` loop below will handle it for us, but we don't want to read the _baseModel
      // unnecessary
      return;
    }
    changeProperties(() => {
      let key;
      let internalModel = this._baseModel ? this._baseModel._internalModel : this._internalModel;
      for (let i = 0, length = keys.length; i < length; i++) {
        key = keys[i];
        if (!this._schema.isAttributeIncluded(this._modelName, key)) {
          // keys, which are not white-listed are ignored for projections
          continue;
        }
        let oldValue = this._cache[key];
        let newValue = internalModel._data[key];

        let oldIsRecordArray = oldValue && oldValue instanceof M3RecordArray;
        let oldWasModel = oldValue && oldValue instanceof EmbeddedMegamorphicModel;
        let newIsObject = isObject(newValue);

        if (oldWasModel && newIsObject) {
          let nestedKeys = changedKeys[key];
          assert('Changes to existing nested models must always be accommpanied by nested changed keys', nestedKeys !== true);
          oldValue._didReceiveNestedProperties(internalModel._data[key], nestedKeys);
        } else if (oldIsRecordArray) {
          let internalModels = resolveRecordArrayInternalModels(
            key, newValue, this._modelName, this._store, this._schema
          );
          oldValue._setInternalModels(internalModels);
        } else {
          // anything -> undefined | primitive
          delete this._cache[key];
          this.notifyPropertyChange(key);
        }
      }
      // Inside the same property change transaction
      this._notifyProjections(changedKeys);
    });
  }

  _didReceiveNestedProperties(data, changedKeys) {
    this._internalModel._data = data;
    if (Object.keys(changedKeys).length > 0) {
      this._notifyProperties(changedKeys);
    }
  }

  _changedKeys(data) {
    return merge(this._internalModel._data, data);
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

  eachAttribute(callback, binding) {
    if (!this._internalModel._data) {
      // see #14
      return;
    }

    // Properties in `data` are treated as attributes for serialization purposes
    // if the schema does not consider them references
    Object.keys(this._internalModel._data).forEach(callback, binding);
  }

  unloadRecord() {
    // can't call unloadRecord on nested m3 models
    this._internalModel.unloadRecord();
    this._store._queryCache.unloadRecord(this);
  }

  set(key, value) {
    set(this, key, value);
  }

  serialize(options) {
    return this._internalModel.createSnapshot().serialize(options);
  }

  toJSON() {
    return this.serialize();
  }

  save(options) {
    // TODO: we could return a PromiseObject as DS.Model does
    return this._internalModel.save(options).then(() => this);
  }

  reload() {
    return this._store.findRecord(this._modelName, this.id, { reload: true });
  }

  deleteRecord() {
    this._internalModel.currentState = deletedUncommitted;
    propertyDidChange(this, 'currentState');
  }

  destroyRecord(options) {
    this.deleteRecord();
    return this._internalModel.save(options);
  }

  rollbackAttributes() {
    // TODO: we could actually support this feature
    this._internalModel.currentState = loadedSaved;
    propertyDidChange(this, 'currentState');
  }

  unknownProperty(key) {
    if (key in this._cache) {
      return this._cache[key];
    }

    if (! this._schema.isAttributeIncluded(this._modelName, key)) { return; }

    let internalModel = this._baseModel != null ? this._baseModel._internalModel : this._internalModel;

    let rawValue = internalModel._data[key];
    if (rawValue === undefined) {
      let alias = this._schema.getAttributeAlias(this._modelName, key);
      if (alias) {
        const cp = Ember.computed.alias(alias);
        cp.set = disallowAliasSet;
        this[key] = cp;
        return cp.get(this, key);
      }

      let defaultValue = this._schema.getDefaultValue(this._modelName, key);
      return (this._cache[key] = defaultValue);
    }

    let value = this._schema.transformValue(this._modelName, key, rawValue);

    return (this._cache[key] = resolveValue(key, value, this._modelName, this._store, this._schema, this));
  }

  // TODO: drop change events for unretrieved properties
  setUnknownProperty(key, value) {
    if (key === OWNER_KEY) {
      // 2.12 support; later versions avoid this call entirely
      return;
    }

    if (!this._init) {
      initProperites[key] = value;
      return;
    }

    if (!this._schema.isAttributeIncluded(this._modelName, key)) {
      throw new Error(`Cannot set non-whitelisted property ${key} on type ${this._modelName}`);
    }

    if (this._baseModel) {
      set(this._baseModel, key, value);
      return;
    }

    if(this._schema.getAttributeAlias(this._modelName, key)) {
      throw new Error(`You tried to set '${key}' to '${value}', but '${key}' is an alias in '${this._modelName}' and aliases are read-only`);
    }

    changeProperties(() => {
      // TODO: need to be able to update relationships
      // TODO: also on set(x) ask schema if this should be a ref (eg if it has an
      // entityUrn)
      // TODO: similarly this.get('arr').pushObject doesn't update the underlying
      // _data
      if (this._schema.isAttributeArrayReference(key, value, this._modelName)) {
        this._setRecordArray(key, value);
      } else {
        this._internalModel._data[key] = value;
        delete this._cache[key];
      }

      let topBaseModel = this._topModel._baseModel || this._topModel;
      if (!topBaseModel._projections) {
        // no projections, just notify for property change
        this.notifyPropertyChange(key);
        return;
      }

      let changedKeys = constructChangedKey(this._path, key);
      topBaseModel._notifyProperties(changedKeys);
    });
  }

  _setRecordArray(key, models) {
    // TODO Should we add support for array proxy as well
    let ids = new Array(models.length);
    models = A(models);
    for (let i=0; i<ids.length; ++i) {
      // TODO: should have a schema hook for this
      ids[i] = get(models.objectAt(i), 'id');
    }
    this._internalModel._data[key] = ids;

    if (key in this._cache) {
      let recordArray = this._cache[key];
      recordArray.replaceContent(0, get(recordArray, 'length'), models);
    }
  }

  static toString() {
    return 'MegamorphicModel';
  }

  toString() {
    return `<MegamorphicModel:${this.id}>`;
  }
}

MegamorphicModel.prototype.store = null;
MegamorphicModel.prototype._parentModel = null;
MegamorphicModel.prototype._topModel = null;
MegamorphicModel.prototype._path = null;
MegamorphicModel.prototype.id = null;
MegamorphicModel.prototype.currentState = null;
MegamorphicModel.prototype.isError = null;
MegamorphicModel.prototype.adapterError = null;

MegamorphicModel.relationshipsByName = new Ember.Map();

// STATE PROPS
MegamorphicModel.prototype.isEmpty = retrieveFromCurrentState;
MegamorphicModel.prototype.isLoading = retrieveFromCurrentState;
MegamorphicModel.prototype.isLoaded = retrieveFromCurrentState;
MegamorphicModel.prototype.isSaving = retrieveFromCurrentState;
MegamorphicModel.prototype.isDeleted = retrieveFromCurrentState;
MegamorphicModel.prototype.isNew = retrieveFromCurrentState;
MegamorphicModel.prototype.isValid = retrieveFromCurrentState;
MegamorphicModel.prototype.dirtyType = retrieveFromCurrentState;

class EmbeddedMegamorphicModel extends MegamorphicModel {
  unloadRecord() {
    Ember.warn(`Nested models cannot be directly unloaded.  Perhaps you meant to unload the top level model, '${this._topModel._modelName}:${this._topModel.id}'`, false, { id: 'ember-m3.nested-model-unloadRecord' });
  }
}
