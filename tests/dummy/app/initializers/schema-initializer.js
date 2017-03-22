import Schema from 'ember-m3/schema';

function dateTransform(value) {
  return new Date(Date.parse(value));
}
const LinkedInRegExp = /^com\.linkedin\.voyager\./;
const UrnRegExp = /^urn:li:/;

export function initialize(/* application */) {
  Schema.registerSchema({
    matchers: {
      id(value) {
        return typeof value === 'string' && UrnRegExp.test(value)
      },

      type(modelName) {
        return LinkedInRegExp.test(modelName);
      },

      nestedModel(value) {
        return typeof value === 'object' && value !== null && typeof value.$type === 'string'
      },
    },

    schema: {
      'com.linkedin.voyager.collection': {
        transforms: {
          dateAttr: dateTransform
        }
      }
    }
  });
}

export default {
  name: 'm3-schema-initializer',
  initialize
};
