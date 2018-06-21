import { get } from '@ember/object';
import M3RecordArray from './record-array';

export default class extends M3RecordArray {
  init() {
    super.init(...arguments);
    this._key = get(this, 'key');
    this._model = get(this, 'model');
  }

  replace(idx, removeAmt, newItems) {
    this.replaceContent(idx, removeAmt, newItems);
  }

  replaceContent(idx, removeAmt, newItems) {
    super.replaceContent(idx, removeAmt, newItems);
    // update attr in model data
    // and model state
    this._model._setAttribute(this._key, this);
  }

  get length() {
    return this.content && this.content.length !== undefined ? this.content.length : 0;
  }
}
