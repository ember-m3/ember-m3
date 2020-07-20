import { test, module } from 'qunit';
import { setupTest } from 'ember-qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';

module('unit/model/dirty', function (hooks) {
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

  test('setAttribute dirties the model if any attribute changes', function (assert) {
    let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

    assert.equal(book.get('isDirty'), false, 'initially not dirty');
    book.set('name', 'A History of the English Speaking Peoples Vol I');
    assert.equal(book.get('isDirty'), true, 'dirty after set');
  });

  test('setAttribute does not dirty the model if no attribute changes', function (assert) {
    let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

    assert.equal(book.get('isDirty'), false, 'initially not dirty');
    book.set('howmuchilikeit', 'a lot');
    assert.equal(book.get('isDirty'), false, 'still not dirty after set');
  });
});
