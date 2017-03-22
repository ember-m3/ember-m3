import Schema from 'ember-m3/schema';

function dateTransform(value) {
  return new Date(Date.parse(value));
}
const LinkedInRegExp = /^com\.linkedin\.voyager\./;

export function initialize(/* application */) {
  Schema.registerSchema({
    matcher(modelName) {
      return LinkedInRegExp.test(modelName);
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
