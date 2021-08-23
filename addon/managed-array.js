import { get } from '@ember/object';
import { resolveValue } from './resolve-attribute-util';
import { isResolvedValue } from './utils/resolve';
import BaseRecordArray, { ArrayStateMap } from './base-record-array';
import { recordDataFor } from './-private';
import { deprecate } from '@ember/debug';
import { CUSTOM_MODEL_CLASS } from 'ember-m3/-infra/features';
import MegamorphicModel, { EmbeddedMegamorphicModel } from './model';
import { recordIdentifierFor } from '@ember-data/store';

/**
 * M3TrackedArray
 *
 * @class ManagedArray
 * @extends {BaseRecordArray}
 */
let ManagedArray;
if (CUSTOM_MODEL_CLASS) {
  ManagedArray = class ManagedArray extends BaseRecordArray {
    get content() {
      let state = ArrayStateMap.get(this);
      deprecate('Accessing content on an M3TrackedArray was private and is deprecated.', false, {
        id: 'm3.tracked-array.value',
        until: '4.0',
      });
      return state._objects;
    }

    get value() {
      let state = ArrayStateMap.get(this);

      deprecate('Accessing value on an M3TrackedArray was private and is deprecated.', false, {
        id: 'm3.tracked-array.value',
        until: '1.0',
      });
      return state._value;
    }

    replace(idx, removeAmt, newItems) {
      let state = ArrayStateMap.get(this);

      // if we are empty, and haven't affirmed we are a reference array
      // and somebody gave us records, we need to check whether we should
      // a reference or a nested array
      if (!state._isAllReference && state.length === 0) {
        let firstItem = newItems[0];
        if (
          firstItem &&
          isResolvedValue(firstItem) &&
          !(firstItem instanceof EmbeddedMegamorphicModel)
        ) {
          state._isAllReference = true;
        }
      }

      let { key, record } = state;
      if (state._isAllReference) {
        super.replace(idx, removeAmt, newItems);
        // update attr in recordData and model state
        record._setAttribute(this.key, this, true);
        return;
      }

      // Update childRecordDatas array
      // mapping to array of nested models
      recordDataFor(record)._resizeChildRecordData(key, idx, removeAmt, newItems.length);

      newItems = newItems.map((item, index) => {
        if (isResolvedValue(item)) {
          let parentRecordData = recordDataFor(record);
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
          parentRecordData._setChildRecordData(key, index + idx, childRecordData);
          return item;
        }

        return resolveValue(
          key,
          item,
          state._modelName,
          state.store,
          state._schema,
          record,
          index + idx
        );
      });
      super.replace(idx, removeAmt, newItems);

      // Set attribute in recordData and update model state and changedAttributes
      // object
      record._setAttribute(key, state._objects, true);
    }
  };
} else {
  ManagedArray = class ManagedArray extends BaseRecordArray {
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

    get content() {
      deprecate('Accessing content on an M3TrackedArray was private and is deprecated.', false, {
        id: 'm3.tracked-array.value',
        until: '4.0',
      });
      return this.toArray();
    }

    replace(idx, removeAmt, newItems) {
      // if we are empty, and haven't affirmed we are a reference array
      // and somebody gave us records, we need to check whether we should
      // a reference or a nested array

      if (!this._isAllReference && this.length === 0) {
        let firstItem = newItems[0];
        if (
          firstItem &&
          isResolvedValue(firstItem) &&
          !(firstItem instanceof EmbeddedMegamorphicModel)
        ) {
          this._isAllReference = true;
        }
      }

      if (this._isAllReference) {
        super.replace(idx, removeAmt, newItems);
        // update attr in recordData and model state
        this.record._setAttribute(this.key, this, true);
        return;
      }
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

      super.replace(idx, removeAmt, newItems);

      // Set attribute in recordData and update model state and changedAttributes
      // object
      this._record._setAttribute(this._key, this.toArray(), true);
    }
  };
}

export default ManagedArray;
