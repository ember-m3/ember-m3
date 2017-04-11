import { module, test } from 'qunit';
import SchemaManager from 'ember-m3/schema-manager';

module('unit/schema-manager', function() {
  module('.registerSchema', function() {
    test('it allows only a single global schema', function(assert) {
      let schema1 = {
        includesModel: function() {},
        computeAttributeReference: function() {},
        isAttributeANestedModel: function() {},
        models: {},
      };

      let schema2 = {
        includesModel: function() {},
        computeAttributeReference: function() {},
        isAttributeANestedModel: function() {},
        models: {},
      };

      SchemaManager.registerSchema(schema1);
      assert.equal(SchemaManager.includesModel, schema1.includesModel);
      assert.equal(SchemaManager.computeAttributeReference, schema1.computeAttributeReference);
      assert.equal(SchemaManager.isAttributeANestedModel, schema1.isAttributeANestedModel);
      assert.equal(SchemaManager._models, schema1.models);

      SchemaManager.registerSchema(schema2);
      assert.equal(SchemaManager.includesModel, schema2.includesModel);
      assert.equal(SchemaManager.computeAttributeReference, schema2.computeAttributeReference);
      assert.equal(SchemaManager.isAttributeANestedModel, schema2.isAttributeANestedModel);
      assert.equal(SchemaManager._models, schema2.models);
    });
  });

  module('schemas', function() {
    test('can specify what models the schema handles', function(assert) {
      SchemaManager.registerSchema({
        includesModel(modelName) {
          return /gg\.*/i.test(modelName);
        }
      });

      assert.equal(SchemaManager.includesModel('gg.foo'), true);
      assert.equal(SchemaManager.includesModel('com.bar'), false);
    });

    test('can specify what fields refer to other models in the store', function(assert) {
      SchemaManager.registerSchema({
        computeAttributeReference(key, value) {
          if (/^ref-/i.test(key)) {
            return {
              type: key.substring('ref-'.length),
              id: value,
            };
          }
          return null;
        }
      });

      assert.deepEqual(SchemaManager.computeAttributeReference('ref-foo', 200), { type: 'foo', id: 200 });
      assert.deepEqual(SchemaManager.computeAttributeReference('foo', 70), null);
    });

    test('can specify a nested model matcher', function(assert) {
      SchemaManager.registerSchema({
        isAttributeANestedModel(key) {
          return /gg\./i.test(key);
        }
      });

      assert.equal(SchemaManager.isAttributeANestedModel('gg.foo'), true);
      assert.equal(SchemaManager.isAttributeANestedModel('name'), false);
    });

    test('can specify per-modelName transforms', function(assert) {
      SchemaManager.registerSchema({
        models: {
          'gg.foo': {
            transforms: {
              name: function (value) { return `${value} OMG!`; }
            }
          }
        }
      });

      assert.equal(SchemaManager.transformValue('gg.foo', 'name', 'jeff'), 'jeff OMG!');
      assert.equal(SchemaManager.transformValue('gg.foo', 'secretName', 'jeff'), 'jeff');
      assert.equal(SchemaManager.transformValue('gg.wat', 'name', 'jeff'), 'jeff');
    });

    test('can specify per-modelName whitelisted attributes', function(assert) {
      SchemaManager.registerSchema({
        models: {
          'gg.foo': {
            attributes: ['name']
          },
          'gg.bar': {
            attributes: null
          },
          'gg.baz': {
          },
        }
      });

      assert.equal(SchemaManager.isAttributeIncluded('gg.foo', 'name'), true);
      assert.equal(SchemaManager.isAttributeIncluded('gg.foo', 'age'),  false);
      assert.equal(SchemaManager.isAttributeIncluded('gg.bar', 'name'), true);
      assert.equal(SchemaManager.isAttributeIncluded('gg.bar', 'age'),  true);
      assert.equal(SchemaManager.isAttributeIncluded('gg.baz', 'name'), true);
      assert.equal(SchemaManager.isAttributeIncluded('gg.baz', 'age'),  true);
      assert.equal(SchemaManager.isAttributeIncluded('gg.wat', 'name'), true);
      assert.equal(SchemaManager.isAttributeIncluded('gg.wat', 'age'),  true);
    });
  });

  test('.isAttributeIncluded does not error when no schema is registered', function(assert) {
    assert.equal(SchemaManager.isAttributeIncluded('gg.omg', 'name'), true);
  });

  test('.transformValue does not error when no schema is registered', function(assert) {
    assert.equal(SchemaManager.transformValue('gg.foo', 'name', 'jeff'), 'jeff');
  });
});
