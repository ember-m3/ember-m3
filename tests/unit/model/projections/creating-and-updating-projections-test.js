import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { Promise } from 'rsvp';
import EmberObject from '@ember/object';
import { get } from '@ember/object';
import DefaultSchema from 'ember-m3/services/m3-schema';
/*
  Ember Data currently dasherizes modelNames for use within the store, in these tests
  payloads given to the store use non-normalized modelNames while schemas and
  anything which accesses a model's modelName uses the normalized (dasherized) version.
 */
const BOOK_CLASS_PATH = 'com.example.bookstore.Book';
const NORM_BOOK_CLASS_PATH = 'com.example.bookstore.book';
const NORM_BOOK_EXCERPT_PROJECTION_CLASS_PATH = 'com.example.bookstore.projection.book-excerpt';
const BOOK_PREVIEW_PROJECTION_CLASS_PATH = 'com.example.bookstore.projection.BookPreview';
const NORM_BOOK_PREVIEW_PROJECTION_CLASS_PATH = 'com.example.bookstore.projection.book-preview';
const PROJECTED_AUTHOR_CLASS = 'com.example.bookstore.projectedType.ProjectedAuthor';
const NORM_PROJECTED_AUTHOR_CLASS = 'com.example.bookstore.projected-type.projected-author';
const AUTHORS_CLASS_PATH = 'com.example.bookstore.Authors';
const NORM_AUTHORS_CLASS_PATH = 'com.example.bookstore.authors';
const PROJECTED_AUTHORS_CLASS_PATH = 'com.example.bookstore.projectedType.ProjectedAuthors';
const NORM_PROJECTED_AUTHORS_CLASS_PATH = 'com.example.bookstore.projected-type.projected-authors';

const Models = {
  [NORM_BOOK_CLASS_PATH]: {},
  [NORM_BOOK_EXCERPT_PROJECTION_CLASS_PATH]: {
    baseType: BOOK_CLASS_PATH,
    attributes: ['title', 'authors'],
  },
  [NORM_BOOK_PREVIEW_PROJECTION_CLASS_PATH]: {
    baseType: BOOK_CLASS_PATH,
    attributesTypes: {
      authors: PROJECTED_AUTHORS_CLASS_PATH,
    },
    // if you want to project an embedded model then it must have a type
    //  computedEmbeddedType

    attributes: ['title', 'authors'],
  },
  [NORM_AUTHORS_CLASS_PATH]: {
    attributes: ['people'],
  },
  [NORM_PROJECTED_AUTHORS_CLASS_PATH]: {
    baseType: AUTHORS_CLASS_PATH,
    attributesTypes: {
      people: PROJECTED_AUTHOR_CLASS,
    },
    attributes: ['people'],
  },
  // this schema must come with the parent schema
  [NORM_PROJECTED_AUTHOR_CLASS]: {
    attributes: ['name'],
  },
};
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
    return value
      .map((v) => {
        let type = null;
        let modelSchema = this.models[modelName];

        if (modelSchema && modelSchema.attributesTypes && modelSchema.attributesTypes[key]) {
          type = modelSchema.attributesTypes[key];
        }

        return {
          type,
          id: get(v, 'id'),
        };
      })
      .filter(Boolean);
  }
}
function computeNestedModel(key, value, modelName, schemaInterface, models) {
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

class TestSchema extends DefaultSchema {
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

class TestSchemaOldHooks extends DefaultSchema {
  includesModel(modelName) {
    return /^com\.example\.bookstore\./i.test(modelName);
  }

  computeAttributeReference(key, value, modelName) {
    if (/^isbn:/.test(value)) {
      return {
        id: value,
        type: BOOK_CLASS_PATH,
      };
    } else if (/^urn:([^:]+):(.*)/.test(value)) {
      let parts = /^urn:([^:]+):(.*)/.exec(value);
      let type = parts[1];
      let modelSchema = this.models[modelName];

      if (modelSchema && modelSchema.attributesTypes && modelSchema.attributesTypes[key]) {
        type = modelSchema.attributesTypes[key];
      }
      return {
        type,
        id: parts[2],
      };
    } else if (Array.isArray(value)) {
      return value
        .map((v) => {
          let type = null;
          let modelSchema = this.models[modelName];

          if (modelSchema && modelSchema.attributesTypes && modelSchema.attributesTypes[key]) {
            type = modelSchema.attributesTypes[key];
          }

          return {
            type,
            id: get(v, 'id'),
          };
        })
        .filter(Boolean);
    }
  }

  computeNestedModel(key, value, modelName) {
    if (!value || typeof value !== 'object' || value.constructor === Date) {
      return null;
    }
    let valueType = value.type;
    let modelSchema = this.models[modelName];
    if (modelSchema && modelSchema.attributesTypes && modelSchema.attributesTypes[key]) {
      valueType = modelSchema.attributesTypes[key];
    }
    return {
      type: valueType,
      id: value.id,
      attributes: value,
    };
  }

  computeBaseModelName(modelName) {
    let schema = this.models[modelName];

    if (schema !== undefined) {
      return schema.baseType;
    }
  }
}
TestSchemaOldHooks.prototype.models = Models;

for (let testRun = 0; testRun < 2; testRun++) {
  module('creatingu and updating projections with resolutions', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
      this.store = this.owner.lookup('service:store');
      if (testRun === 0) {
        this.owner.register('service:m3-schema', TestSchemaOldHooks);
      } else if (testRun === 1) {
        this.owner.register('service:m3-schema', TestSchema);
      }
      this.schemaManager = this.owner.lookup('service:m3-schema-manager');
    });

    const BOOK_ID = 'isbn:123';
    const BOOK_TITLE_1 = 'Alice in Wonderland';
    const BOOK_AUTHOR_ID_1 = 'author:1';
    const BOOK_AUTHOR_NAME_1 = 'Lewis Carol';

    test('newly created and saved projections with embedded records that are resolutions can receive updates', async function (assert) {
      this.owner.register(
        'adapter:-ember-m3',
        EmberObject.extend({
          createRecord() {
            return Promise.resolve({
              data: {
                id: BOOK_ID,
                type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
                attributes: {},
              },
            });
          },
          updateRecord() {
            return Promise.resolve({
              data: {
                id: BOOK_ID,
                type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
              },
            });
          },
        })
      );

      let authorPreview = this.store.push({
        data: {
          type: PROJECTED_AUTHOR_CLASS,
          id: BOOK_AUTHOR_ID_1,
          attributes: {
            name: BOOK_AUTHOR_NAME_1,
          },
        },
      });

      let projectedPreview = this.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
        title: BOOK_TITLE_1,
        authors: {
          $type: AUTHORS_CLASS_PATH,
          people: [],
        },
      });

      let authors = get(projectedPreview, 'authors');
      let people = get(authors, 'people');

      people.pushObject(authorPreview);

      // reify the nested model
      let name = get(authors, 'people.firstObject.name');
      assert.equal(name, BOOK_AUTHOR_NAME_1);

      await projectedPreview.save();

      assert.equal(
        get(projectedPreview, 'title'),
        BOOK_TITLE_1,
        'Expected preview projection to have correct title'
      );
      assert.equal(
        get(projectedPreview, 'authors.people.firstObject.name'),
        BOOK_AUTHOR_NAME_1,
        'Expected preview projection to have correct author.name'
      );

      people.removeObject(authorPreview);
      await projectedPreview.save();

      assert.equal(
        get(projectedPreview, 'authors.people.length'),
        0,
        'Expected preview projection to have no authors'
      );
    });
  });
}
