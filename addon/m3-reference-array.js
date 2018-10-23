import M3RecordArray from './record-array';

/**
 * M3ReferenceArray
 *
 * @class M3ReferenceArray
 * @extends {M3RecordArray}
 */
export default class M3ReferenceArray extends M3RecordArray {
  replace(idx, removeAmt, newItems) {
    this.replaceContent(idx, removeAmt, newItems);
  }

  replaceContent(idx, removeAmt, newItems) {
    super.replaceContent(idx, removeAmt, newItems);
    // update attr in recordData and model state
    this.record._setAttribute(this.key, this, true);
  }

  get length() {
    return this.content && this.content.length !== undefined ? this.content.length : 0;
  }
}
