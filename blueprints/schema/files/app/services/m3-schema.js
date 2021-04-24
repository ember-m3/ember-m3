import DefaultSchema from 'ember-m3/services/m3-schema';

export default class M3SchemaService extends DefaultSchema {
  /**
   * Computes the attribute and determines it's type.
   * 
   * An attribute can be:
   *  1. A reference to a record that exists in the identity map
   *  2. A nested m3 record that exists as a child of the m3 parent record
   *  3. A simple value, like a POJO or a string
   *  4. A managedArray of references, nested records or simple values
   * 
   * If the attribute is a reference return:
   *  `schemaInterface.reference({ id, type })`
   *  where the object properties are
   *  - `id` The id of the referenced model (either m3 or `@ember-data/model`)
   *  - `type` The type of the referenced model (either m3 or `@ember-data/model`)
   * `null` is also a valid type in which case `id` will be looked up in a global cache.
   * 
   * Note that attribute references are all treated as synchronous.
   * There is no ember-m3 analogue to `@ember-data/model` async relationships.
   * 
   * If you are returning a nested m3 model, return:
   *  `schemaInterface.nested({ id, type, attributes })`
   * 
   * If you are returning a managed array, return:
   *  `schemaInterface.managedArray([schemaInterface.nested(obj), someOtherValue])`
   * 
   * If you are returning the a value you can return the raw value without passing it
   * through the schemaInterface call
   *
   * @param {string} key
   * @param {Object} value
   * @param {string} modelName
   * @param {M3SchemaInterface} schemaInterface
   * @returns {Object}
   */
  // computeAttribute(key, value, modelName, schemaInterface) {
  //  return this._super(...arguments);
  // },


  /**
   * Whether or not ember-m3 should handle this `modelName`.
   *
   * @param {string} modelName
   * @returns {boolean}
   */
  // includesModel(modelName) {
  //   return false;
  // },

  /**
   * If the `projectionModelName` represents a projection over some base type,
   * return the model name of the base type to maintain shared data
   * between all projections of the same type
   *
   * @param {string} projectionModelName
   * @returns {string}
   */
  // computeBaseModelName(projectionModelName) {
  //   return null;
  // },
}
