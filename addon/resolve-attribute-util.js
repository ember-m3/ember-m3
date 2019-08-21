import { dasherize } from '@ember/string';
import M3ReferenceArray from './m3-reference-array';
import M3TrackedArray from './m3-tracked-array';
import { recordDataFor } from './-private';
import { EmbeddedInternalModel, EmbeddedMegamorphicModel } from './model';
import { A } from '@ember/array';

import {
  computeAttributeReference,
  computeNestedModel,
  resolveReferencesWithInternalModels,
} from './utils/resolve';

function resolveReference(store, reference) {
  let { id } = reference;
  if (reference.type === null) {
    // for schemas with a global id-space but multiple types, schemas may
    // report a type of null
    let internalModel = store._globalM3Cache[id];
    return internalModel ? internalModel.getRecord() : null;
  } else {
    // respect the user schema's type if provided
    return id !== null && id !== undefined ? store.peekRecord(reference.type, reference.id) : null;
  }
}

function resolveReferenceOrReferences(store, model, key, value, reference) {
  if (Array.isArray(reference)) {
    return resolveRecordArray(store, model, key, reference);
  }

  return resolveReference(store, reference);
}

export function resolveRecordArray(store, record, key, references) {
  let recordArrayManager = store._recordArrayManager;

  let array = M3ReferenceArray.create({
    modelName: '-ember-m3',
    content: A(),
    store: store,
    manager: recordArrayManager,
    key,
    record,
  });

  let internalModels = resolveReferencesWithInternalModels(store, references);

  array._setInternalModels(internalModels, false);
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

  // First check to see if given value is either a reference or an array of references
  let reference = computeAttributeReference(key, value, modelName, schemaInterface, schema);
  if (reference !== undefined && reference !== null) {
    return resolveReferenceOrReferences(store, record, key, value, reference);
  }

  let nested = computeNestedModel(key, value, modelName, schemaInterface, schema);
  let content;
  let isArray = false;

  if (Array.isArray(nested)) {
    isArray = true;
    content = nested.map((v, i) => createNestedModel(store, record, recordData, key, v, i));
  } else if (nested) {
    content = createNestedModel(store, record, recordData, key, nested, parentIdx);
  } else if (Array.isArray(value)) {
    isArray = true;
    content = value.map((v, i) =>
      transferOrResolveValue(store, schema, record, recordData, modelName, key, v, i)
    );
  } else {
    content = value;
  }

  if (isArray === true) {
    return M3TrackedArray.create({
      content: A(content),
      key,
      _value: value,
      modelName,
      store,
      schema,
      model: record,
    });
  }

  return content;
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

  let internalModel = new EmbeddedInternalModel({
    // nested models with ids is pretty misleading; all they really ought to need is type
    id: nestedValue.id,
    // maintain consistency with internalmodel.modelName, which is normalized
    // internally within ember-data
    modelName: nestedValue.type ? dasherize(nestedValue.type) : null,
    parentInternalModel: record._internalModel,
    parentKey: key,
    parentIdx,
  });

  let nestedModel = EmbeddedMegamorphicModel.create({
    store,
    _internalModel: internalModel,
    _parentModel: record,
    _topModel: record._topModel,
  });
  internalModel.record = nestedModel;

  let nestedRecordData = recordDataFor(internalModel);

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
    Object.keys(nestedValue.attributes).forEach(key => {
      nestedRecordData.setAttr(key, nestedValue.attributes[key], true);
    });
  }

  return nestedModel;
}
