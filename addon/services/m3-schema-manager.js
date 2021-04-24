import Service, { inject } from '@ember/service';
import { defineProperty } from '@ember/object';
import { assert } from '@ember/debug';
import DefaultSchema from './m3-schema';
let useComputeAttributeCache = new WeakMap();

export default class SchemaManager extends Service {
  /**
   * Determines whether an attribute is a reference.
   * If it is not, return `null` or `undefined`.
   * Otherwise return an object with properties:
   *  - `id` The id of the referenced model (either m3 or `@ember-data/model`)
   *  - `type` The type of the referenced model (either m3 or `@ember-data/model`)
   * `null` is also a valid type in which case `id` will be looked up in a global cache.
   *
   * Note that attribute references are all treated as synchronous.
   * There is no ember-m3 analogue to `@ember-data/model` async relationships.
   *
   * @param {string} key
   * @param {Object} value
   * @param {string} modelName
   * @param {M3SchemaInterface} schemaInterface
   * @returns {Object}
   */
  computeAttributeReference(key, value, modelName, schemaInterface) {
    return this.get('schema').computeAttributeReference(key, value, modelName, schemaInterface);
  }

  /**
   * Determines whether `value` is a nested model and compute
   * a new m3 model rather than returning a simple object if so.
   *
   * @param {string} key
   * @param {Object} value
   * @param {string} modelName
   * @param {schemaInterface} schemaInterface
   * @returns {Object}
   */
  computeNestedModel(key, value, modelName, schemaInterface) {
    return this.get('schema').computeNestedModel(key, value, modelName, schemaInterface);
  }

  computeAttribute(key, value, modelName, schemaInterface) {
    return this.get('schema').computeAttribute(key, value, modelName, schemaInterface);
  }

  useComputeAttribute() {
    let schema = this.get('schema');
    let useComputeAttribute = useComputeAttributeCache.get(schema);
    if (useComputeAttribute === undefined) {
      let defaultPrototype = DefaultSchema.prototype;
      let isComputeAttributeDefault = defaultPrototype.computeAttribute === schema.computeAttribute;
      useComputeAttribute = schema.computeAttribute && !isComputeAttributeDefault;
      useComputeAttributeCache.set(schema, useComputeAttribute);
    }
    return useComputeAttribute;
  }

  /**
   * Whether or not ember-m3 should handle this `modelName`.
   *
   * @param {string} modelName
   * @returns {boolean}
   */
  includesModel(modelName) {
    return this.get('schema').includesModel(modelName);
  }

  /**
   * If the model name is a projection over some base type, return that base
   * type.  If the model name is not a projection, return null.
   *
   * Indicating that a model type is a projection over another means that any
   * attributes they have in common will be kept cache-consistent.
   *
   * @param {string} projectionModelName
   * @returns {string}
   */
  computeBaseModelName(projectionModelName) {
    let result = this.get('schema').computeBaseModelName(projectionModelName);
    assert(
      `computeBaseModelName('${projectionModelName}') === '${result}'.  This creates a projection cycle.  If ${projectionModelName} is not a projection, return null from computeBaseModelName.`,
      typeof result !== 'string' || result !== projectionModelName
    );
    return result;
  }

  isAttributeIncluded(modelName, attrName) {
    let schema = this.get('schema');
    if (schema.isAttributeIncluded && typeof schema.isAttributeIncluded === 'function') {
      return schema.isAttributeIncluded(modelName, attrName);
    }
    return true;
  }

  //implicit undefined return, thus no default value
  getDefaultValue(modelName, keyName) {
    let schema = this.get('schema');
    if (schema.getDefaultValue && typeof schema.getDefaultValue === 'function') {
      return this.get('schema').getDefaultValue(modelName, keyName);
    }
  }

  //implicit undefined return, thus no default value
  getAttributeAlias(modelName, attrName) {
    let schema = this.get('schema');
    if (schema.getAttributeAlias && typeof schema.getAttributeAlias === 'function') {
      return schema.getAttributeAlias(modelName, attrName);
    }
  }

  // TODO: probably need a better function name, e.g. computeAttributeNames
  /**
   * Compute the actual attribute names, default just return the array passed in.
   *
   * @param {Array<string>} keys
   * @param {string} modelName
   * @returns {Array<string>}
   */
  computeAttributes(keys, modelName) {
    let schema = this.get('schema');
    if (schema.computeAttributes && typeof schema.computeAttributes === 'function') {
      return schema.computeAttributes(keys, modelName);
    }

    return keys;
  }

  /**
   * Update the RecordData with raw value instead of resolved value
   *
   * @param {string} modelName
   * @param {string} attrName
   * @param {Object} value
   * @param {M3SchemaInterface} schemaInterface
   */
  setAttribute(modelName, attrName, value, schemaInterface) {
    this.get('schema').setAttribute(modelName, attrName, value, schemaInterface);
  }

  isAttributeResolved(modelName, attrName, value, schemaInterface) {
    return this.get('schema').isAttributeResolved(modelName, attrName, value, schemaInterface);
  }

  //backwards compatibility using ember generate schema-compat
  transformValue(modelName, attrName, value) {
    let schema = this.get('schema');
    if (schema.transformValue && typeof schema.transformValue === 'function') {
      return schema.transformValue(modelName, attrName, value);
    }
    return value;
  }
}

defineProperty(SchemaManager.prototype, 'schema', inject('m3-schema'));
