import { get } from '@ember/object';
import { RecordArray } from 'ember-data/-private';
import { A } from '@ember/array';

export default RecordArray.extend({
  // TODO: implement more of RecordArray but make this not an arrayproxy

  replace(idx, removeAmt, newModels) {
    this.replaceContent(idx, removeAmt, newModels);
  },

  replaceContent(idx, removeAmt, newModels) {
    let _newModels = A(newModels);
    let addAmt = get(_newModels, 'length');

    let newInternalModels = new Array(addAmt);
    for (let i = 0; i < newInternalModels.length; ++i) {
      newInternalModels[i] = _newModels.objectAt(i)._internalModel;
    }
    this.content.replace(idx, removeAmt, newInternalModels);
    // TODO: update the backing m3's internalModel._data
  },

  _update() {
    if (!this.query) {
      throw new Error(`Can't update RecordArray without a query`);
    }

    let { url, params, method, cacheKey } = this.query;

    return this.queryCache.queryURL(url, { params, method, cacheKey }, this);
  },

  _setInternalModels(internalModels /*, payload */) {
    this.content.setObjects(internalModels);

    this.setProperties({
      isLoaded: true,
      isUpdating: false,
    });

    for (let i = 0, l = internalModels.length; i < l; i++) {
      let internalModel = internalModels[i];

      internalModel._recordArrays.add(this);
    }
  },
});
