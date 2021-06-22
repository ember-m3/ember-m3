import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';

module('unit/schema-manager', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.schemaManager = this.owner.lookup('service:m3-schema-manager');
    this.registerSchema = (schema) => {
      this.owner.register('service:m3-schema', schema);
    };
  });

  module('schemas', function () {
    test('can specify what models the schema handles', function (assert) {
      this.registerSchema(
        class TestSchema extends DefaultSchema {
          includesModel(modelName) {
            return /com\.example\.bookstore\.*/i.test(modelName);
          }
        }
      );

      assert.equal(this.schemaManager.includesModel('com.example.bookstore.Book'), true);
      assert.equal(this.schemaManager.includesModel('com.example.petstore.Pet'), false);
    });

    test('can specify what fields refer to other models in the store', function (assert) {
      this.registerSchema(
        class TestSchema extends DefaultSchema {
          computeAttributeReference(key, value) {
            if (/^ref-/i.test(key)) {
              return {
                type: key.substring('ref-'.length),
                id: value,
              };
            }
            return null;
          }
        }
      );

      assert.deepEqual(this.schemaManager.computeAttributeReference('ref-foo', 200), {
        type: 'foo',
        id: 200,
      });
      assert.deepEqual(this.schemaManager.computeAttributeReference('foo', 70), null);
    });

    test('can specify a nested model matcher', function (assert) {
      this.registerSchema(
        class TestSchema extends DefaultSchema {
          computeNestedModel(key) {
            return /com\.example\./i.test(key);
          }
        }
      );

      assert.equal(this.schemaManager.computeNestedModel('com.example.bookstore.Author'), true);
      assert.equal(this.schemaManager.computeNestedModel('name'), false);
    });

    test('can specify per-modelName transforms', function (assert) {
      class TestSchema extends DefaultSchema {}
      TestSchema.prototype.models = {
        'com.example.bookstore.Book': {
          transforms: {
            name: function (value) {
              return `${value} OMG!`;
            },
          },
        },
      };
      this.registerSchema(TestSchema);

      assert.equal(
        this.schemaManager.transformValue('com.example.bookstore.Book', 'name', 'jeff'),
        'jeff OMG!'
      );
      assert.equal(
        this.schemaManager.transformValue('com.example.bookstore.Book', 'alternateName', 'jeff'),
        'jeff'
      );
      assert.equal(
        this.schemaManager.transformValue('com.example.bookstore.Author', 'name', 'jeff'),
        'jeff'
      );
    });

    test('can specify per-modelName whitelisted attributes', function (assert) {
      class TestSchema extends DefaultSchema {}
      TestSchema.prototype.models = {
        'com.example.bookstore.Book': {
          attributes: ['name'],
        },
        'com.example.bookstore.Author': {
          attributes: null,
        },
        'com.example.bookstore.ReaderComment': {},
      };
      this.registerSchema(TestSchema);

      assert.equal(
        this.schemaManager.isAttributeIncluded('com.example.bookstore.Book', 'name'),
        true
      );
      assert.equal(
        this.schemaManager.isAttributeIncluded('com.example.bookstore.Book', 'age'),
        false
      );
      assert.equal(
        this.schemaManager.isAttributeIncluded('com.example.bookstore.Author', 'name'),
        true
      );
      assert.equal(
        this.schemaManager.isAttributeIncluded('com.example.bookstore.Author', 'age'),
        true
      );
      assert.equal(
        this.schemaManager.isAttributeIncluded('com.example.bookstore.ReaderComment', 'name'),
        true
      );
      assert.equal(
        this.schemaManager.isAttributeIncluded('com.example.bookstore.ReaderComment', 'age'),
        true
      );
      assert.equal(
        this.schemaManager.isAttributeIncluded('com.example.bookstore.SearchResult', 'name'),
        true
      );
      assert.equal(
        this.schemaManager.isAttributeIncluded('com.example.bookstore.SearchResult', 'age'),
        true
      );
    });
  });

  test('.isAttributeIncluded does not error when no schema is registered', function (assert) {
    assert.equal(this.schemaManager.isAttributeIncluded('com.example.movies.Movie', 'name'), true);
  });

  test('.transformValue does not error when no schema is registered', function (assert) {
    assert.equal(
      this.schemaManager.transformValue('com.example.moves.Movie', 'name', 'jeff'),
      'jeff'
    );
  });

  test('computeBaseModelName asserts the input is not returned', function (assert) {
    this.registerSchema(
      class TestSchema extends DefaultSchema {
        computeBaseModelName(/* modelName */) {
          return 'com.example.BaseType';
        }
      }
    );

    assert.equal(
      this.schemaManager.computeBaseModelName('x'),
      'com.example.BaseType',
      'computeBaseModel(projection)'
    );
    assert.throws(() => {
      this.schemaManager.computeBaseModelName('com.example.BaseType');
    }, /projection cycle/);
  });

  test('detects when schema has not defined a computeAttribute hook', function (assert) {
    this.registerSchema(
      class TestSchema extends DefaultSchema {
        includesModel(modelName) {
          return /com\.example\.bookstore\.*/i.test(modelName);
        }
      }
    );

    assert.equal(this.schemaManager.useComputeAttribute(), false);
  });
  test('detects when schema has  defined a computeAttribute hook ', function (assert) {
    this.registerSchema(
      class TestSchema extends DefaultSchema {
        computeAttribute() {
          return { value: 'a' };
        }
        includesModel(modelName) {
          return /com\.example\.bookstore\.*/i.test(modelName);
        }
      }
    );

    assert.equal(this.schemaManager.useComputeAttribute(), true);
  });
  test('detects when schema has not defined a computeAttribute hook - object extend', function (assert) {
    this.registerSchema(
      DefaultSchema.extend({
        includesModel(modelName) {
          return /com\.example\.bookstore\.*/i.test(modelName);
        },
      })
    );

    assert.equal(this.schemaManager.useComputeAttribute(), false);
  });

  test('detects when schema has defined a computeAttribute hook - object extend', function (assert) {
    this.registerSchema(
      DefaultSchema.extend({
        includesModel(modelName) {
          return /com\.example\.bookstore\.*/i.test(modelName);
        },
        computeAttribute() {
          return { value: 'a' };
        },
      })
    );
    assert.equal(this.schemaManager.useComputeAttribute(), true);
  });

  test("schema's useUnderlyingErrorsValue returns true", function (assert) {
    this.registerSchema(
      class TestSchema extends DefaultSchema {
        useUnderlyingErrorsValue(modelName) {
          assert.equal(
            modelName,
            'com.example.bookstore.Book',
            "model name is passed to schema's useUnderlyingErrorsValue function"
          );
          return true;
        }
      }
    );
    assert.equal(this.schemaManager.useUnderlyingErrorsValue('com.example.bookstore.Book'), true);
  });

  test("schema's useUnderlyingErrorsValue returns false", function (assert) {
    this.registerSchema(
      class TestSchema extends DefaultSchema {
        useUnderlyingErrorsValue(modelName) {
          assert.equal(
            modelName,
            'com.example.bookstore.Book',
            "model name is passed to schema's useUnderlyingErrorsValue function"
          );
          return false;
        }
      }
    );
    assert.equal(this.schemaManager.useUnderlyingErrorsValue('com.example.bookstore.Book'), false);
  });

  test("schema's default useUnderlyingErrorsValue function call as false", function (assert) {
    this.registerSchema(DefaultSchema);
    assert.equal(this.schemaManager.useUnderlyingErrorsValue(), false);
  });
});
