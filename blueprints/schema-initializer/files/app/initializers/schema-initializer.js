import Schema from 'ember-m3/schema';

export function initialize(/* application */) {
  Schema.registerSchema({
    matcher(/* modelName */) {
      return false;
    },

    schema: {
      'my-model-type': {
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
      }
    }
  });
}

export default {
  name: 'm3-schema-initializer',
  initialize
};
