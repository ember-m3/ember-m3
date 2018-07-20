import { get } from '@ember/object';
import M3RecordArray from './record-array';

/**
 * M3ReferenceArray
 *
 * @class M3ReferenceArray
 * @extends {M3RecordArray}
 */
export default class M3ReferenceArray extends M3RecordArray {
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
    // update attr in model data and model state
    this._model._setAttribute(this._key, this, true);
  }

  get length() {
    return this.content && this.content.length !== undefined ? this.content.length : 0;
  }
}
