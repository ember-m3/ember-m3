import ArrayProxy from '@ember/array/proxy';
import { get } from '@ember/object';
import { isResolvedValue, resolveValue } from './resolve-attribute-util';
import { associateRecordWithRecordArray } from './record-array';

/**
 * M3TrackedArray
 *
 * @class M3TrackedArray
 * @extends {Ember.ArrayProxy}
 */
export default class M3TrackedArray extends ArrayProxy {
  init() {
    super.init(...arguments);
    this._key = get(this, 'key');
    this._value = get(this, 'value');
    this._modelName = get(this, 'modelName');
    this._store = get(this, 'store');
    this._schema = get(this, 'schema');
    this._model = get(this, 'model');
  }

  replace(idx, removeAmt, newItems) {
    this.replaceContent(idx, removeAmt, newItems);
  }

  replaceContent(idx, removeAmt, newItems) {
    // Update childModelDatas array
    // mapping to array of nested models
    this._model._internalModel._modelData._resizeChildModelData(
      this._key,
      idx,
      removeAmt,
      newItems.length
    );

    newItems = newItems.map((item, index) => {
      if (isResolvedValue(item)) {
        associateRecordWithRecordArray(item, this);
        // TODO: clean up this ridiculous hack
        // adding a resolved value to a tracked array requires the child model
        // data stitching to be maintained
        this._model._internalModel._modelData._setChildModelData(this._key, index + idx, item);
        return item;
      }

      return resolveValue(
        this._key,
        item,
        this._modelName,
        this._store,
        this._schema,
        this._model,
        index + idx
      );
    });

    // Update content
    this.content.replace(idx, removeAmt, newItems);

    // Set attribute in model data and update model state and changedAttributes
    // object
    this._model._setAttribute(this._key, this.content, true);
  }

  get length() {
    return this.content && this.content.length !== undefined ? this.content.length : 0;
  }

  _removeInternalModels(internalModels) {
    for (let i = this.content.length; i >= 0; --i) {
      let item = this.content.objectAt(i);
      if (isResolvedValue(item)) {
        for (let j = 0; j < internalModels.length; ++j) {
          let internalModel = internalModels[j];
          if (internalModel === item._internalModel) {
            this.content.removeAt(i);
            break;
          }
        }
      }
    }
  }
}
