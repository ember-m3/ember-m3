import { module, test } from 'qunit';
import SchemaManager from 'ember-m3/services/m3-schema-manager';

module('unit/schema-manager', function(hooks) {
  hooks.beforeEach(function() {
    this.schemaManager = SchemaManager.create();
  });
  module('.registerSchema', function() {
    test('it allows only a single global schema', function(assert) {
      let schema1 = {
        includesModel: function(key) {
          return key === 'm1';
        },
        computeAttributeReference: function() {},
        computeNestedModel: function() {},
        models: {},
      };

      let schema2 = {
        includesModel: function(key) {
          return key === 'm2';
        },
        computeAttributeReference: function() {},
        computeNestedModel: function() {},
        models: {},
      };

      this.schemaManager.registerSchema(schema1);
      assert.ok(this.schemaManager.includesModel('m1'), 'schema1 reigstered (includes m1)');
      assert.notOk(this.schemaManager.includesModel('m2'), 'schema1 reigstered (!includes m2)');

      this.schemaManager.registerSchema(schema2);
      assert.notOk(this.schemaManager.includesModel('m1'), 'schema2 reigstered (!includes m1)');
      assert.ok(this.schemaManager.includesModel('m2'), 'schema2 reigstered (includes m2)');
    });
  });

  module('schemas', function() {
    test('can specify what models the schema handles', function(assert) {
      this.schemaManager.registerSchema({
        includesModel(modelName) {
          return /com\.example\.bookstore\.*/i.test(modelName);
        },
      });

      assert.equal(this.schemaManager.includesModel('com.example.bookstore.Book'), true);
      assert.equal(this.schemaManager.includesModel('com.example.petstore.Pet'), false);
    });

    test('can specify what fields refer to other models in the store', function(assert) {
      this.schemaManager.registerSchema({
        computeAttributeReference(key, value) {
          if (/^ref-/i.test(key)) {
            return {
              type: key.substring('ref-'.length),
              id: value,
            };
          }
          return null;
        },
      });

      assert.deepEqual(this.schemaManager.computeAttributeReference('ref-foo', 200), {
        type: 'foo',
        id: 200,
      });
      assert.deepEqual(this.schemaManager.computeAttributeReference('foo', 70), null);
    });

    test('can specify a nested model matcher', function(assert) {
      this.schemaManager.registerSchema({
        computeNestedModel(key) {
          return /com\.example\./i.test(key);
        },
      });

      assert.equal(this.schemaManager.computeNestedModel('com.example.bookstore.Author'), true);
      assert.equal(this.schemaManager.computeNestedModel('name'), false);
    });

    test('can specify per-modelName transforms', function(assert) {
      this.schemaManager.registerSchema({
        models: {
          'com.example.bookstore.Book': {
            transforms: {
              name: function(value) {
                return `${value} OMG!`;
              },
            },
          },
        },
      });

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

    test('can specify per-modelName whitelisted attributes', function(assert) {
      this.schemaManager.registerSchema({
        models: {
          'com.example.bookstore.Book': {
            attributes: ['name'],
          },
          'com.example.bookstore.Author': {
            attributes: null,
          },
          'com.example.bookstore.ReaderComment': {},
        },
      });

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

  test('.isAttributeIncluded does not error when no schema is registered', function(assert) {
    assert.equal(this.schemaManager.isAttributeIncluded('com.example.movies.Movie', 'name'), true);
  });

  test('.transformValue does not error when no schema is registered', function(assert) {
    assert.equal(
      this.schemaManager.transformValue('com.example.moves.Movie', 'name', 'jeff'),
      'jeff'
    );
  });
});
