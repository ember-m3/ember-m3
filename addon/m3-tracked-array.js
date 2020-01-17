import MutableArray from '@ember/array/mutable';
import EmberObject, { get } from '@ember/object';
import { resolveValue } from './resolve-attribute-util';
import { isResolvedValue } from './utils/resolve';
import { associateRecordWithRecordArray } from './record-array';
import { recordDataFor } from './-private';
import { deprecate } from '@ember/debug';
import { CUSTOM_MODEL_CLASS } from 'ember-m3/-infra/features';
import MegamorphicModel from './model';
import require from 'require';
import { recordDataToRecordMap } from './mixins/store';
import { HAS_STORE_PACKAGE } from 'ember-m3/-infra/packages';

let recordIdentifierFor;
if (HAS_STORE_PACKAGE) {
  recordIdentifierFor = require('@ember-data/store').recordIdentifierFor;
}

/**
 * M3TrackedArray
 *
 * @class M3TrackedArray
 * @extends {Ember.ArrayProxy}
 */
export default class M3TrackedArray extends EmberObject.extend(MutableArray) {
  init() {
    super.init(...arguments);
    this._key = get(this, 'key');
    this._modelName = get(this, 'modelName');
    this._store = get(this, 'store');
    this._schema = get(this, 'schema');
    this._record = get(this, 'model');
  }

  get value() {
    deprecate('Accessing value on an M3TrackedArray was private and is deprecated.', false, {
      id: 'm3.tracked-array.value',
      until: '1.0',
    });
    return this._value;
  }

  replace(idx, removeAmt, newItems) {
    this.replaceContent(idx, removeAmt, newItems);
  }

  objectAt(idx) {
    return this.content[idx];
  }

  replaceContent(idx, removeAmt, newItems) {
    // Update childRecordDatas array
    // mapping to array of nested models
    recordDataFor(this._record)._resizeChildRecordData(this._key, idx, removeAmt, newItems.length);

    newItems = newItems.map((item, index) => {
      if (isResolvedValue(item)) {
        associateRecordWithRecordArray(item, this);
        let parentRecordData = recordDataFor(this._record);
        let childRecordData;
        if (item instanceof MegamorphicModel) {
          childRecordData = recordDataFor(item);
        } else {
          if (CUSTOM_MODEL_CLASS) {
            let identifier = recordIdentifierFor(item);
            childRecordData = parentRecordData.storeWrapper.recordDataFor(
              identifier.type,
              identifier.id,
              identifier.lid
            );
          } else {
            childRecordData = recordDataFor(item);
          }
        }
        // TODO: clean up this ridiculous hack
        // adding a resolved value to a tracked array requires the child model
        // data stitching to be maintained
        parentRecordData._setChildRecordData(this._key, index + idx, childRecordData);
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
    this.arrayContentWillChange(idx, removeAmt, newItems.length);
    this.content.replace(idx, removeAmt, newItems);
    this.arrayContentDidChange(idx, removeAmt, newItems.length);

    // Set attribute in recordData and update model state and changedAttributes
    // object
    this._record._setAttribute(this._key, this.content, true);
  }

  get length() {
    return this.content && this.content.length !== undefined ? this.content.length : 0;
  }

  _removeInternalModels(internalModels) {
    if (CUSTOM_MODEL_CLASS) {
      throw new Error('Should not be calling _removeInternalModels when CUSTOM_MODEL_CLASS is on');
    } else {
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

  _removeObject(record) {
    this.content.removeObject(record);
  }

  _removeRecordData(recordData) {
    let recordToMatch = recordDataToRecordMap.get(recordData);
    if (!recordToMatch) {
      return;
    }
    for (let i = this.content.length; i >= 0; --i) {
      let item = this.content.objectAt(i);
      if (recordToMatch === item) {
        this.content.removeAt(i);
        break;
      }
    }
  }
}
