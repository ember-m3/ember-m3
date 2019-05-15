// This lint error disables "this.attrs" everywhere.  What could go wrong?
/* eslint-disable ember/no-attrs-in-components */

import DS from 'ember-data';
import { RootState } from 'ember-data/-private';
import EmberObject, { computed, get, set, defineProperty } from '@ember/object';
import { isArray } from '@ember/array';
import { assert, warn } from '@ember/debug';
import { readOnly } from '@ember/object/computed';
import { IS_RECORD_DATA } from 'ember-compatibility-helpers';

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
    this.modelName = this.record._internalModel.modelName;
    this.attrs = Object.create(null);
    this.eachAttribute(key => (this.attrs[key] = this.record.get(key)));
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

// TODO: shouldn't need this anymore; this level of indirection for nested recordData isn't useful
export class EmbeddedInternalModel {
  constructor({ id, modelName, parentInternalModel, parentKey, parentIdx }) {
    this.id = id;
    this.modelName = modelName;

    let recordData = recordDataFor(parentInternalModel)._getChildRecordData(
      parentKey,
      parentIdx,
      modelName,
      id,
      this
    );
    this._recordData = recordData;

    if (!IS_RECORD_DATA) {
      this._modelData = recordData;
    }

    this.parentInternalModel = parentInternalModel;

    this.record = null;
  }

  createSnapshot() {
    return new EmbeddedSnapshot(this.record);
  }

  changedAttributes() {
    return this._recordData.changedAttributes();
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

const retrieveFromCurrentState = computed('_topModel.currentState', function(key) {
  return this._topModel._internalModel.currentState[key];
}).readOnly();

// global buffer for initial properties to work around
//  a)  can't write to `this` before `super`
//  b)  core_object writes properties before calling `init`; this means that no
//      CP or setknownProperty can rely on any initialization
let initProperites = Object.create(null);

export default class MegamorphicModel extends EmberObject {
  init(properties) {
    // Drop Ember.Object subclassing instead
    super.init(...arguments);
    this._store = properties.store;
    this._internalModel = properties._internalModel;
    this._cache = Object.create(null);
    this._schema = get(properties.store, '_schemaManager');

    this._topModel = this._topModel || this;
    this._parentModel = this._parentModel || null;
    this._errors = DS.Errors.create();
    this._init = true;

    this._flushInitProperties();
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

  static get isModel() {
    return true;
  }

  static get klass() {
    return MegamorphicModel;
  }

  static get attributes() {
    return YesManAttributes;
  }

  static eachRelationship(/* callback */) {}

  get _modelName() {
    return this._internalModel.modelName;
  }

  __defineNonEnumerable(property) {
    this[property.name] = property.descriptor.value;
  }

  _notifyProperties(keys) {
    for (let i = 0, length = keys.length; i < length; i++) {
      this.notifyPropertyChange(keys[i]);
    }
  }

  _updateCurrentState(state) {
    if (this !== this._topModel) {
      this._topModel._updateCurrentState(state);
      return;
    }
    this._internalModel.currentState = state;
    // currentState is defined on the prototype and will be treated as
    // non-volatile, so it's safe to eagerly send a change event
    notifyPropertyChange(this, 'currentState');
  }

  notifyPropertyChange(key) {
    if (!this._schema.isAttributeIncluded(this._modelName, key)) {
      return;
    }
    const recordData = recordDataFor(this);
    const schemaInterface = recordData.schemaInterface;
    let resolvedKeysInCache = schemaInterface._getDependentResolvedKeys(key);

    if (resolvedKeysInCache) {
      this._notifyProperties(resolvedKeysInCache);
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
    return this._internalModel.changedAttributes();
  }

  trigger() {}

  get _debugContainerKey() {
    return 'MegamorphicModel';
  }

  debugJSON() {
    return recordDataFor(this)._data;
  }

  eachAttribute(callback, binding) {
    return recordDataFor(this).eachAttribute(callback, binding);
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

  reload(options = {}) {
    // passing in options here is something you can't actually do with DS.Model
    // but there isn't a good reason for this; that support should be added in
    // ember-data
    options.reload = true;
    return this._store.findRecord(this._modelName, this.id, options);
  }

  deleteRecord() {
    let newState = get(this, 'isNew') ? deletedSaved : deletedUncommitted;
    this._updateCurrentState(newState);
  }

  destroyRecord(options) {
    this.deleteRecord();
    return this._internalModel.save(options);
  }

  rollbackAttributes() {
    if (DEBUG) {
      assertNoChanges(this._store);
    }

    let dirtyKeys = recordDataFor(this).rollbackAttributes();
    this._updateCurrentState(loadedSaved);

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
    return this._internalModel.id;
  }

  set id(value) {
    if (!this._init) {
      this._internalModel.id = value;
      return;
    }

    if (value && value + '' === this.id) {
      return;
    }

    throw new Error(
      `You tried to set 'id' to '${value}' for '${
        this._modelName
      }' but records can only set their ID by providing it to store.createRecord()`
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
        `You tried to set '${key}' to '${value}', but '${key}' is an alias in '${
          this._modelName
        }' and aliases are read-only`
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
      recordArray.replaceContent(0, get(recordArray, 'length'), models);
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

    const isDirty = recordData.isAttrDirty(attr);

    if (isDirty && !this.get('isDirty')) {
      this._updateCurrentState(updatedUncommitted);
    }
  }

  _removeError(key) {
    // Remove errors for the property
    this._errors.remove(key);
    if (
      this._internalModel.currentState &&
      !this._internalModel.currentState.isValid &&
      get(this._errors, 'length') === 0
    ) {
      this._updateCurrentState(updatedUncommitted);
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
MegamorphicModel.prototype._parentModel = null;
MegamorphicModel.prototype._topModel = null;
MegamorphicModel.prototype._errors = null;
MegamorphicModel.prototype.currentState = null;
MegamorphicModel.prototype.isError = null;
MegamorphicModel.prototype.adapterError = null;

MegamorphicModel.relationshipsByName = new Map();

// STATE PROPS
defineProperty(MegamorphicModel.prototype, 'isEmpty', retrieveFromCurrentState);
defineProperty(MegamorphicModel.prototype, 'isLoading', retrieveFromCurrentState);
defineProperty(MegamorphicModel.prototype, 'isLoaded', retrieveFromCurrentState);
defineProperty(MegamorphicModel.prototype, 'isSaving', retrieveFromCurrentState);
defineProperty(MegamorphicModel.prototype, 'isDeleted', retrieveFromCurrentState);
defineProperty(MegamorphicModel.prototype, 'isNew', retrieveFromCurrentState);
defineProperty(MegamorphicModel.prototype, 'isValid', retrieveFromCurrentState);
defineProperty(MegamorphicModel.prototype, 'isDirty', retrieveFromCurrentState);
defineProperty(MegamorphicModel.prototype, 'dirtyType', retrieveFromCurrentState);

export class EmbeddedMegamorphicModel extends MegamorphicModel {
  save() {
    assert(
      `Nested models cannot be directly saved. Perhaps you meant to save the top level model, '${
        this._topModel._modelName
      }:${this._topModel.id}'`,
      false
    );
  }

  unloadRecord() {
    warn(
      `Nested models cannot be directly unloaded.  Perhaps you meant to unload the top level model, '${
        this._topModel._modelName
      }:${this._topModel.id}'`,
      false,
      { id: 'ember-m3.nested-model-unloadRecord' }
    );
  }

  // no special behaviour for ids of embedded/nested models

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
