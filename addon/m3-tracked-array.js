import MutableArray from '@ember/array/mutable';
import EmberObject, { get } from '@ember/object';
import { resolveValue } from './resolve-attribute-util';
import { isResolvedValue } from './utils/resolve';
import M3RecordArray, { associateRecordWithRecordArray } from './record-array';
import { recordDataFor } from './-private';
import { deprecate } from '@ember/debug';
import { CUSTOM_MODEL_CLASS } from 'ember-m3/-infra/features';
import MegamorphicModel from './model';
import { recordIdentifierFor } from '@ember-data/store';

/**
 * M3TrackedArray
 *
 * @class M3TrackedArray
 * @extends {Ember.ArrayProxy}
 */
let M3TrackedArray;
if (CUSTOM_MODEL_CLASS) {
  M3TrackedArray = class M3TrackedArray extends M3RecordArray {
    init() {
      super.init(...arguments);
      this._key = get(this, 'key');
      this._modelName = get(this, 'modelName');
      this._schema = get(this, 'schema');
      this._record = get(this, 'model');
      this._resolved = true;
    }

    get content() {
      deprecate('Accessing content on an M3TrackedArray was private and is deprecated.', false, {
        id: 'm3.tracked-array.value',
        until: '4.0',
      });
      return this._objects;
    }

    get value() {
      deprecate('Accessing value on an M3TrackedArray was private and is deprecated.', false, {
        id: 'm3.tracked-array.value',
        until: '1.0',
      });
      return this._value;
    }

    replace(idx, removeAmt, newItems) {
      // Update childRecordDatas array
      // mapping to array of nested models
      recordDataFor(this._record)._resizeChildRecordData(
        this._key,
        idx,
        removeAmt,
        newItems.length
      );

      newItems = newItems.map((item, index) => {
        if (isResolvedValue(item)) {
          let parentRecordData = recordDataFor(this._record);
          let childRecordData;
          if (item instanceof MegamorphicModel) {
            childRecordData = recordDataFor(item);
          } else {
            let identifier = recordIdentifierFor(item);
            childRecordData = parentRecordData.storeWrapper.recordDataFor(
              identifier.type,
              identifier.id,
              identifier.lid
            );
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
          this.store,
          this._schema,
          this._record,
          index + idx
        );
      });
      super.replace(idx, removeAmt, newItems);

      // Set attribute in recordData and update model state and changedAttributes
      // object
      this._record._setAttribute(this._key, this._objects, true);
    }
  };
} else {
  M3TrackedArray = class M3TrackedArray extends EmberObject.extend(MutableArray) {
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

    objectAt(idx) {
      return this.content[idx];
    }

    replace(idx, removeAmt, newItems) {
      // Update childRecordDatas array
      // mapping to array of nested models
      recordDataFor(this._record)._resizeChildRecordData(
        this._key,
        idx,
        removeAmt,
        newItems.length
      );

      newItems = newItems.map((item, index) => {
        if (isResolvedValue(item)) {
          associateRecordWithRecordArray(item, this);
          let parentRecordData = recordDataFor(this._record);
          let childRecordData = recordDataFor(item);
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
      for (let i = this.content.length - 1; i >= 0; i--) {
        let item = this.content.objectAt(i);
        for (let j = 0; j < internalModels.length; j++) {
          let internalModel = internalModels[j];
          if (internalModel === item._internalModel) {
            this.arrayContentWillChange(i, 1, 0);
            this.content.removeAt(i);
            this.arrayContentDidChange(i, 1, 0);
            break;
          }
        }
      }
    }
  };
}

export default M3TrackedArray;
