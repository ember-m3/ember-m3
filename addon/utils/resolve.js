import { dasherize } from '@ember/string';
import { recordDataToRecordMap } from '../utils/caches';
import { CUSTOM_MODEL_CLASS } from 'ember-m3/-infra/features';

export function computeAttributeReference(key, value, modelName, schemaInterface, schema) {
  schemaInterface._beginDependentKeyResolution(key);
  let reference = schema.computeAttributeReference(key, value, modelName, schemaInterface);
  schemaInterface._endDependentKeyResolution(key);
  return reference;
}

export function computeNestedModel(key, value, modelName, schemaInterface, schema) {
  schemaInterface._beginDependentKeyResolution(key);
  let nestedModel = schema.computeNestedModel(key, value, modelName, schemaInterface);
  schemaInterface._endDependentKeyResolution(key);
  return nestedModel;
}

export function computeAttribute(key, value, modelName, schemaInterface, schema) {
  schemaInterface._beginDependentKeyResolution(key);
  let model = schema.computeAttribute(key, value, modelName, schemaInterface);
  schemaInterface._endDependentKeyResolution(key);
  return model;
}

export function resolveReferencesWithInternalModels(store, references) {
  if (!CUSTOM_MODEL_CLASS) {
    return references.map(reference =>
      reference.type
        ? store._internalModelForId(dasherize(reference.type), reference.id)
        : store._globalM3Cache[reference.id]
    );
  }
}

export function resolveReferencesWithRecords(store, references) {
  if (CUSTOM_MODEL_CLASS) {
    return references.map(reference => {
      if (reference.type) {
        return store.peekRecord(dasherize(reference.type), reference.id);
      } else {
        let rd = store._globalM3RecordDataCache[reference.id];
        if (rd) {
          return getOrCreateRecordFromRecordData(rd, store);
        }
      }
    });
  }
}

export function isResolvedValue(value) {
  return value && value.constructor && value.constructor.isModel;
}

export function getOrCreateRecordFromRecordData(rd, store) {
  if (CUSTOM_MODEL_CLASS) {
    let record = recordDataToRecordMap.get(rd);
    if (recordDataToRecordMap.get(rd)) {
      return record;
    } else {
      return store.peekRecord(rd.modelName, rd.id);
    }
  }
}
