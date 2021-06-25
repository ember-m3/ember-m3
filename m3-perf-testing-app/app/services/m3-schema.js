import DefaultSchema from 'ember-m3/services/m3-schema';

function dateTransform(value) {
  return new Date(Date.parse(value));
}
const BookStoreRegExp = /^com\.example\.bookstore\./;
const ISBNRegExp = /^isbn:/;
const URNRegExp = /^urn:/;

function computeAttributeReference(key, value) {
  if (typeof value === 'string' && (value.includes('isbn:') || value.includes('urn:'))) {
    return {
      type: null,
      id: value,
    };
  }
}

function computeNestedModel(key, value) {
  if (typeof value === 'object' && value !== null && typeof value.$type === 'string') {
    return {
      id: value.id,
      type: value.$type,
      attributes: value,
    };
  }
}

export default class Schema extends DefaultSchema {
  computeAttribute(key, value, modelName, schemaInterface) {
    let ref = computeAttributeReference(key, value, modelName, schemaInterface);
    if (Array.isArray(ref)) {
      return schemaInterface.managedArray(ref.map((v) => schemaInterface.reference(v)));
    } else if (ref) {
      return schemaInterface.reference(ref);
    }

    if (Array.isArray(value)) {
      let nested = value.map((v) => {
        if (typeof v === 'object') {
          let computed = computeNestedModel(key, v, modelName, schemaInterface);
          return computed ? schemaInterface.nested(computed) : v;
        } else {
          let ref = computeAttributeReference(key, v, modelName, schemaInterface);
          if (ref) {
            return schemaInterface.reference(ref);
          } else {
            return v;
          }
        }
      });
      return schemaInterface.managedArray(nested);
    } else {
      let nested = computeNestedModel(key, value, modelName, schemaInterface);
      if (nested) {
        return schemaInterface.nested(nested);
      }
    }
  }

  includesModel(modelName) {
    return BookStoreRegExp.test(modelName);
  }
}

Schema.prototype.models = {
  'com.example.bookstore.book': {
    transforms: {
      pubDate: dateTransform,
    },
  },
};
