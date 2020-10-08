import DefaultSchema from 'ember-m3/services/m3-schema';
import { setupTest } from 'ember-qunit';
import schemaVersions from '../../../helpers/schema-versions';

export const BOOK_CLASS_PATH = 'com.example.bookstore.Book';
export const NORM_BOOK_CLASS_PATH = 'com.example.bookstore.book';
export const BOOK_EXCERPT_PROJECTION_CLASS_PATH = 'com.example.bookstore.projection.BookExcerpt';
export const NORM_BOOK_EXCERPT_PROJECTION_CLASS_PATH =
  'com.example.bookstore.projection.book-excerpt';
export const BOOK_PREVIEW_PROJECTION_CLASS_PATH = 'com.example.bookstore.projection.BookPreview';
export const NORM_BOOK_PREVIEW_PROJECTION_CLASS_PATH =
  'com.example.bookstore.projection.book-preview';
export const PROJECTED_AUTHOR_CLASS = 'com.example.bookstore.projectedType.ProjectedAuthor';
export const NORM_PROJECTED_AUTHOR_CLASS = 'com.example.bookstore.projected-type.projected-author';
export const PUBLISHER_CLASS = 'com.example.bookstore.Publisher';
export const NORM_PUBLISHER_CLASS = 'com.example.bookstore.publisher';
export const PROJECTED_PUBLISHER_CLASS = 'com.example.bookstore.projectedType.ProjectedPublisher';
export const NORM_PROJECTED_PUBLISHER_CLASS =
  'com.example.bookstore.projected-type.projected-publisher';

function computeAttributeReference(key, value, modelName, schemaInterface, models) {
  if (/^isbn:/.test(value)) {
    return {
      id: value,
      type: BOOK_CLASS_PATH,
    };
  } else if (/^urn:([^:]+):(.*)/.test(value)) {
    let parts = /^urn:([^:]+):(.*)/.exec(value);
    let type = parts[1];
    let modelSchema = models[modelName];

    if (modelSchema && modelSchema.attributesTypes && modelSchema.attributesTypes[key]) {
      type = modelSchema.attributesTypes[key];
    }
    return {
      type,
      id: parts[2],
    };
  } else if (Array.isArray(value)) {
    if (key === 'similarAuthors') {
      return;
    }
    return value
      .map((v) => {
        let type = null;
        let modelSchema = models[modelName];

        if (modelSchema && modelSchema.attributesTypes && modelSchema.attributesTypes[key]) {
          type = modelSchema.attributesTypes[key];
        }

        return {
          type,
          id: v.id,
        };
      })
      .filter(Boolean);
  }
}
function computeNestedModel(key, value, modelName, schemaInterface, models) {
  if (Array.isArray(value)) {
    return;
  }
  if (!value || typeof value !== 'object' || value.constructor === Date) {
    return null;
  }
  let valueType = value.type;
  let modelSchema = models[modelName];
  if (modelSchema && modelSchema.attributesTypes && modelSchema.attributesTypes[key]) {
    valueType = modelSchema.attributesTypes[key];
  }
  return {
    type: valueType,
    id: value.id,
    attributes: value,
  };
}

const Models = {
  [NORM_BOOK_CLASS_PATH]: {},
  [NORM_BOOK_EXCERPT_PROJECTION_CLASS_PATH]: {
    baseType: BOOK_CLASS_PATH,
    attributes: ['title', 'author', 'year', 'publisher'],
  },
  [NORM_BOOK_PREVIEW_PROJECTION_CLASS_PATH]: {
    baseType: BOOK_CLASS_PATH,
    attributesTypes: {
      publisher: PROJECTED_PUBLISHER_CLASS,
      author: PROJECTED_AUTHOR_CLASS,
      otherBooksInSeries: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
    },
    // if you want to project an embedded model then it must have a type
    //  computedEmbeddedType
    attributes: [
      'title',
      'author',
      'chapter-1',
      'year',
      'publisher',
      'otherBooksInSeries',
      'similarAuthors',
    ],
  },
  [NORM_PUBLISHER_CLASS]: {},
  // this schema must come with the parent schema
  [NORM_PROJECTED_AUTHOR_CLASS]: {
    attributes: ['location', 'name'],
  },
  [NORM_PROJECTED_PUBLISHER_CLASS]: {
    baseType: PUBLISHER_CLASS,
    attributes: ['location', 'name'],
  },
};

export class TestSchema extends DefaultSchema {
  includesModel(modelName) {
    return /^com\.example\.bookstore\./i.test(modelName);
  }

  computeAttribute(key, value, modelName, schemaInterface) {
    let reference = computeAttributeReference(key, value, modelName, schemaInterface, this.models);
    if (Array.isArray(reference)) {
      return schemaInterface.managedArray(reference.map((r) => schemaInterface.reference(r)));
    } else if (reference) {
      return schemaInterface.reference(reference);
    }

    if (Array.isArray(value)) {
      let nested = value.map((v) => {
        if (typeof v === 'object') {
          return schemaInterface.nested(
            computeNestedModel(key, v, modelName, schemaInterface, this.models)
          );
        } else {
          let ref = computeAttributeReference(key, v, modelName, schemaInterface, this.models);
          if (ref) {
            return schemaInterface.reference(ref);
          } else {
            return v;
          }
        }
      });
      return schemaInterface.managedArray(nested);
    } else {
      let nested = computeNestedModel(key, value, modelName, schemaInterface, this.models);
      if (nested) {
        return schemaInterface.nested(nested);
      }
    }
  }

  computeBaseModelName(modelName) {
    let schema = this.models[modelName];

    if (schema !== undefined) {
      return schema.baseType;
    }
  }
}
TestSchema.prototype.models = Models;

export function* setupTestPerSchema() {
  for (let { name, schemaClass } of schemaVersions(TestSchema)) {
    let setupProjectionTest = (hooks) => {
      setupTest(hooks);

      hooks.beforeEach(function () {
        this.store = this.owner.lookup('service:store');
        this.owner.register('service:m3-schema', schemaClass);
        this.schemaManager = this.owner.lookup('service:m3-schema-manager');
      });
    };

    yield { name, setupTest: setupProjectionTest };
  }
}
