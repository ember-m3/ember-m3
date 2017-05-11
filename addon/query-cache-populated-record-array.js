import RecordArray from 'ember-data/-private/system/record-arrays/record-array';

export default RecordArray.extend({
  replace() {
    throw new Error(`nope`);
  },

  _update() {
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
