import DefaultSchema from 'ember-m3/services/m3-schema';

function dateTransform(value) {
  return new Date(Date.parse(value));
}
const BookStoreRegExp = /^com\.example\.bookstore\./;
const ISBNRegExp = /^isbn:/;
const URNRegExp = /^urn:/;

export default class Schema extends DefaultSchema {
  computeAttributeReference(key, value) {
    if (typeof value === 'string' && (ISBNRegExp.test(value) || URNRegExp.test(value))) {
      return {
        type: null,
        id: value,
      };
    }
  }

  includesModel(modelName) {
    return BookStoreRegExp.test(modelName);
  }

  computeNestedModel(key, value) {
    if (Array.isArray(value)) {
      return null;
    }
    if (typeof value === 'object' && value !== null && typeof value.$type === 'string') {
      return {
        id: value.isbn,
        type: value.$type,
        attributes: value,
      };
    }
  }
}

Schema.prototype.models = {
  'com.example.bookstore.book': {
    transforms: {
      pubDate: dateTransform,
    },
  },
};
