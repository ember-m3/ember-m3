import { dasherize } from '@ember/string';

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

export function resolveReferencesWithInternalModels(store, references) {
  return references.map(
    reference =>
      reference.type
        ? store._internalModelForId(dasherize(reference.type), reference.id)
        : store._globalM3Cache[reference.id]
  );
}

export function isResolvedValue(value) {
  return value && value.constructor && value.constructor.isModel;
}
