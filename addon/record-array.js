import { get } from '@ember/object';
import { RecordArray } from 'ember-data/-private';
import { A } from '@ember/array';

export default class extends RecordArray {
  // TODO: implement more of RecordArray but make this not an arrayproxy

  replace(idx, removeAmt, newModels) {
    this.replaceContent(idx, removeAmt, newModels);
  }

  replaceContent(idx, removeAmt, newModels) {
    let _newModels = A(newModels);
    let addAmt = get(_newModels, 'length');

    let newInternalModels = new Array(addAmt);
    for (let i = 0; i < newInternalModels.length; ++i) {
      newInternalModels[i] = _newModels.objectAt(i)._internalModel;
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
  record._internalModel._recordArrays.add(recordArray);
}
