import { dasherize } from '@ember/string';
import { recordDataFor } from './-private';
import { EmbeddedMegamorphicModel, EmbeddedSnapshot } from './model';
import { A } from '@ember/array';
import ManagedArray from './managed-array';
import { schemaTypesInfo, NESTED, REFERENCE, MANAGED_ARRAY } from './utils/schema-types-info';
import {
  computeAttributeReference,
  computeNestedModel,
  computeAttribute,
  resolveReferencesWithRecords,
  getOrCreateRecordFromRecordData,
  resolveReferencesWithInternalModels,
} from './utils/resolve';
import { CUSTOM_MODEL_CLASS } from 'ember-m3/-infra/features';

let EmbeddedInternalModel;
if (!CUSTOM_MODEL_CLASS) {
  // TODO: shouldn't need this anymore; this level of indirection for nested recordData isn't useful
  EmbeddedInternalModel = class EmbeddedInternalModel {
    constructor({ id, modelName, parentInternalModel, parentKey, parentIdx }) {
      if (CUSTOM_MODEL_CLASS) {
        //asert we dont need this class anymore
        return;
      }
      this.id = id;
      this.modelName = modelName;

      let recordData = recordDataFor(parentInternalModel)._getChildRecordData(
        parentKey,
        parentIdx,
        modelName,
        id,
        this
      );
      this._recordData = recordData;

      this.parentInternalModel = parentInternalModel;

      this.record = null;
    }

    getRecord() {
      return this.record;
    }

    createSnapshot() {
      return new EmbeddedSnapshot(this.record);
    }

    changedAttributes() {
      return this._recordData.changedAttributes();
    }
  };
}

// takes in a single computedValue returned by schema hooks and resolves it as either
// a reference or a nestedModel

function resolveSingleValue(computedValue, key, store, record, recordData, parentIdx, schemaType) {
  // we received a resolved record and need to transfer it to the new record data
  if (computedValue instanceof EmbeddedMegamorphicModel) {
    // transfer ownership to the new RecordData
    recordData._setChildRecordData(key, parentIdx, recordDataFor(computedValue));
    return computedValue;
  }

  if (schemaType === REFERENCE) {
    let reference = computedValue;
    let { id } = reference;
    if (reference.type === null) {
      // for schemas with a global id-space but multiple types, schemas may
      // report a type of null
      if (CUSTOM_MODEL_CLASS) {
        let rd = store._globalM3RecordDataCache[reference.id];
        return rd ? getOrCreateRecordFromRecordData(rd, store) : null;
      } else {
        let internalModel = store._globalM3Cache[id];
        return internalModel ? internalModel.getRecord() : null;
      }
    } else {
      // respect the user schema's type if provided
      return id !== null && id !== undefined
        ? store.peekRecord(reference.type, reference.id)
        : null;
    }
  } else if (schemaType === NESTED) {
    return createNestedModel(store, record, recordData, key, computedValue, parentIdx);
  } else {
    return computedValue;
  }
}

export function resolveRecordArray(store, record, key, references) {
  let recordArrayManager = store._recordArrayManager;

  let array;

  if (CUSTOM_MODEL_CLASS) {
    array = ManagedArray.create({}, {
      modelName: '-ember-m3',
      _isAllReference: true,
      key,
      record,
      store,
      _isAllReference: true,
    });

    let records = resolveReferencesWithRecords(store, references);
    array._setObjects(records, false);
  } else {
    array = ManagedArray.create({
      modelName: '-ember-m3',
      store: store,
      manager: recordArrayManager,
      _isAllReference: true,
      key,
      record,
    });

    let internalModels = resolveReferencesWithInternalModels(store, references);
    array._setInternalModels(internalModels, false);
  }
  return array;
}

/**
 * There are two different type of values we have to worry about:
 * 1. References
 * 2. Nested Models
 *
 * Here is a mapping of input -> output:
 * 1. Single reference -> resolved reference
 * 2. Array of references -> RecordArray of resolved references
 * 3. Single nested model -> EmbeddedMegaMorphicModel
 * 4. Array of nested models -> array of EmbeddedMegaMorphicModel
 */
export function resolveValue(key, value, modelName, store, schema, record, parentIdx) {
  const recordData = recordDataFor(record);
  const schemaInterface = recordData.schemaInterface;

  let computedValue;
  if (schema.useComputeAttribute()) {
    computedValue = computeAttribute(key, value, modelName, schemaInterface, schema);
  } else {
    // TODO remove this if branch once we remove support for old compute hooks
    // We invoke the old hooks and mark the results with the new apis

    let computedReference = computeAttributeReference(
      key,
      value,
      modelName,
      schemaInterface,
      schema
    );
    // First check to see if given value is either a reference or an array of references
    if (computedReference) {
      if (Array.isArray(computedReference)) {
        computedReference.forEach((v) => schemaInterface.reference(v));
        computedValue = schemaInterface.managedArray(computedReference);
      } else {
        computedValue = schemaInterface.reference(computedReference);
      }
    } else {
      let computedNested = computeNestedModel(key, value, modelName, schemaInterface, schema);
      computedValue = computedNested;
      if (Array.isArray(computedNested)) {
        computedNested.forEach((v) => schemaInterface.nested(v));
        computedValue = schemaInterface.managedArray(computedNested);
      } else if (computedNested !== null && typeof computedNested === 'object') {
        schemaInterface.nested(computedNested);
        // If computeNestedModel returned null, we used to iterate the value array manually
        // and process each element individually
      } else if (Array.isArray(value)) {
        let content = value.map((v, i) =>
          transferOrResolveValue(store, schema, record, recordData, modelName, key, v, i)
        );
        let array = resolveManagedArray(content, key, value, modelName, store, schema, record);
        if (!CUSTOM_MODEL_CLASS) {
          array._setInternalModels(
            content.map((c) => c._internalModel || c),
            false
          );
        }
        return array;
      }
    }
  }

  let valueType = schemaTypesInfo.get(computedValue);

  if (valueType === REFERENCE || valueType === NESTED) {
    return resolveSingleValue(computedValue, key, store, record, recordData, parentIdx, valueType);
  } else if (valueType === MANAGED_ARRAY) {
    if (schemaTypesInfo.get(computedValue[0]) === REFERENCE) {
      return resolveRecordArray(store, record, key, computedValue);
    } else {
      let content = computedValue.map((v, i) =>
        resolveSingleValue(v, key, store, record, recordData, i, schemaTypesInfo.get(v))
      );
      let array = resolveManagedArray(content, key, value, modelName, store, schema, record);
      if (!CUSTOM_MODEL_CLASS) {
        array._setInternalModels(
          content.map((c, i) => {
            return schemaTypesInfo.get(computedValue[i]) === REFERENCE ? c._internalModel : c;
          }),
          false
        );
      }
      return array;
    }
  } else if (Array.isArray(computedValue)) {
    return computedValue.map((v, i) =>
      resolveSingleValue(v, key, store, record, recordData, i, schemaTypesInfo.get(v))
    );
  } else if (computedValue) {
    return computedValue;
  } else {
    return value;
  }
}

function resolveManagedArray(content, key, value, modelName, store, schema, record) {
  if (CUSTOM_MODEL_CLASS) {
    return ManagedArray.create({}, {
      key,
      _value: value,
      modelName,
      schema,
      model: record,
      record,
      objects: A(content), store: store, resolved: true
    });
  } else {
    let array = ManagedArray.create({
      key,
      _value: value,
      modelName,
      store,
      schema,
      model: record,
      record,
    });
    return array;
  }
}

function transferOrResolveValue(store, schema, record, recordData, modelName, key, value, index) {
  if (value instanceof EmbeddedMegamorphicModel) {
    // transfer ownership to the new RecordData
    recordData._setChildRecordData(key, index, recordDataFor(value));
    return value;
  }

  return resolveValue(key, value, modelName, store, schema, record, index);
}

function createNestedModel(store, record, recordData, key, nestedValue, parentIdx = null) {
  if (parentIdx !== null && nestedValue instanceof EmbeddedMegamorphicModel) {
    recordData._setChildRecordData(key, parentIdx, recordDataFor(nestedValue));
    return nestedValue;
  }

  let modelName, nestedRecordData, internalModel;
  if (CUSTOM_MODEL_CLASS) {
    // TODO
    // for backwards compat we will still need to dasherize,
    // but it would be good to confirm that this is no longer a requirement
    modelName = nestedValue.type ? dasherize(nestedValue.type) : null;
    nestedRecordData = recordData._getChildRecordData(key, parentIdx, modelName, nestedValue.id);
  } else {
    internalModel = new EmbeddedInternalModel({
      // nested models with ids is pretty misleading; all they really ought to need is type
      id: nestedValue.id,
      // maintain consistency with internalmodel.modelName, which is normalized
      // internally within ember-data
      modelName: nestedValue.type ? dasherize(nestedValue.type) : null,
      parentInternalModel: record._internalModel,
      parentKey: key,
      parentIdx,
    });
  }

  let nestedModel;
  if (CUSTOM_MODEL_CLASS) {
    nestedModel = EmbeddedMegamorphicModel.create({
      store,
      _parentModel: record,
      _topModel: record._topModel,
      _recordData: nestedRecordData,
    });
  } else {
    nestedModel = EmbeddedMegamorphicModel.create({
      store,
      _parentModel: record,
      _topModel: record._topModel,
      _internalModel: internalModel,
    });
    internalModel.record = nestedModel;
    nestedRecordData = recordDataFor(internalModel);
  }
  if (
    !recordData.getServerAttr ||
    (recordData.getServerAttr(key) !== null && recordData.getServerAttr(key) !== undefined)
  ) {
    nestedRecordData.pushData(
      {
        attributes: nestedValue.attributes,
      },
      false,
      false,
      true
    );
  } else {
    Object.keys(nestedValue.attributes).forEach((key) => {
      nestedRecordData.setAttr(key, nestedValue.attributes[key], true);
    });
  }

  return nestedModel;
}
