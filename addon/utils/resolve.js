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
    return references.map((reference) =>
      reference.type
        ? store._internalModelForId(dasherize(reference.type), reference.id)
        : store._globalM3Cache[reference.id]
    );
  }
}

export function resolveReferencesWithRecords(store, references) {
  if (CUSTOM_MODEL_CLASS) {
    return references.map((reference) => {
      if (reference.type) {
        let normalizedType = dasherize(reference.type);
        let record = store.peekRecord(normalizedType, reference.id);
        if (record) {
          return record;
        }
        // If we have a cached recordData with the same id, but we have not seen a record with the same { type, id } pair
        // We could be a projection, in which case we want to push in a projected record with the new type
        let cachedRD = store._globalM3RecordDataCache[reference.id];
        if (cachedRD) {
          let baseTypeName = dasherize(store._schemaManager.computeBaseModelName(normalizedType));
          // We are a projection
          if (baseTypeName) {
            // Our projection matches the cached one
            if (
              baseTypeName === cachedRD.modelName ||
              baseTypeName === store._schemaManager.computeBaseModelName(cachedRD.modelName)
            )
              return store.push({
                data: { type: normalizedType, id: reference.id, attributes: {} },
              });
          }
        }
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
