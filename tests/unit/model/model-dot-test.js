import { test, module } from 'qunit';
import { setupTest } from 'ember-qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';

module('unit/model/model-dot', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.store = this.owner.lookup('service:store');

    class TestSchema extends DefaultSchema {
      includesModel(modelName) {
        return /^com.example.bookstore\./i.test(modelName);
      }
      setAttribute(modelName, attr, value, schemaInterface) {
        if (attr === 'name') {
          schemaInterface.setAttr('title', value);
        }
      }
    }
    this.owner.register('service:m3-schema', TestSchema);

    this.store.push({
      data: {
        id: 'urn:li:book:1',
        type: 'com.example.bookstore.Book',
        attributes: {
          title: 'How to Win Friends and Influence People',
        },
      },
    });
  });

  test('dot property access', function (assert) {
    let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');
    book.someValue = 'something';
    assert.equal(book.someValue, 'something', 'wrote and accessed a property');
    assert.equal(book.otherValue, undefined, 'can read a non written property');
  });
});
