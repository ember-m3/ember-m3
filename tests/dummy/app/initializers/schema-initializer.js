import SchemaManager from 'ember-m3/schema-manager';

function dateTransform(value) {
  return new Date(Date.parse(value));
}
const BookStoreRegExp = /^com\.example\.bookstore\./;
const ISBNRegExp = /^isbn:/;
const URNRegExp = /^urn:/;

export function initialize(/* application */) {
  SchemaManager.registerSchema({
    computeAttributeReference(key, value) {
      if (
        typeof value === 'string' &&
        (ISBNRegExp.test(value) || URNRegExp.test(value))
      ) {
        return {
          type: null,
          id: value,
        };
      }
    },

    isAttributeArrayReference(/* key, value, modelName */) {
      return false;
    },

    includesModel(modelName) {
      return BookStoreRegExp.test(modelName);
    },

    computeNestedModel(key, value) {
      if (
        typeof value === 'object' &&
        value !== null &&
        typeof value.$type === 'string'
      ) {
        return {
          id: value.isbn,
          type: value.$type,
          attributes: value,
        };
      }
    },

    models: {
      'com.example.bookstore.book': {
        transforms: {
          pubDate: dateTransform,
        },
      },
    },
  });
}

export default {
  name: 'm3-schema-initializer',
  initialize,
};
