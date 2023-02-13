import { get } from '@ember/object';
import { dasherize } from '@ember/string';
import EmberObject, { notifyPropertyChange } from '@ember/object';
import MutableArray from '@ember/array/mutable';
import { A } from '@ember/array';
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
import HAS_NATIVE_PROXY from './utils/has-native-proxy';
import require from 'require';

/**
 * BaseRecordArray
 *
 * @class BaseRecordArray
 */
let BaseRecordArray;
let baseRecordArrayProxyHandler;

if (CUSTOM_MODEL_CLASS) {
  const convertToInt = (prop) => {
    if (typeof prop === 'symbol') return null;

    const num = Number(prop);

    if (isNaN(num)) return null;

    return num % 1 === 0 ? num : null;
  };

  const BaseRecordArrayProxyHandler = class {
    getPrototypeOf(target) {
      return Object.getPrototypeOf(target.__recordArray);
    }
    get(target, key, receiver) {
      let index = convertToInt(key);

      if (index !== null) {
        return target.__recordArray.objectAt(key);
      }

      return Reflect.get(target.__recordArray, key, receiver);
    }

    set(target, key, value, receiver) {
      let index = convertToInt(key);

      if (index !== null) {
        receiver.replace(index, 1, [value]);
      } else {
        if (typeof value === 'function') {
          // TODO: we don't really need to ignore all functions
          // We want to ignore the functions from Ember.A(proxy) as they will
          // clobber our own implementations
          //
          // We have to do this because BaseRecordArray.create -> init ->
          // setEmerArray occurs before the proxy can be created.
          //
          // Later, if a user Ember.A(recordArrayProxy) Ember.A will mistakenly
          // think it's not an ember array and apply the NativeArray mixin to
          // the proxy.
          //
          // We should stop extending EmberObject.extend(MutableArray), but we
          // still need to prevent Ember.A from clobbering our own objectAt &c.
          return true;
        }

        Reflect.set(target.__recordArray, key, value);
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
    [Symbol.iterator] = Array.prototype.values;

    // public RecordArray API
    static create(...args) {
      let instance = super.create(...args);
      if (HAS_NATIVE_PROXY) {
        let arr = [];
        arr.__recordArray = instance;
        return new Proxy(arr, baseRecordArrayProxyHandler);
        // IE11 support
      } else {
        return instance;
      }
    }

    init() {
      super.init(...arguments);
      this._references = [];
      if (!this._objects) {
        this._objects = [];
      }
      this._resolved = false;
      this.store = this.store || null;
    }

    replace(idx, removeAmt, newRecords) {
      let addAmt = get(newRecords, 'length');
      let newObjects = new Array(addAmt);

      if (addAmt > 0) {
        let _newRecords = A(newRecords);
        for (let i = 0; i < newObjects.length; ++i) {
          newObjects[i] = _newRecords.objectAt(i);
        }
      }

      this._objects.splice(idx, removeAmt, ...newObjects);
      notifyPropertyChange(this, '[]');
      this._registerWithObjects(newObjects);
      this._resolved = true;
    }

    objectAt(idx) {
      this._resolve();
      // TODO make this lazy again
      let record = this._objects[idx];
      return record;
    }

    get firstObject() {
      return this.objectAt(0);
    }

    get lastObject() {
      return this.objectAt(this.length - 1);
    }

    _removeObject(object) {
      if (this._resolved) {
        let idx = this._objects.indexOf(object);
        if (idx > -1) {
          this._objects.splice(idx, 1);
          deferArrayPropertyChange(this.store, this, idx, 1, 0);
          deferPropertyChange(this.store, this, '[]');
          deferPropertyChange(this.store, this, 'length');
          // eager change events here; we're not processing payloads (that goes
          // through `_setInternalModels`); we're doing `unloadRecord`
          flushChanges(this.store);
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

    // Private API
    _setObjects(objects, triggerChange = true) {
      let originalLength = this._objects.length;
      if (triggerChange) {
        this._objects.splice(0, this._objects.length, ...objects);
        deferArrayPropertyChange(this.store, this, 0, originalLength, this._objects.length);
        deferPropertyChange(this.store, this, '[]');
        deferPropertyChange(this.store, this, 'length');
      } else {
        this._objects.splice(0, this._objects.length, ...objects);
      }

      this.setProperties({
        isLoaded: true,
        isUpdating: false,
      });

      this._registerWithObjects(objects);
      this._resolved = true;
    }

    _setReferences(references) {
      this._isAllReference = true;
      this._references = references;
      this._resolved = false;
      let originalLength = this._objects.length;
      this._objects = [];
      deferArrayPropertyChange(this.store, this, 0, originalLength, this._objects.length);
      deferPropertyChange(this.store, this, '[]');
      deferPropertyChange(this.store, this, 'length');
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
          notifyPropertyChange(this, '[]');
        }
      }
    }

    _registerWithObjects(objects) {
      objects.forEach((object) => {
        if (!object || !isResolvedValue(object)) {
          return;
        }
        associateRecordWithRecordArray(object, this);
      });
    }

    // Need to override `removeAt`, `pushObject`, and `insertAt` because the default implementations by
    // MutableArray will end up calling replaceInNativeArray and not our own replace after an `isArray` check
    // https://github.com/emberjs/ember.js/blob/21bd70c773dcc4bfe4883d7943e8a68d203b5bad/packages/%40ember/-internals/metal/lib/array.ts#L27
    // https://github.com/emberjs/ember.js/blob/21bd70c773dcc4bfe4883d7943e8a68d203b5bad/packages/%40ember/-internals/metal/lib/array.ts#L38
    removeAt(index, len = 1) {
      this.replace(index, len, []);
      return this;
    }

    pushObject(obj) {
      return this.insertAt(this.length, obj);
    }

    insertAt(idx, object) {
      return this.replace(idx, 0, [object]);
    }

    _resolve() {
      if (this._resolved) {
        return;
      }

      if (this._references !== null) {
        let objects = resolveReferencesWithRecords(this.store, this._references);
        this._setObjects(objects, false);
      }

      this._resolved = true;
    }

    get length() {
      return this._resolved ? this._objects.length : this._references.length;
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

      notifyPropertyChange(this, '[]');
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

    shift() {
      return this.shiftObject();
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

let MegamorphicModel, EmbeddedMegamorphicModel;
export function associateRecordWithRecordArray(record, recordArray) {
  // Doing the require at runtime to avoid creating a circular dependency
  if (MegamorphicModel === undefined) {
    let modelModule = require('ember-m3/model');
    MegamorphicModel = modelModule.default;
    EmbeddedMegamorphicModel = modelModule.EmbeddedMegamorphicModel;
  }
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
  } else {
    record._internalModel._recordArrays.add(recordArray);
  }
}

export default BaseRecordArray;
