import { get } from '@ember/object';
import { dasherize } from '@ember/string';
import EmberObject from '@ember/object';
import MutableArray from '@ember/array/mutable';
import { A } from '@ember/array';
import MegamorphicModel, { EmbeddedMegamorphicModel } from './model';
import {
  resolveReferencesWithInternalModels,
  resolveReferencesWithRecords,
  isResolvedValue,
} from './utils/resolve';
import {
  deferArrayPropertyChange,
  deferPropertyChange,
  flushChanges,
} from './utils/notify-changes';
import { CUSTOM_MODEL_CLASS } from 'ember-m3/-infra/features';
import { recordDataToRecordMap, recordToRecordArrayMap } from './utils/caches';
import { recordIdentifierFor } from '@ember-data/store';

/**
 * BaseRecordArray
 *
 * @class BaseRecordArray
 */
let BaseRecordArray;
let baseRecordArrayProxyHandler;

const ArrayStateMap = new WeakMap();

class ArrayState {
  constructor({
    store,
    objects,
    _isAllReference,
    key,
    modelName,
    schema,
    model,
    record,
    resolved,
  }) {
    this._references = [];
    this._objects = objects || [];
    this._resolved = false;
    this.store = store || null;
    this._isAllReference = _isAllReference;

    // ManagedArray
    this._key = key;
    this.key = key;
    this._modelName = modelName;
    this._schema = schema;
    // TODO Clean this up
    this.record = record;
    this._record = model;
    this._resolved = resolved || false;
  }

  // returns the original length to notify
  _setObjects(objects, array) {
    let originalLength = this._objects.length;
    // TODO fix for query array to not copy real arrays
    this._objects = objects;
    this._resolved = true;
    registerWithObjects(objects, array);
    return originalLength;
  }

  objectAt(idx, array) {
    this._resolve(array);
    // TODO make this lazy again
    let record = this._objects[idx];
    return record;
  }

  _resolve(array) {
    if (this._resolved) {
      return;
    }

    if (this._references !== null) {
      let objects = resolveReferencesWithRecords(this.store, this._references);
      this._setObjects(objects, array);
    }

    this._resolved = true;
  }

  _removeObject(object) {
    if (this._resolved) {
      let index = this._objects.indexOf(object);
      if (index > -1) {
        this._objects.splice(index, 1);
        return true;
      }
    } else {
      for (let j = 0; j < this._references.length; ++j) {
        let { id, type } = this._references[j];
        let dtype = type && dasherize(type);
        // TODO we might not need the second condition
        let identifier = recordIdentifierFor(object);
        if ((dtype === null || dtype === identifier.type) && id === identifier.id) {
          this._references.splice(j, 1);
          break;
        }
      }
    }
  }

  _setReferences(references) {
    this._isAllReference = true;
    this._references = references;
    this._resolved = false;
    let originalLength = this._objects.length;
    this._objects = [];
    return originalLength;
  }

  _removeRecordData(recordData) {
    if (this._resolved) {
      let record = recordDataToRecordMap.get(recordData);
      if (!record) {
        return;
      }
      let index = this._objects.indexOf(record);
      if (index > -1) {
        this._objects.splice(index, 1);
        return index;
      }
    }
  }

  get length() {
    return this._resolved ? this._objects.length : this._references.length;
  }

  replace(idx, removeAmt, newRecords, array) {
    let addAmt = get(newRecords, 'length');
    let newObjects = new Array(addAmt);

    if (addAmt > 0) {
      let _newRecords = A(newRecords);
      for (let i = 0; i < newObjects.length; ++i) {
        newObjects[i] = _newRecords.objectAt(i);
      }
    }

    this._objects.splice(idx, removeAmt, ...newObjects);
    registerWithObjects(newObjects, array);
    this._resolved = true;
  }
}
function registerWithObjects(objects, recordArray) {
  objects.forEach((object) => {
    if (!object || !isResolvedValue(object)) {
      return;
    }
    associateRecordWithRecordArray(object, recordArray);
  });
}
const MANAGED_ARRAYS = new WeakSet();

if (CUSTOM_MODEL_CLASS) {
  const convertToInt = (prop) => {
    if (typeof prop === 'symbol') return null;

    const num = Number(prop);

    if (isNaN(num)) return null;

    return num % 1 === 0 ? num : null;
  };

  const BaseRecordArrayProxyHandler = class {
    get(target, key, receiver) {
      let index = convertToInt(key);

      if (index !== null) {
        return receiver.objectAt(index);
      }

      return Reflect.get(target, key, receiver);
    }

    set(target, key, value, receiver) {
      let index = convertToInt(key);

      if (index !== null) {
        receiver.replace(index, 1, [value]);
      } else {
        Reflect.set(target, key, value, receiver);
      }

      return true;
    }
  };

  baseRecordArrayProxyHandler = new BaseRecordArrayProxyHandler();
}

if (CUSTOM_MODEL_CLASS) {
  /**
   * BaseRecordArray
   *
   * @class BaseRecordArray
   */
  BaseRecordArray = class BaseRecordArray extends EmberObject.extend(MutableArray) {
    [Symbol.iterator]() {
      // get(this, '[]');
      let state = ArrayStateMap.get(this);
      state._resolve(this);
      // Sketch for modification untill confirmed
      return state._objects[Symbol.iterator]();
    }

    forEach(callback, target = null) {
     // get(this, '[]');
      let state = ArrayStateMap.get(this);
      state._resolve(this);
      let objects = state._objects;

      for (let index = 0; index < objects.length; index++) {
        callback.call(target, objects[index], index, this);
      }
    }

    // public RecordArray API
    static create(args, stateArgs) {
      let instance = super.create(args);
      let recordArrayState = new ArrayState(stateArgs);
      // let proxy = new Proxy(instance, baseRecordArrayProxyHandler);
      ArrayStateMap.set(instance, recordArrayState);
      // MANAGED_ARRAYS.add(proxy);
      return instance;
    }

    replace(idx, removeAmt, newRecords) {
      let state = ArrayStateMap.get(this);
      state.replace(idx, removeAmt, newRecords, this);
      this.arrayContentDidChange(idx, removeAmt, newRecords.length);
    }

    objectAt(idx) {
     // get(this, '[]');
      let state = ArrayStateMap.get(this);
      return state.objectAt(idx, this);
    }

    _removeObject(object) {
      let state = ArrayStateMap.get(this);
      if (state._removeObject(object)) {
        let store = state.store;
        deferArrayPropertyChange(store, this, 0, 1, 0);
        deferPropertyChange(store, this, '[]');
        deferPropertyChange(store, this, 'length');
        // eager change events here; we're not processing payloads (that goes
        // through `_setInternalModels`); we're doing `unloadRecord`
        flushChanges(store);
      }
    }

    // Private API
    _setObjects(objects, triggerChange = true) {
      let state = ArrayStateMap.get(this);
      let originalLength = state._setObjects(objects, this);
      if (triggerChange) {
        let store = state.store;
        deferArrayPropertyChange(store, this, 0, originalLength, objects.length);
        deferPropertyChange(store, this, '[]');
        deferPropertyChange(store, this, 'length');
      }

      // TODO check that his actually isn't needed in other paths that are now in the state object
      this.setProperties({
        isLoaded: true,
        isUpdating: false,
      });
    }

    _setReferences(references) {
      let state = ArrayStateMap.get(this);
      let originalLength = state._setReferences(references);
      let store = state.store;
      deferArrayPropertyChange(store, this, 0, originalLength, references.length);
      deferPropertyChange(store, this, '[]');
      deferPropertyChange(store, this, 'length');
    }

    _removeRecordData(recordData) {
      let state = ArrayStateMap.get(this);
      let index = state._removeRecordData(recordData);
      if (index > -1) {
        this.arrayContentDidChange(index, 1, 0);
      }
    }
    get _isAllReference() {
      let state = ArrayStateMap.get(this);
      return state._isAllReference;
    }

    get length() {
      // get(this, '[]');
      let state = ArrayStateMap.get(this);
      return state.length;
    }

    get _key() {
      let state = ArrayStateMap.get(this);
      return state.key;
    }
  };
} else {
  BaseRecordArray = class BaseRecordArray extends EmberObject.extend(MutableArray) {
    // public RecordArray API
    static create(...args) {
      let instance = super.create(...args);

      return instance;
    }

    init() {
      this._internalModels = A();
      super.init(...arguments);
      this._references = [];
      this._resolved = false;
      this.store = this.store || null;
    }

    replace(idx, removeAmt, newRecords) {
      let addAmt = get(newRecords, 'length');
      let newInternalModels = new Array(addAmt);

      if (addAmt > 0) {
        let _newRecords = A(newRecords);
        for (let i = 0; i < newInternalModels.length; ++i) {
          let newRecord = _newRecords.objectAt(i);
          newInternalModels[i] = newRecord._internalModel || newRecord;
        }
      }

      this._internalModels.replace(idx, removeAmt, newInternalModels);
      this._registerWithInternalModels(newInternalModels);
      this._resolved = true;

      this.arrayContentDidChange(idx, removeAmt, newRecords.length);
    }

    objectAt(idx) {
      this._resolve();
      let internalModel = this._internalModels[idx];
      return internalModel !== null && internalModel !== undefined
        ? typeof internalModel === 'object' && 'getRecord' in internalModel
          ? internalModel.getRecord()
          : internalModel
        : undefined;
    }

    // RecordArrayManager private api

    _pushInternalModels(internalModels) {
      this._resolve();
      this._internalModels.pushObjects(internalModels);
    }

    _removeInternalModels(internalModels) {
      if (this._resolved) {
        this._internalModels.removeObjects(internalModels);
        deferArrayPropertyChange(this.store, this, 0, internalModels.length, 0);
        deferPropertyChange(this.store, this, '[]');
        deferPropertyChange(this.store, this, 'length');
        // eager change events here; we're not processing payloads (that goes
        // through `_setInternalModels`); we're doing `unloadRecord`
        flushChanges(this.store);
      } else {
        for (let i = 0; i < internalModels.length; ++i) {
          let internalModel = internalModels[i];

          for (let j = 0; j < this._references.length; ++j) {
            let { id, type } = this._references[j];
            let dtype = type && dasherize(type);

            if ((dtype === null || dtype === internalModel.modelName) && id === internalModel.id) {
              this._references.splice(j, 1);
              break;
            }
          }
        }
      }
    }

    // Private API

    _setInternalModels(internalModels, triggerChange = true) {
      let originalLength = this._internalModels.length;
      this._internalModels.replace(0, this._internalModels.length, internalModels);
      if (triggerChange) {
        deferArrayPropertyChange(this.store, this, 0, originalLength, this._internalModels.length);
        deferPropertyChange(this.store, this, '[]');
        deferPropertyChange(this.store, this, 'length');
      }

      this.setProperties({
        isLoaded: true,
        isUpdating: false,
      });

      this._registerWithInternalModels(internalModels);
      this._resolved = true;
    }

    _setReferences(references) {
      this._isAllReference = true;
      this._references = references;
      this._resolved = false;
      let originalLength = this._internalModels.length;
      this._internalModels = A();
      deferArrayPropertyChange(this.store, this, 0, originalLength, this._internalModels.length);
      deferPropertyChange(this.store, this, '[]');
      deferPropertyChange(this.store, this, 'length');
    }

    _registerWithInternalModels(internalModels) {
      for (let i = 0, l = internalModels.length; i < l; i++) {
        let internalModel = internalModels[i];

        // allow refs to point to resources not in the store
        // TODO: instead add a schema missing ref hook; #254
        if (
          internalModel !== null &&
          internalModel !== undefined &&
          typeof internalModel === 'object' &&
          '_recordArrays' in internalModel
        ) {
          internalModel._recordArrays.add(this);
        }
      }
    }

    _resolve() {
      if (this._resolved) {
        return;
      }

      if (this._references !== null) {
        let internalModels = resolveReferencesWithInternalModels(this.store, this._references);
        this._setInternalModels(internalModels, false);
      }

      this._resolved = true;
    }

    get length() {
      return this._resolved ? this._internalModels.length : this._references.length;
    }
  };
}

if (CUSTOM_MODEL_CLASS) {
  // Add native array methods here
  Object.assign(BaseRecordArray.prototype, {
    values: Array.prototype.values,
    keys: Array.prototype.keys,
    entries: Array.prototype.entries,
    copyWithin: Array.prototype.copyWithin,
    fill: Array.prototype.fill,
    findIndex: Array.prototype.findIndex,
    at: Array.prototype.at,
    join: Array.prototype.join,

    push(...values) {
      return this.pushObjects(values);
    },

    pop(...values) {
      return this.popObjects(values);
    },

    shift(...values) {
      return this.shiftObjects(values);
    },

    unshift(...values) {
      return this.unshiftObjects(values);
    },

    splice(idx, amt, ...values) {
      return this.replace(idx, amt, values);
    },

    some(callback) {
      return this.any(callback);
    },

    concat(values) {
      return this.toArray().concat(...values);
    },

    reverse() {
      let reversed = this.toArray().reverse();
      this.replace(0, this.length, reversed);
    },

    reduceRight(callback, init) {
      return this.toArray().reduceRight(callback, init);
    },

    sort(callback) {
      let sorted = this.toArray().sort(callback);
      this.replace(0, this.length, sorted);
    },
  });
}

export function associateRecordWithRecordArray(record, recordArray) {
  if (record instanceof EmbeddedMegamorphicModel) {
    // embedded models can be added across tracked arrays (although this is
    // weird) but since they can't be unloaded there's no need to associate the
    // array with the model
    //
    // unloading the top model after adding one of its embedded models to some
    // other tracked array is undefined behaviour
    return;
  }
  if (CUSTOM_MODEL_CLASS) {
    if (record instanceof MegamorphicModel) {
      record._recordData._recordArrays.add(recordArray);
    } else {
      let recordArrays = recordToRecordArrayMap.get(record);
      if (!recordArrays) {
        recordToRecordArrayMap.set(record, [recordArray]);
      } else {
        recordArrays.push(recordArray);
      }
    }
  }
}

export default BaseRecordArray;
export { ArrayStateMap, MANAGED_ARRAYS };
