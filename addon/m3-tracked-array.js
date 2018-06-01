import ArrayProxy from '@ember/array/proxy';
import { get } from '@ember/object';
import { resolveValue } from './resolve-attribute-util';

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
    newItems = newItems.map(item =>
      resolveValue(this._key, item, this._modelName, this._store, this._schema, this._model)
    );

    // Update content
    this.content.replace(idx, removeAmt, newItems);

    // Set attribute in model data and
    // update model state
    // and changedAttributes object
    this._model._setAttribute(this._key, this.content);
  }

  get length() {
    return this.content && this.content.length !== undefined ? this.content.length : 0;
  }
}
