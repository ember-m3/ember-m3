import { test, module } from 'qunit';
import { setupTest } from 'ember-qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';
import { run } from '@ember/runloop';
import { HAS_MODEL_PACKAGE } from 'ember-m3/-infra/packages';
import require from 'require';

let Model, attr;
if (HAS_MODEL_PACKAGE) {
  let ModelPackage = require('@ember-data/model');
  Model = ModelPackage.default;
  attr = ModelPackage.attr;
} else {
  let DSPackage = require('ember-data').default;
  Model = DSPackage.Model;
  attr = DSPackage.attr;
}

let computeAttributeReference = function computeAttributeReference(modelName) {
  if (modelName === 'publishers') {
    return [{ id: '1', type: 'publisher' }];
  } else {
    return { id: null, type: 'com.example.Author' };
  }
};

class TestSchema extends DefaultSchema {
  includesModel(modelName) {
    if (modelName === 'publisher') {
      return false;
    }
    return true;
  }

  computeAttribute(key, value, modelName, schemaInterface) {
    let reference = computeAttributeReference(key, value, modelName, schemaInterface);
    if (Array.isArray(reference)) {
      return schemaInterface.managedArray(reference.map((r) => schemaInterface.reference(r)));
    } else if (reference) {
      return schemaInterface.reference(reference);
    }
  }
}

class TestSchemaOldHooks extends DefaultSchema {
  includesModel(modelName) {
    if (modelName === 'publisher') {
      return false;
    }
    return true;
  }

  computeAttributeReference(key, value, modelName, schemaInterface) {
    return computeAttributeReference(key, value, modelName, schemaInterface);
  }
}

for (let i = 0; i < 2; i++) {
  module(
    `unit/model/references-test (interop with @ember-data/model) ${
      i ? 'old hooks' : 'computeAttribute'
    }`,
    function (hooks) {
      setupTest(hooks);

      hooks.beforeEach(function () {
        this.Publisher = Model.extend({
          name: attr('string'),
        });
        this.Publisher.toString = () => 'Publisher';
        this.owner.register('model:publisher', this.Publisher);

        if (i === 0) {
          this.owner.register('service:m3-schema', TestSchemaOldHooks);
        } else if (i === 1) {
          this.owner.register('service:m3-schema', TestSchema);
        }
        this.store = this.owner.lookup('service:store');
      });

      test('references with null ids return null records', function (assert) {
        this.store.push({
          data: {
            id: 'urn:book:1',
            type: 'com.example.Book',
            attributes: {
              author: null,
            },
          },
        });

        let book = this.store.peekRecord('com.example.Book', 'urn:book:1');
        assert.equal(book.id, 'urn:book:1', 'book pushed into store');

        assert.strictEqual(book.get('author'), null, 'reference with null id does not error');
      });

      test('references are prioritized over raw values for determining isArray', function (assert) {
        this.store.push({
          data: {
            id: 'urn:book:1',
            type: 'com.example.Book',
            attributes: {
              author: ['urn:author:1'],
            },
          },
        });

        let book = this.store.peekRecord('com.example.Book', 'urn:book:1');
        assert.equal(book.id, 'urn:book:1', 'book pushed into store');

        assert.strictEqual(
          book.get('author'),
          null,
          'null reference with raw array value does not error'
        );
      });

      test('references to @ember-data/model Models', function (assert) {
        this.store.push({
          data: {
            id: 'urn:book:1',
            type: 'com.example.Book',
            attributes: {
              author: null,
              publishers: '',
            },
          },
          included: [
            {
              type: 'publisher',
              id: '1',
              attributes: {
                name: 'eric',
              },
            },
          ],
        });

        let book = this.store.peekRecord('com.example.Book', 'urn:book:1');
        assert.equal(book.id, 'urn:book:1', 'book pushed into store');
        let bookPublishers = book.get('publishers');
        let bookPublisher = bookPublishers.objectAt(0);
        assert.strictEqual(
          bookPublisher.get('name'),
          'eric',
          'reference to @ember-data/model resolves'
        );
        assert.ok(bookPublisher instanceof Model, 'reference is a @ember-data/model');
        assert.strictEqual(
          bookPublisher,
          this.store.peekRecord('publisher', '1'),
          'reference and peekRecord resolve to the same model'
        );
      });

      test('unloading @ember-data/model Models removes them from reference arrays', function (assert) {
        this.store.push({
          data: {
            id: 'urn:book:1',
            type: 'com.example.Book',
            attributes: {
              author: null,
              publishers: '',
            },
          },
          included: [
            {
              type: 'publisher',
              id: '1',
              attributes: {
                name: 'eric',
              },
            },
          ],
        });

        let book = this.store.peekRecord('com.example.Book', 'urn:book:1');
        assert.equal(book.id, 'urn:book:1', 'book pushed into store');
        let publisher = this.store.peekRecord('publisher', '1');

        let bookPublishers = book.get('publishers');
        assert.strictEqual(
          bookPublishers.objectAt(0).get('name'),
          'eric',
          'reference to @ember-data/model resolves'
        );
        assert.strictEqual(
          bookPublishers.get('length'),
          1,
          'initial length of reference array is correct'
        );
        run(() => publisher.unloadRecord());
        assert.strictEqual(
          bookPublishers.get('length'),
          0,
          'record is removed from the reference array'
        );
      });

      test('unloading unresolved @ember-data/model Models removes them from reference arrays', function (assert) {
        this.store.push({
          data: {
            id: 'urn:book:1',
            type: 'com.example.Book',
            attributes: {
              author: null,
              publishers: '',
            },
          },
          included: [
            {
              type: 'publisher',
              id: '1',
              attributes: {
                name: 'eric',
              },
            },
          ],
        });

        let book = this.store.peekRecord('com.example.Book', 'urn:book:1');
        assert.equal(book.id, 'urn:book:1', 'book pushed into store');
        let publisher = this.store.peekRecord('publisher', '1');

        let bookPublishers = book.get('publishers');
        assert.strictEqual(
          bookPublishers.objectAt(0).get('name'),
          'eric',
          'reference to @ember-data/model resolves'
        );
        assert.strictEqual(
          bookPublishers.get('length'),
          1,
          'initial length of reference array is correct'
        );
        this.store.push({
          data: {
            id: 'urn:book:1',
            type: 'com.example.Book',
            attributes: {
              author: null,
              publishers: 'hi',
            },
          },
        });
        run(() => publisher.unloadRecord());
        assert.strictEqual(
          bookPublishers.get('length'),
          0,
          'record is removed from the reference array'
        );
      });
    }
  );
}
