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

// ie an array of nested models
export function resolveArray(key, value, modelName, store, schema, model) {
  let resolvedArray = new Array(0);
  if (value && value.length > 0) {
    resolvedArray = value.map((value, idx) =>
      resolveValue(key, value, modelName, store, schema, model, idx)
    );
  }

  return M3TrackedArray.create({
    content: A(resolvedArray),
    key,
    value,
    modelName,
    store,
    schema,
    model,
  });
}

function resolveReference(store, reference) {
  if (reference.type === null) {
    // for schemas with a global id-space but multiple types, schemas may
    // report a type of null
    let internalModel = store._globalM3Cache[reference.id];
    return internalModel ? internalModel.getRecord() : null;
  } else {
    // respect the user schema's type if provided
    return store.peekRecord(reference.type, reference.id);
  }
}

function resolveReferenceOrReferences(store, model, key, value, reference) {
  if (Array.isArray(value) || Array.isArray(reference)) {
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

  array._setInternalModels(internalModels);
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

  if (Array.isArray(value)) {
    return resolveArray(key, value, modelName, store, schema, record);
  }
  let nested = computeNestedModel(key, value, modelName, schemaInterface, schema);
  if (nested) {
    let internalModel = new EmbeddedInternalModel({
      // nested models with ids is pretty misleading; all they really ought to need is type
      id: nested.id,
      // maintain consistency with internalmodel.modelName, which is normalized
      // internally within ember-data
      modelName: nested.type ? dasherize(nested.type) : null,
      parentInternalModel: record._internalModel,
      parentKey: key,
      parentIdx,
    });

    let nestedModel = new EmbeddedMegamorphicModel({
      store,
      _internalModel: internalModel,
      _parentModel: record,
      _topModel: record._topModel,
    });
    internalModel.record = nestedModel;

    recordDataFor(internalModel).pushData({
      attributes: nested.attributes,
    });

    return nestedModel;
  }

  return value;
}
