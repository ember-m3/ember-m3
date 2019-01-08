// This lint error disables "this.attrs" everywhere.  What could go wrong?
/* eslint-disable ember/no-attrs-in-components */

import DS from 'ember-data';
import { RootState, identifierForModel } from 'ember-data/-private';
import EmberObject, { computed, get, set, defineProperty } from '@ember/object';
import { isArray } from '@ember/array';
import { assert, warn } from '@ember/debug';
import { readOnly } from '@ember/object/computed';
import { IS_RECORD_DATA } from 'ember-compatibility-helpers';
import { recordDataToRecordMap } from './initializers/m3-store';

import { recordDataFor } from './-private';
import M3RecordArray from './record-array';
import { OWNER_KEY } from './util';
import { resolveValue } from './resolve-attribute-util';
import { computeAttributeReference } from './utils/resolve';
import {
  assertNoChanges,
  notifyPropertyChange,
  deferPropertyChange,
  flushChanges,
} from './utils/notify-changes';
import { DEBUG } from '@glimmer/env';

const {
  deleted: { uncommitted: deletedUncommitted, saved: deletedSaved },
  loaded: {
    saved: loadedSaved,
    updated: { uncommitted: updatedUncommitted },
  },
} = RootState;

class EmbeddedSnapshot {
  constructor(record) {
    this.record = record;
    // TODO this line seems untested
    this.modelName = this.record._recordData.modelName;

    this.attrs = Object.create(null);
    this.eachAttribute(key => (this.attrs[key] = this.record.get(key)));
  }

  serialize(options) {
    return this.record._store.serializerFor('-ember-m3').serialize(this, options);
  }

  eachAttribute(callback, binding) {
    let recordData = recordDataFor(this.record);
    return recordData.eachAttribute(callback, binding);
  }

  attr(key) {
    return this.attrs[key];
  }
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

// global buffer for initial properties to work around
//  a)  can't write to `this` before `super`
//  b)  core_object writes properties before calling `init`; this means that no
//      CP or setknownProperty can rely on any initialization
let initProperites = Object.create(null);

let ignoreInvalidRequestsMap = new WeakMap();
let ignoreErrorRequestsMap = new WeakMap();
export default class MegamorphicModel extends EmberObject {
  init(properties) {
    // Drop Ember.Object subclassing instead
    super.init(...arguments);
    recordDataToRecordMap.set(properties._recordData, this);
    this._store = properties.store;
    this._recordData = properties._recordData;
    this._cache = Object.create(null);
    this._schema = get(properties.store, '_schemaManager');
    this._invalidRequests = [];
    this._errorRequests = [];
    this._lastError = null;

    this._topModel = this._topModel || this;
    this._parentModel = this._parentModel || null;
    this._errors = DS.Errors.create();
    this._init = true;

    this._flushInitProperties();
  }

  _setIdentifier(identifier) {
    this._identifier = identifier;
    this.store.getRequestStateService().subscribeForRecord(this._identifier, request => {
      if (request.state === 'rejected') {
        // TODO filter out queries
        this._lastError = request;
        if (!(request.result && request.result.error instanceof DS.InvalidError)) {
          this._errorRequests.push(request);
        } else {
          this._invalidRequests.push(request);
        }
      } else if (request.state === 'fulfilled') {
        this._invalidRequests = [];
        this._errorRequests = [];
        this._lastError = null;
      }
      this._notifyNetworkChanges();
    });
  }

  _notifyNetworkChanges() {
    ['isSaving', 'isValid', 'isError', 'adapterError', 'isReloading'].forEach(key =>
      notifyPropertyChange(this, key)
    );
  }

  _flushInitProperties() {
    let propertiesToFlush = initProperites;
    initProperites = Object.create(null);

    let keys = Object.keys(propertiesToFlush);
    if (keys.length > 0) {
      for (let i = 0; i < keys.length; ++i) {
        let key = keys[i];
        let value = propertiesToFlush[key];
        this.setUnknownProperty(key, value);
      }
    }
  }

  _markInvalidRequestAsClean() {
    this._invalidRequests = [];
    this._notifyNetworkChanges();
  }

  static get isM3Model() {
    return true;
  }
  /*
  static get isModel() {
    return true;
  }

  static create(properties) {
    return new this(properties);
  }
  */

  get _modelName() {
    return this._recordData.modelName;
  }

  __defineNonEnumerable(property) {
    this[property.name] = property.descriptor.value;
  }

  _notifyProperties(keys) {
    for (let i = 0, length = keys.length; i < length; i++) {
      this.notifyPropertyChange(keys[i]);
    }
  }

  notifyPropertyChange(key) {
    const recordData = recordDataFor(this);
    const schemaInterface = recordData.schemaInterface;
    let resolvedKeysInCache = schemaInterface._getDependentResolvedKeys(key);

    if (resolvedKeysInCache) {
      this._notifyProperties(resolvedKeysInCache);
    }

    if (!this._schema.isAttributeIncluded(this._modelName, key)) {
      return;
    }

    let oldValue = this._cache[key];
    let newValue = recordData.getAttr(key);

    let oldIsRecordArray = oldValue && oldValue instanceof M3RecordArray;

    if (oldIsRecordArray) {
      if (recordData.hasLocalAttr(key)) {
        // This is a change notification from a `set` on this model, for a
        // resolved record array.  The record array is already updated in-place.
        return;
      }
      let references =
        computeAttributeReference(key, newValue, this._modelName, schemaInterface, this._schema) ||
        [];
      oldValue._setReferences(references);
    } else {
      // TODO: disconnect recordData -> childRecordData in the case of nested model -> primitive
      // anything -> undefined | primitive
      delete this._cache[key];
      this._deferProprtyChange(key);
    }
  }

  _deferProprtyChange(key) {
    deferPropertyChange(this._store, this, key);
  }

  changedAttributes() {
    return this._recordData.changedAttributes();
  }

  trigger() {}

  get _debugContainerKey() {
    return 'MegamorphicModel';
  }

  debugJSON() {
    return recordDataFor(this)._debugJSON();
  }

  unloadRecord() {
    // can't call unloadRecord on nested m3 models
    this.store.unloadRecord(this);
    this._store._queryCache.unloadRecord(this);
  }

  set(key, value) {
    set(this, key, value);
  }

  serialize(options) {
    return this.store.serializeRecord(this, options);
  }

  toJSON() {
    return this.serialize();
  }

  save(options) {
    // TODO: we could return a PromiseObject as DS.Model does
    // this becomes this.store.scheduleSave(identifier)
    //return this.store.scheduleSave(this, options).then(() => this);
    return this.store.saveRecord(this, options).then(() => this);
  }

  reload(options = {}) {
    // passing in options here is something you can't actually do with DS.Model
    // but there isn't a good reason for this; that support should be added in
    // ember-data
    options.reload = true;
    return this._store.findRecord(this._modelName, this.id, options);
  }

  deleteRecord() {
    recordDataFor(this).setIsDeleted(true);
  }

  destroyRecord(options) {
    this.deleteRecord();
    return this.save(options);
  }

  rollbackAttributes() {
    this._markInvalidRequestAsClean();
    if (DEBUG) {
      assertNoChanges(this._store);
    }

    let dirtyKeys = recordDataFor(this).rollbackAttributes();

    if (dirtyKeys && dirtyKeys.length > 0) {
      this._notifyProperties(dirtyKeys);
    }
    flushChanges(this._store);
  }

  unknownProperty(key) {
    if (key in this._cache) {
      return this._cache[key];
    }

    if (!this._schema.isAttributeIncluded(this._modelName, key)) {
      return;
    }

    let rawValue = recordDataFor(this).getAttr(key);
    // TODO IGOR DAVID
    // figure out if any of the below should be moved into recordData
    if (rawValue === undefined) {
      let attrAlias = this._schema.getAttributeAlias(this._modelName, key);
      if (attrAlias) {
        const cp = readOnly(attrAlias);
        defineProperty(this, key, cp);
        return get(this, key);
      }

      let defaultValue = this._schema.getDefaultValue(this._modelName, key);

      // If default value is not defined, resolve the key for reference
      if (defaultValue !== undefined) {
        return (this._cache[key] = defaultValue);
      }
    }

    let value = this._schema.transformValue(this._modelName, key, rawValue);
    return (this._cache[key] = resolveValue(
      key,
      value,
      this._modelName,
      this._store,
      this._schema,
      this
    ));
  }

  get id() {
    if (!this._recordData) {
      return null;
    }
    return this._recordData.id;
  }

  set id(value) {
    //TODO need a test for this
    if (!this._init) {
      //this._internalModel.id = value;
      return;
    }

    if (value && value + '' === this.id) {
      return;
    }

    throw new Error(
      `You tried to set 'id' to '${value}' for '${this._modelName}' but records can only set their ID by providing it to store.createRecord()`
    );
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

    if (DEBUG) {
      assertNoChanges(this._store);
    }

    if (!this._schema.isAttributeIncluded(this._modelName, key)) {
      throw new Error(`Cannot set a non-whitelisted property ${key} on type ${this._modelName}`);
    }

    if (this._schema.getAttributeAlias(this._modelName, key)) {
      throw new Error(
        `You tried to set '${key}' to '${value}', but '${key}' is an alias in '${this._modelName}' and aliases are read-only`
      );
    }

    if (isArray(value)) {
      const cachedValue = this._cache[key];
      if (cachedValue instanceof M3RecordArray) {
        // We update record arrays in-place to match the semantics of setting a
        // `hasMany` attribute on a `DS.Model`.
        this._setRecordArray(key, value);
        notifyPropertyChange(this, key);
        return;
      }
    }

    // Set value in recordData
    this._setAttribute(key, value);

    let schemaInterface = recordDataFor(this).schemaInterface;
    let isResolved = this._schema.isAttributeResolved(this._modelName, key, value, schemaInterface);
    if (isResolved) {
      // resolved value, cache directly
      this._cache[key] = value;
    } else {
      // value that requires resolution; clear cache and let the next request
      // for the property resolve it
      delete this._cache[key];
      recordDataFor(this)._destroyChildRecordData(key);
    }

    // Remove errors upon setting of new value
    this._removeError(key);
    flushChanges(this._store);
    return;
  }

  _setRecordArray(key, models) {
    // Schema hook handles setting
    // list of resolved
    // models to recordData
    this._setAttribute(key, models);

    if (key in this._cache) {
      let recordArray = this._cache[key];
      recordArray.replace(0, get(recordArray, 'length'), models);
    }

    // Remove errors upon setting
    this._removeError(key);
  }

  _setAttribute(attr, value, suppressNotifications = false) {
    const recordData = recordDataFor(this);
    const schemaInterface = recordData.schemaInterface;
    let priorSuppressNotifications = schemaInterface._suppressNotifications;

    schemaInterface._suppressNotifications = suppressNotifications;
    this._schema.setAttribute(this._modelName, attr, value, schemaInterface);
    schemaInterface._suppressNotifications = priorSuppressNotifications;

    const isDirty = recordData.hasDirtyAttr();

    /*
    if (isDirty && !this.get('isDirty')) {
      this._updateCurrentState(updatedUncommitted);
    }
    */
  }

  _removeError(key) {
    // Remove errors for the property
    this._errors.remove(key);
    if (get(this._errors, 'length') === 0) {
      this._markInvalidRequestAsClean();
    }
  }

  static toString() {
    return 'MegamorphicModel';
  }

  toString() {
    return `<MegamorphicModel:${this.id}>`;
  }

  // Errors hash that will get update,
  // upon validation errors
  get errors() {
    return this._errors;
  }
}

MegamorphicModel.prototype.store = null;
MegamorphicModel.prototype._internalModel = null;
MegamorphicModel.prototype._recordData = null;
MegamorphicModel.prototype._parentModel = null;
MegamorphicModel.prototype._topModel = null;
MegamorphicModel.prototype._errors = null;
MegamorphicModel.prototype._invalidRequests = null;
MegamorphicModel.prototype._errorRequests = null;
MegamorphicModel.prototype._lastError = null;
MegamorphicModel.prototype.currentState = null;
MegamorphicModel.prototype.isError = null;
MegamorphicModel.prototype.adapterError = null;
MegamorphicModel.prototype._identifier = null;

MegamorphicModel.relationshipsByName = new Map();

/**
    If this property is `true` the record is in the `valid` state.

    A record will be in the `valid` state when the adapter did not report any
    server-side validation failures.

    @property isValid
    @type {Boolean}
    @readOnly
  */
const isValid = computed(function() {
  if (this.get('errors.length') > 0) {
    return false;
  }
  let invalidLength = this._invalidRequests.length;
  if (invalidLength === 0) {
    return true;
  }
  let invalidRequest = this._invalidRequests[invalidLength - 1];
  if (!invalidRequest) {
    return true;
  } else {
    return false;
  }
});

/**
 */
const isDirty = computed(function() {
  if (this._topModel !== this) {
    return this._topModel.get('isDirty');
  }
  return (
    this._recordData.hasChangedAttributes() ||
    ((this._recordData.isNew() || this._recordData.isDeleted()) &&
      this._recordData.isNew() !== this._recordData.isDeleted())
  );
}).volatile();

const isDeleted = computed(function() {
  return this._recordData.isDeleted();
}).volatile();

const isNew = computed(function() {
  return this._recordData.isNew();
});

const isSaving = computed(function() {
  let requests = this.store.getRequestStateService().getPendingRequestsForRecord(this._identifier);
  return !!requests.find(req => req.request.data[0].op === 'saveRecord');
});

const isLoaded = computed(function() {
  return this._recordData._pushed;
});

const isLoading = computed(function() {
  return !this.get('isLoaded');
});

const dirtyType = computed(function() {
  if (this._recordData.isNew()) {
    return 'created';
  }
  if (this._recordData.isDeleted()) {
    return 'deleted';
  }
  if (this._recordData.hasChangedAttributes()) {
    return 'updated';
  }
}).volatile();

const currentState = computed(function() {
  let stateName = 'root';
  stateName = stateName + '.loaded';
  if (this._recordData.hasChangedAttributes()) {
    stateName = stateName + '.updated.uncommitted';
  } else {
    stateName = stateName + '.saved';
  }
  return {
    stateName,
  };
}).volatile();
// STATE PROPS
defineProperty(MegamorphicModel.prototype, 'isLoading', isLoaded);
defineProperty(MegamorphicModel.prototype, 'isLoaded', isLoading);
defineProperty(MegamorphicModel.prototype, 'dirtyType', dirtyType);

defineProperty(MegamorphicModel.prototype, 'isDirty', isDirty);
defineProperty(
  MegamorphicModel.prototype,
  'isEmpty',
  computed(function() {
    return false;
  })
);
defineProperty(MegamorphicModel.prototype, 'isValid', isValid);
defineProperty(MegamorphicModel.prototype, 'isDeleted', isDeleted);
defineProperty(MegamorphicModel.prototype, 'isNew', isNew);
defineProperty(MegamorphicModel.prototype, 'isSaving', isSaving);

defineProperty(MegamorphicModel.prototype, 'currentState', currentState);

export class EmbeddedMegamorphicModel extends MegamorphicModel {
  save() {
    assert(
      `Nested models cannot be directly saved. Perhaps you meant to save the top level model, '${this._topModel._modelName}:${this._topModel.id}'`,
      false
    );
  }

  unloadRecord() {
    warn(
      `Nested models cannot be directly unloaded.  Perhaps you meant to unload the top level model, '${this._topModel._modelName}:${this._topModel.id}'`,
      false,
      { id: 'ember-m3.nested-model-unloadRecord' }
    );
  }

  get id() {
    return this.unknownProperty('id');
  }

  set id(value) {
    return this.setUnknownProperty('id', value);
  }

  static toString() {
    return 'EmbeddedMegamorphicModel';
  }

  toString() {
    return `<EmbeddedMegamorphicModel:${this.id}>`;
  }
}
