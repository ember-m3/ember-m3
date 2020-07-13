import { test, module } from 'qunit';
import { setupTest } from 'ember-qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';

class TestSchema extends DefaultSchema {
  includesModel() {
    return true;
  }

  computeAttribute(key, value, modelName, schemaInterface) {
    return schemaInterface.reference({ id: null, type: 'com.example.Author' });
  }
}
class TestSchemaOldHooks extends DefaultSchema {
  includesModel() {
    return true;
  }

  computeAttributeReference() {
    return { id: null, type: 'com.example.Author' };
  }
}

for (let testRun = 0; testRun < 2; testRun++) {
  module(
    `unit/model/references-test with  ${testRun === 0 ? 'old hooks' : 'with computeAttribute'}`,
    function(hooks) {
      setupTest(hooks);

      hooks.beforeEach(function() {
        if (testRun === 0) {
          this.owner.register('service:m3-schema', TestSchemaOldHooks);
        } else if (testRun === 1) {
          this.owner.register('service:m3-schema', TestSchema);
        }
        this.store = this.owner.lookup('service:store');
      });

      test('references with null ids return null records', function(assert) {
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

      test('references are prioritized over raw values for determining isArray', function(assert) {
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
    }
  );
}
