import SchemaManager from 'ember-m3/schema-manager';

function dateTransform(value) {
  return new Date(Date.parse(value));
}
const LinkedInRegExp = /^com\.linkedin\.voyager\./;
const UrnRegExp = /^urn:li:/;

export function initialize(/* application */) {
  SchemaManager.registerSchema({
    computeAttributeReference(key, value) {
      if (typeof value === 'string' && UrnRegExp.test(value)) {
        return {
          type: null,
          id: value,
        }
      }
    },

    includesModel(modelName) {
      return LinkedInRegExp.test(modelName);
    },

    computeNestedModel(key, value) {
      if (typeof value === 'object' && value !== null && typeof value.$type === 'string') {
        return {
          id: value.urn,
          type: value.$type,
          attributes: value,
        };
      }
    },

    models: {
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
