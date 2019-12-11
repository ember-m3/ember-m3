// This lint error disables "this.attrs" everywhere.  What could go wrong?
/* eslint-disable ember/no-attrs-in-components */

import DS from 'ember-data';
import { RootState } from 'ember-data/-private';
import EmberObject, { computed, get, set, defineProperty } from '@ember/object';
import { isArray } from '@ember/array';
import { assert, warn } from '@ember/debug';
import { readOnly } from '@ember/object/computed';
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
import { CUSTOM_MODEL_CLASS } from './feature-flags';
const {
  deleted: { uncommitted: deletedUncommitted, saved: deletedSaved },
  loaded: {
    saved: loadedSaved,
    updated: { uncommitted: updatedUncommitted },
  },
} = RootState;

let retrieveFromCurrentState;
if (!CUSTOM_MODEL_CLASS) {
  retrieveFromCurrentState = computed('_topModel.currentState', function(key) {
    return this._topModel._internalModel.currentState[key];
  }).readOnly();
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

export default class MegamorphicModel extends EmberObject {
  init(properties) {
    // Drop Ember.Object subclassing instead
    super.init(...arguments);
    if (CUSTOM_MODEL_CLASS) {
      recordDataToRecordMap.set(properties._recordData, this);
      this._recordData = properties._recordData;
      // Invalid and error requests mimic the current ED implementation
      // @hjdivad suggested that we might not need to keep arrays of requests
      // and might just keep the properties.
      // TODO investigate that in ED and if so, we should simplify this case as well
      this._invalidRequests = [];
      this._errorRequests = [];
      this._lastErrorRequest = null;
    }
    this._store = properties.store;
    this._cache = Object.create(null);
    this._schema = get(properties.store, '_schemaManager');

    this._topModel = this._topModel || this;
    this._parentModel = this._parentModel || null;
    this._errors = null;
    this._init = true;
    if (!CUSTOM_MODEL_CLASS) {
      this._internalModel = properties._internalModel;
    }

    this._flushInitProperties();
  }

  _setIdentifier(identifier) {
    if (CUSTOM_MODEL_CLASS) {
      this._identifier = identifier;
      this._store.getRequestStateService().subscribeForRecord(this._identifier, request => {
        if (request.state === 'rejected') {
          // TODO filter out queries
          this._lastErrorRequest = request;
          if (!(request.result && request.result.error instanceof DS.InvalidError)) {
            this._errorRequests.push(request);
          } else {
            this._invalidRequests.push(request);
          }
        } else if (request.state === 'fulfilled') {
          this._invalidRequests = [];
          this._errorRequests = [];
          this._lastErrorRequest = null;
        }
        this._notifyNetworkChanges();
      });
    }
  }

  _notifyNetworkChanges() {
    if (CUSTOM_MODEL_CLASS) {
      ['isSaving', 'isValid', 'isError', 'adapterError', 'isReloading'].forEach(key =>
        notifyPropertyChange(this, key)
      );
    }
  }

  eachAttribute(callback, binding) {
    let recordData = recordDataFor(this);
    return recordData.eachAttribute(callback, binding);
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

  _clearInvalidRequestErrors() {
    if (CUSTOM_MODEL_CLASS) {
      this._invalidRequests = [];
      this._notifyNetworkChanges();
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

  get _modelName() {
    if (CUSTOM_MODEL_CLASS) {
      return this._recordData.getResourceIdentifier().type;
    } else {
      return this._internalModel.modelName;
    }
  }

  _updateCurrentState(state) {
    if (CUSTOM_MODEL_CLASS) {
      notifyPropertyChange(this, 'isDirty');
      notifyPropertyChange(this, 'isDeleted');
      notifyPropertyChange(this, 'isNew');
      // TODO need to walk the chain down as well to notify changes
    }
    if (this !== this._topModel) {
      this._topModel._updateCurrentState(state);
      return;
    }
    // assert we don't need this anymore
    if (!CUSTOM_MODEL_CLASS) {
      this._internalModel.currentState = state;
      // currentState is defined on the prototype and will be treated as
      // non-volatile, so it's safe to eagerly send a change event
      notifyPropertyChange(this, 'currentState');
    }
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
    if (CUSTOM_MODEL_CLASS) {
      return this._recordData.changedAttributes();
    } else {
      return this._internalModel.changedAttributes();
    }
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
    if (CUSTOM_MODEL_CLASS) {
      this._store.unloadRecord(this);
    } else {
      this._internalModel.unloadRecord();
    }
    this._store._queryCache.unloadRecord(this);
  }

  set(key, value) {
    set(this, key, value);
  }

  serialize(options) {
    if (CUSTOM_MODEL_CLASS) {
      return this._store.serializeRecord(this, options);
    } else {
      return this._internalModel.createSnapshot().serialize(options);
    }
  }

  toJSON() {
    return this.serialize();
  }

  save(options) {
    // TODO: we could return a PromiseObject as DS.Model does
    if (CUSTOM_MODEL_CLASS) {
      return this._store.saveRecord(this, options).then(() => this);
    } else {
      return this._internalModel.save(options).then(() => this);
    }
  }

  reload(options = {}) {
    // passing in options here is something you can't actually do with DS.Model
    // but there isn't a good reason for this; that support should be added in
    // ember-data
    options.reload = true;
    return this._store.findRecord(this._modelName, this.id, options);
  }

  deleteRecord() {
    if (CUSTOM_MODEL_CLASS) {
      recordDataFor(this).setIsDeleted(true);
      this._updateCurrentState();
    } else {
      let newState = get(this, 'isNew') ? deletedSaved : deletedUncommitted;
      this._updateCurrentState(newState);
    }
  }

  destroyRecord(options) {
    this.deleteRecord();
    if (CUSTOM_MODEL_CLASS) {
      return this.save(options);
    } else {
      return this._internalModel.save(options);
    }
  }

  rollbackAttributes() {
    this._clearInvalidRequestErrors();
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
    if (CUSTOM_MODEL_CLASS) {
      return this._recordData.getResourceIdentifier().id;
    } else {
      return this._internalModel.id;
    }
  }

  set id(value) {
    //TODO need a test for this
    if (!this._init) {
      if (!CUSTOM_MODEL_CLASS) {
        this._internalModel.id = value;
      }
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

    const hasDirtyAttr = recordData.hasDirtyAttr();
    const isDirty = get(this, 'isDirty');

    if (hasDirtyAttr && !isDirty) {
      this._updateCurrentState(updatedUncommitted);
    } else if (!hasDirtyAttr && isDirty) {
      this._updateCurrentState(loadedSaved);
    }
  }

  _removeError(key) {
    // Remove errors for the property
    this.errors.remove(key);
    if (CUSTOM_MODEL_CLASS) {
      if (get(this.errors, 'length') === 0) {
        this._clearInvalidRequestErrors();
      }
    } else {
      if (
        this._internalModel.currentState &&
        !this._internalModel.currentState.isValid &&
        get(this.errors, 'length') === 0
      ) {
        this._updateCurrentState(updatedUncommitted);
      }
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
    if (this._errors === null) {
      this._errors = DS.Errors.create();
    }
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
MegamorphicModel.prototype._lastErrorRequest = null;
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
let isValid;
if (CUSTOM_MODEL_CLASS) {
  isValid = computed(function() {
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
} else {
  isValid = retrieveFromCurrentState;
}

/**
 */
let isDirty;
if (CUSTOM_MODEL_CLASS) {
  isDirty = computed('_topModel.isDirty', function() {
    if (this._topModel !== this) {
      return this._topModel.get('isDirty');
    }
    return (
      this._recordData.hasChangedAttributes() ||
      ((this._recordData.isNew() || this._recordData.isDeleted()) &&
        this._recordData.isNew() !== this._recordData.isDeleted())
    );
  });
} else {
  isDirty = retrieveFromCurrentState;
}

let isDeleted;
if (CUSTOM_MODEL_CLASS) {
  isDeleted = computed(function() {
    return this._recordData.isDeleted();
  });
} else {
  isDeleted = retrieveFromCurrentState;
}

let isNew;
if (CUSTOM_MODEL_CLASS) {
  isNew = computed(function() {
    return this._recordData.isNew();
  });
} else {
  isNew = retrieveFromCurrentState;
}

let isSaving;
if (CUSTOM_MODEL_CLASS) {
  isSaving = computed(function() {
    let requests = this._store
      .getRequestStateService()
      .getPendingRequestsForRecord(this._identifier);
    return !!requests.find(req => req.request.data[0].op === 'saveRecord');
  });
} else {
  isSaving = retrieveFromCurrentState;
}

let isLoaded;
if (CUSTOM_MODEL_CLASS) {
  isLoaded = computed(function() {
    //TODO this seems untested right now
    return this._recordData._isLoaded;
  });
} else {
  isLoaded = retrieveFromCurrentState;
}

let isLoading;
if (CUSTOM_MODEL_CLASS) {
  isLoading = computed(function() {
    return !this.get('isLoaded');
  });
} else {
  isLoading = retrieveFromCurrentState;
}

let dirtyType;
if (CUSTOM_MODEL_CLASS) {
  dirtyType = computed(function() {
    if (this._recordData.isNew()) {
      return 'created';
    }
    if (this._recordData.isDeleted()) {
      return 'deleted';
    }
    if (this._recordData.hasChangedAttributes()) {
      return 'updated';
    }
    return undefined;
  });
} else {
  dirtyType = retrieveFromCurrentState;
}

// STATE PROPS
defineProperty(MegamorphicModel.prototype, 'isLoading', isLoaded);
defineProperty(MegamorphicModel.prototype, 'isLoaded', isLoading);
defineProperty(MegamorphicModel.prototype, 'dirtyType', dirtyType);

defineProperty(MegamorphicModel.prototype, 'isDirty', isDirty);
defineProperty(MegamorphicModel.prototype, 'isEmpty', function() {
  return false;
});
defineProperty(MegamorphicModel.prototype, 'isValid', isValid);
defineProperty(MegamorphicModel.prototype, 'isDeleted', isDeleted);
defineProperty(MegamorphicModel.prototype, 'isNew', isNew);
defineProperty(MegamorphicModel.prototype, 'isSaving', isSaving);

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
  serialize(options) {
    return this._store.serializerFor('-ember-m3').serialize(new EmbeddedSnapshot(this), options);
  }
}

export class EmbeddedSnapshot {
  constructor(record) {
    this.record = record;
    this.modelName = record._modelName;
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
