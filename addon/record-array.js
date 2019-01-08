import { get } from '@ember/object';
import { dasherize } from '@ember/string';
import EmberObject from '@ember/object';
import MutableArray from '@ember/array/mutable';
import { A } from '@ember/array';
import { EmbeddedMegamorphicModel } from './model';
import { resolveReferencesWithInternalModels } from './utils/resolve';
import {
  deferArrayPropertyChange,
  deferPropertyChange,
  flushChanges,
} from './utils/notify-changes';
import { resolveReferencesWithRecords } from './utils/resolve';
import { recordDataToRecordMap } from './initializers/m3-store';

/**
 * M3RecordArray
 *
 * @class M3RecordArray
 * @extends DS.RecordArray
 */
export default class M3RecordArray extends EmberObject {
  // public RecordArray API

  init() {
    super.init(...arguments);
    this._references = [];
    this._objects = A();
    this._resolved = false;
    this.store = this.store || null;
  }

  replace(idx, removeAmt, newRecords) {
    //debugger
    let addAmt = get(newRecords, 'length');
    let newObjects = new Array(addAmt);

    if (addAmt > 0) {
      let _newRecords = A(newRecords);
      for (let i = 0; i < newObjects.length; ++i) {
        newObjects[i] = _newRecords.objectAt(i);
      }
    }

    this._objects.replace(idx, removeAmt, newObjects);
    this._registerWithObjects(newObjects);
    this._resolved = true;

    deferArrayPropertyChange(this.store, this, idx, removeAmt, addAmt);
    deferPropertyChange(this.store, this, '[]');
    deferPropertyChange(this.store, this, 'length');

    // eager change events on mutation as mutations are user entry points
    flushChanges(this.store);
  }

  objectAtContent(idx) {
    // TODO make this lazy again
    let record = this._objects[idx];
    return record;
  }

  objectAt(idx) {
    this._resolve();
    return this.objectAtContent(idx);
  }

  // RecordArrayManager private api

  _pushObjects(objects) {
    //debugger
    this._resolve();
    this._objects.pushObjects(objects);
  }

  _removeObjects(objects) {
    //debugger
    if (this._resolved) {
      this._objects.removeObjects(objects);
      deferArrayPropertyChange(this.store, this, 0, objects.length, 0);
      deferPropertyChange(this.store, this, '[]');
      deferPropertyChange(this.store, this, 'length');
      // eager change events here; we're not processing payloads (that goes
      // through `_setInternalModels`); we're doing `unloadRecord`
      flushChanges(this.store);
    } else {
      for (let i = 0; i < objects.length; ++i) {
        let object = objects[i];

        for (let j = 0; j < this._references.length; ++j) {
          let { id, type } = this._references[j];
          let dtype = type && dasherize(type);
          // TODO we might not need the second condition
          if (
            (dtype === null ||
              dtype === object.modelName ||
              dtype === object._recordData.modelName) &&
            id === object.id
          ) {
            this._references.splice(j, 1);
            break;
          }
        }
      }
    }
  }

  // Private API

  _setObjects(objects, triggerChange = true) {
    debugger;
    let originalLength = this._objects.length;
    if (triggerChange) {
      this._objects.replace(0, this._objects.length, objects);
      deferArrayPropertyChange(this.store, this, 0, originalLength, this._objects.length);
      deferPropertyChange(this.store, this, '[]');
      deferPropertyChange(this.store, this, 'length');
    } else {
      // TODO this seems different now
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
    this._references = references;
    this._resolved = false;
    let originalLength = this._objects.length;
    this._objects = A();
    deferArrayPropertyChange(this.store, this, 0, originalLength, this._objects.length);
    deferPropertyChange(this.store, this, '[]');
    deferPropertyChange(this.store, this, 'length');
  }

  _removeRecordData(recordData) {
    debugger;
    if (this._resolved) {
      let record = recordDataToRecordMap.get(recordData);
      if (!record) {
        return;
      }
      this._objects.removeObjects([record]);
      deferArrayPropertyChange(this.store, this, 0, 1, 0);
      deferPropertyChange(this.store, this, '[]');
      deferPropertyChange(this.store, this, 'length');
      // eager change events here; we're not processing payloads (that goes
      // through `_setInternalModels`); we're doing `unloadRecord`
      flushChanges(this.store);
    } else {
      /*
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
      */
    }
  }

  _registerWithObjects(records) {
    //debugger;
    /*
    for (let i = 0, l = objects.length; i < l; i++) {
      let object = objects[i];

      // allow refs to point to resources not in the store
      // TODO: instead add a schema missing ref hook; #254
      if (object !== null && object !== undefined) {
        object._recordArrays.add(this);
      }
    }
    */
    records.forEach(record => record && record._recordData._recordArrays.add(this));
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
}

M3RecordArray.reopen(MutableArray);

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
  record._recordData._recordArrays.add(recordArray);
}
