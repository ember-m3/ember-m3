import { dasherize } from '@ember/string';
import { recordDataToRecordMap } from '../initializers/m3-store';

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

export function resolveReferencesWithRecords(store, references) {
  return references.map(reference => {
    if (reference.type) {
      return store.peekRecord(dasherize(reference.type), reference.id);
    } else {
      let rd = store._globalM3CacheRD[reference.id];
      if (rd) {
        return getOrCreateRecordFromRD(rd, store);
      }
    }
  });
}

export function isResolvedValue(value) {
  return value && value.constructor && (value.constructor.isModel || value.constructor.isM3Model);
}

export function getOrCreateRecordFromRD(rd, store) {
  let record = recordDataToRecordMap.get(rd);
  if (recordDataToRecordMap.get(rd)) {
    return record;
  } else {
    return store.peekRecord(rd.modelName, rd.id);
  }
}
