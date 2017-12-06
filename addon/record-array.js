import { RecordArray } from 'ember-data/-private';

export default RecordArray.extend({
  // TODO: implement more of recorarray but make this not an arrayproxy

  replace(idx, removeAmt, newModels) {
    this.replaceContent(idx, removeAmt, newModels);
  },

  replaceContent(idx, removeAmt, newModels) {
    let addAmt = newModels.length;

    this.arrayContentWillChange(idx, removeAmt, addAmt);

    let newInternalModels = new Array(addAmt);
    for (let i = 0; i < newInternalModels.length; ++i) {
      newInternalModels[i] = newModels.objectAt(i)._internalModel;
    }
    this.content.splice(idx, removeAmt, ...newInternalModels);
    // TODO: update the backing m3's internalModel._data

    this.arrayContentDidChange(idx, removeAmt, addAmt);
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
