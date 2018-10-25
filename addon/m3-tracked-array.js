import ArrayProxy from '@ember/array/proxy';
import { get } from '@ember/object';
import { resolveValue } from './resolve-attribute-util';
import { isResolvedValue } from './utils/resolve';
import { associateRecordWithRecordArray } from './record-array';
import { recordDataFor } from './-private';

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
    this._record = get(this, 'model');
  }

  replace(idx, removeAmt, newItems) {
    this.replaceContent(idx, removeAmt, newItems);
  }

  replaceContent(idx, removeAmt, newItems) {
    // Update childRecordDatas array
    // mapping to array of nested models
    recordDataFor(this._record)._resizeChildRecordData(this._key, idx, removeAmt, newItems.length);

    newItems = newItems.map((item, index) => {
      if (isResolvedValue(item)) {
        associateRecordWithRecordArray(item, this);
        // TODO: clean up this ridiculous hack
        // adding a resolved value to a tracked array requires the child model
        // data stitching to be maintained
        recordDataFor(this._record)._setChildRecordData(this._key, index + idx, item);
        return item;
      }

      return resolveValue(
        this._key,
        item,
        this._modelName,
        this._store,
        this._schema,
        this._record,
        index + idx
      );
    });

    // Update content
    this.content.replace(idx, removeAmt, newItems);

    // Set attribute in recordData and update model state and changedAttributes
    // object
    this._record._setAttribute(this._key, this.content, true);
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
