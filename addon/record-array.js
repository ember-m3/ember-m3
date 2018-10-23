import { get } from '@ember/object';
import { RecordArray } from 'ember-data/-private';
import { A } from '@ember/array';
import { EmbeddedMegamorphicModel } from './model';

/**
 * M3RecordArray
 *
 * @class M3RecordArray
 * @extends DS.RecordArray
 */
export default class M3RecordArray extends RecordArray {
  // TODO: implement more of RecordArray but make this not an arrayproxy

  replace(idx, removeAmt, newRecords) {
    this.replaceContent(idx, removeAmt, newRecords);
  }

  replaceContent(idx, removeAmt, newRecords) {
    let _newRecords = A(newRecords);
    let addAmt = get(_newRecords, 'length');

    let newInternalModels = new Array(addAmt);
    for (let i = 0; i < newInternalModels.length; ++i) {
      newInternalModels[i] = _newRecords.objectAt(i)._internalModel;
    }
    this.content.replace(idx, removeAmt, newInternalModels);
    this._registerWithInternalModels(newInternalModels);
  }

  _update() {
    if (!this.query) {
      throw new Error(`Can't update RecordArray without a query`);
    }

    let { url, params, method, cacheKey } = this.query;

    return this.queryCache.queryURL(url, { params, method, cacheKey }, this);
  }

  _setInternalModels(internalModels /*, payload */) {
    this.content.setObjects(internalModels);

    this.setProperties({
      isLoaded: true,
      isUpdating: false,
    });

    this._registerWithInternalModels(internalModels);
  }

  _registerWithInternalModels(internalModels) {
    for (let i = 0, l = internalModels.length; i < l; i++) {
      let internalModel = internalModels[i];

      internalModel._recordArrays.add(this);
    }
  }

  // The length property can be removed entirely once our ember-source peer dep
  // is >= 3.1.0.
  //
  // It is not safe to override a getter on a superclass that specifies a
  // setter as a matter of OO + es6 class semantics.

  get length() {
    return this.content && this.content.length !== undefined ? this.content.length : 0;
  }

  set length(v) {}
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
  record._internalModel._recordArrays.add(recordArray);
}
