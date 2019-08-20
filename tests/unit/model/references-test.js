import { test, module } from 'qunit';
import { setupTest } from 'ember-qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';

module('unit/model/references-test', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    class TestSchema extends DefaultSchema {
      includesModel() {
        return true;
      }

      computeAttributeReference() {
        return { id: null, type: 'com.example.Author' };
      }
    }
    this.owner.register('service:m3-schema', TestSchema);
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
});
