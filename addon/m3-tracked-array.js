import ArrayProxy from '@ember/array/proxy';
import { get } from '@ember/object';
import { isResolvedValue, resolveValue } from './resolve-attribute-util';
import { associateRecordWithRecordArray } from './record-array';

export default class extends ArrayProxy {
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
    newItems = newItems.map((item, idx) => {
      if (isResolvedValue(item)) {
        associateRecordWithRecordArray(item, this);
        return item;
      }

      return resolveValue(
        this._key,
        item,
        this._modelName,
        this._store,
        this._schema,
        this._model,
        idx
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
