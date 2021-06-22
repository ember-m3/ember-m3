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
   * Calls the schema's useUnderlyingErrorsValue passing in modelName
   *
   * @param {string} modelName - Name of model to determine if `errors` property in the payload should be used
   * @returns {boolean}
   */
  useUnderlyingErrorsValue(modelName) {
    let schema = this.get('schema');
    return schema.useUnderlyingErrorsValue(modelName);
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
    let whitelist = this._modelSchemaProperty(modelName, 'attributes');
    return !whitelist || whitelist.includes(attrName);
  }

  getDefaultValue(modelName, keyName) {
    let defaults = this._modelSchemaProperty(modelName, 'defaults');
    if (!defaults) {
      return;
    }

    return defaults[keyName];
  }

  getAttributeAlias(modelName, attrName) {
    let aliases = this._modelSchemaProperty(modelName, 'aliases');
    if (!aliases) {
      return;
    }

    return aliases[attrName];
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

  transformValue(modelName, attrName, value) {
    let transforms = this._modelSchemaProperty(modelName, 'transforms');
    let transform = transforms && transforms[attrName];

    return transform ? transform(value) : value;
  }

  _modelSchema(modelName) {
    let models = this.get('schema').models;
    return models && models[modelName];
  }

  /**
   * Access property of the type-specific information, including:
   * - `attributes` A list of whitelisted attributes.  It is recommended to omit
   *   this unless you explicitly want to prevent unknown properties returned in
   *   the API payload from being read.  If present, it is an array of strings that
   *   list whitelisted attributes.  Reads of non-whitelisted properties will
   *   return `undefined`.
   *
   * - `defaults` An object whose key-value pairs map attribute names to default
   *   values.  Reads of properties not included in the API will return the default
   *   value instead, if it is specified in the schema.
   *
   * - `aliases` Alternate names for payload attributes.  Aliases are read-only, ie
   *   equivalent to `Ember.computed.reads` and not `Ember.computed.alias`
   *
   * - `transforms` An object whose key-value pairs map attribute names to
   *   functions that transform their values.
   *
   * @param {string} modelName
   * @param {string} property 'attributes'|'defaults'|'aliases'|'transforms'
   * @returns {Object}
   */
  _modelSchemaProperty(modelName, property) {
    let modelSchema = this._modelSchema(modelName);
    return modelSchema && modelSchema[property];
  }
}

defineProperty(SchemaManager.prototype, 'schema', inject('m3-schema'));
