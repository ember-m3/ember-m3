import DefaultSchema from 'ember-m3/services/m3-schema';

function dateTransform(value) {
  return new Date(Date.parse(value));
}
const BookStoreRegExp = /^com\.example\.bookstore\./;
const ISBNRegExp = /^isbn:/;
const URNRegExp = /^urn:/;

function computeAttributeReference(key, value) {
  if (typeof value === 'string' && (ISBNRegExp.test(value) || URNRegExp.test(value))) {
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
  computeAttribute(key, rawValue, modelName, schemaInterface) {
    let transformedValue = this.transformValue(modelName, key, rawValue);
    let ref = computeAttributeReference(key, transformedValue, modelName, schemaInterface);

    if (Array.isArray(ref)) {
      return schemaInterface.managedArray(ref.map((v) => schemaInterface.reference(v)));
    } else if (ref) {
      return schemaInterface.reference(ref);
    }

    if (Array.isArray(transformedValue)) {
      let nested = transformedValue.map((v) => {
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
      let nested = computeNestedModel(key, transformedValue, modelName, schemaInterface);
      if (nested) {
        return schemaInterface.nested(nested);
      }
    }

    return transformedValue;
  }

  getTransformFor(modelName, key) {
    let transform = this.models?.[modelName]?.transforms?.[key];
    return transform;
  }

  transformValue(modelName, key, rawValue) {
    let transform = this.getTransformFor(modelName, key);
    return transform ? transform(rawValue) : rawValue;
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
