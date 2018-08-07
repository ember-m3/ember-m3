import DefaultSchema from 'ember-m3/services/m3-schema';

export default DefaultSchema.extend({
  /**
   * Determines whether an attribute is a reference.
   * If it is not, return `null` or `undefined`.
   * Otherwise return an object with properties:
   *  - `id` The id of the referenced model (either m3 or `DS.Model`)
   *  - `type` The type of the referenced model (either m3 or `DS.Model`)
   * `null` is also a valid type in which case `id` will be looked up in a global cache.
   *
   * Note that attribute references are all treated as synchronous.
   * There is no ember-m3 analogue to `DS.Model` async relationships.
   *
   * @param {string} key
   * @param {Object} value
   * @param {string} modelName
   * @param {M3SchemaInterface} schemaInterface
   * @returns {Object}
   */
  // computeAttributeReference(key, value, modelName, schemaInterface) {
  //   return this._super(...arguments);
  // },

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
  // computeNestedModel(key, value, modelName, schemaInterface) {
  //   return this._super(...arguments);
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

  /*
  models: {
    'my-model-name': {
      // an optional whitelist of attributes.  If undefined, all attributes
      // returned by the API will be available on the model
      attributes: ['foo', 'bar', 'baz'],

      // an optional list of attribute transforms.  Use this if your API
      // returns values whose types can't be encoded in JSON, such as dates.
      // Each key is the name of an attribute as it appears in the payload,
      // and each value is a function that takes the raw api value and returns
      // the transformed value
      transforms: {
        dateAttr: function dateTransform(dateString) {
          return dateString && new Date(Date.parse(dateString));
        },
      },

      defaults: {
        tag: 'span',
      },

      aliases: {
        fullName: 'person.name',
      },
    }
  }
    */
});
