import { module, test, setupTest } from 'ember-qunit';
import { get } from '@ember/object';
import { run } from '@ember/runloop';
import EmberObject from '@ember/object';
import DefaultSchema from 'ember-m3/services/m3-schema';

function computeNestedModel(key, value, modelName, schemaInterface) {
  if (key === 'author' && /\.proj\./.test(modelName)) {
    return {
      attributes: {
        id: schemaInterface.getAttr('id'),
        name: 'JK Rowling',
      },
    };
  }
}
const Models = {
  'com.example.bookstore.proj.book-with-author': {
    baseType: 'com.example.bookstore.book',
  },
  'com.example.bookstore.proj.book-with-only-author': {
    baseType: 'com.example.bookstore.book',
    attributes: ['author', 'authorId'],
  },
};

class TestSchema extends DefaultSchema {
  includesModel() {
    return true;
  }

  computeAttribute(key, value, modelName, schemaInterface) {
    let nested = computeNestedModel(key, value, modelName, schemaInterface);
    if (nested) {
      return schemaInterface.nested(nested);
    }
  }

  computeBaseModelName(modelName) {
    let modelSchema = this.models[modelName];

    if (modelSchema) {
      return modelSchema.baseType;
    }
  }
}

TestSchema.prototype.models = Models;

class TestSchemaOldHooks extends DefaultSchema {
  includesModel() {
    return true;
  }

  computeNestedModel(key, value, modelName, schemaInterface) {
    return computeNestedModel(key, value, modelName, schemaInterface);
  }

  computeBaseModelName(modelName) {
    let modelSchema = this.models[modelName];

    if (modelSchema) {
      return modelSchema.baseType;
    }
  }
}
TestSchemaOldHooks.prototype.models = Models;

for (let testRun = 0; testRun < 2; testRun++) {
  module(
    `unit/model/projections/serialize with ${
      testRun === 0 ? 'old hooks' : 'with computeAttribute'
    }`,
    function(hooks) {
      setupTest(hooks);

      hooks.beforeEach(function() {
        this.store = this.owner.lookup('service:store');
        if (testRun === 0) {
          this.owner.register('service:m3-schema', TestSchemaOldHooks);
        } else if (testRun === 1) {
          this.owner.register('service:m3-schema', TestSchema);
        }
      });

      test(`projectionModel.eachAttribute defers to base model`, function(assert) {
        run(() =>
          this.store.push({
            data: {
              id: 'isbn:9780439708180',
              type: 'com.example.bookstore.book',
              attributes: {
                name: `Harry Potter and the Sorcerer's Stone`,
                authorId: 'author:1',
              },
            },
            included: [
              {
                id: 'isbn:9780439708180',
                type: 'com.example.bookstore.proj.book-with-author',
                attributes: {},
              },
            ],
          })
        );

        const bookWithAuthor = this.store.peekRecord(
          'com.example.bookstore.proj.BookWithAuthor',
          'isbn:9780439708180'
        );

        assert.deepEqual(
          get(bookWithAuthor, 'author.name'),
          'JK Rowling',
          'projected model has extra fields that depend on base model'
        );

        this.owner.register(
          'serializer:-ember-m3',
          class TestSerializer extends EmberObject {
            serialize(snapshot) {
              let attrsIterated = [];
              snapshot.eachAttribute(key => attrsIterated.push(key));

              assert.deepEqual(
                attrsIterated.sort(),
                ['authorId', 'name'],
                `when attributes is absent, keys(data) is iterated`
              );
            }
          }
        );

        bookWithAuthor.serialize();
      });
    }
  );
}
