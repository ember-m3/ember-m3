import Ember from 'ember';
import { RootState } from 'ember-data/-private';
import { dasherize } from '@ember/string';

import SchemaManager from './schema-manager';
import M3RecordArray from './record-array';
import { OWNER_KEY, isObject, merge } from './util';

const {
  changeProperties, get, set, propertyWillChange, propertyDidChange, computed, A
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
      _key: key
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
    this._projections = null;

    this._schema = SchemaManager;

    let baseModelName = this._schema.computeBaseModelName(this._modelName);
    this._baseModel = baseModelName ? this.initBaseModel(baseModelName) : null;

    this._cache = Object.create(null);
    // TODO We need this to save us the trouble of registering all projections with the parent
    // otherwise we can stop using the proxy itself and let parent notify all projections
    this._tags = this._isProjection ? null : Object.create(null);
    this._cacheTags = this._isProjection ? Object.create(null) : null;

    this._topModel = this._topModel || this;
    this._parentModel = this._parentModel || null;
    this._key = this._key || null;
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
    return this._internalModel.modelName;
  }

  get _isProjection() {
    return this._baseModel != null;
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
   * Dirtying embedded records is little weird, because there is no link between
   * the embedded models of the projection - only link is at the top model. This
   * means changes in one of the embedded model must surface up to the top model,
   * where the projections are available and propagated down.
   *
   * The actual propagation is done in `didChagneNestedProperties`, which receives
   * the path to the changes and it is responsible for correctly traversing the
   * path of embedded records to find the correct model to invalidate.
   */
  _notifyProjectionsNestedProperties(path, keys) {
     if (this._parentModel) {
       this._parentModel._notifyProjectionsNestedProperties([this._key].concat(path), keys);
       return;
     }
     if (this._baseModel) {
       this._baseModel._notifyProjectionsNestedProperties(path, keys);
       return;
     }
     // TODO Do we need to notify the base record? It may not be used apart from keeping track
     // of projections and this will be totally unnecessary work
     this._didChangeNestedProperties(path, keys);
     if (this._projections) {
       for (let i = 0; i < this._projections.length; i++) {
         this._projections[i]._didChangeNestedProperties(path, keys);
       }
     }
  }

  _notifyProperties(keys) {
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
        let nestedKeys;
        if (Array.isArray(key)) {
          nestedKeys = key.slice(1);
          key = key[0];
        }
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
      this._notifyProjections(keys);
    });
  }

  _didReceiveNestedProperties(data, changedKeys) {
    this._internalModel._data = data;
    if (changedKeys.length > 0) {
      this._notifyProperties(changedKeys);
    }
  }

  /**
   * Traverses a given path of embedded records to find the one, whose properties
   * must be dirtied.
   *
   * The traversal will stop if one of the intermediate steps is not an actual
   * embedded record (it may have not been loaded yet).
   *
   * This function is different than `didReceiveNestedProperties`, which is initiated from
   * Ember Data, which only understands changes to the high level data and there needs
   * to be a function to compare the embedded data and data the fine-grained changes there.
   */
  _didChangeNestedProperties(path, keys) {
    if (path.length === 0) {
      // reached the destination, notify
      this._notifyProperties(keys);
      return;
    }
    let next = path[0];
    if (!(next in this._cache)) {
      // not in the cache, nothing to do
      return;
    }
    let nestedModel = this._cache[next];
    if (!nestedModel || typeof nestedModel !== 'object' || typeof nestedModel._didChangeNestedProperties === undefined) {
      return;
    }
    nestedModel._didChangeNestedProperties(path.slice(1), keys);
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
      propertyWillChange(this, key);

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

      propertyDidChange(this, key);
      if (this._parentModel) {
        this._parentModel._notifyProjectionsNestedProperties([this._key], [key]);
      } else {
        this._notifyProjections([key]);
      }
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
MegamorphicModel.prototype._internalModel = null;
MegamorphicModel.prototype._parentModel = null;
MegamorphicModel.prototype._topModel = null;
MegamorphicModel.prototype._key = null;
MegamorphicModel.prototype.id = null;
MegamorphicModel.prototype.currentState = null;
MegamorphicModel.prototype.isError = null;
MegamorphicModel.prototype.adapterError = null;
MegamorphicModel.prototype._projectionName = null;

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
