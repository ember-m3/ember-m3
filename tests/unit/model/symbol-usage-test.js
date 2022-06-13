/**
 * This test shows how to use a symbol as a model attribute
 * in ember-m3.
 *
 * Unlike a regular model attribute, A symbol attribute mySymbol
 * can only be referred to as model[mySymbol]. The typical model.set(),
 * model.get() and model.mySymbol are not working.
 */

import { test, module } from 'qunit';
import { setupTest } from 'ember-qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';

module('unit/model/symbol-intercept', function (hooks) {
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
      // The setting below is optional
      // useNativeProperties() {
      //   return true;
      // }
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

  test('Set and get an attribute using a symbol should work', function (assert) {
    let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

    const mySymbol = Symbol('mySymbol');
    book[mySymbol] = book.id;

    assert.equal(book[mySymbol], 'urn:li:book:1', 'Reading a symbol attribute should work');
  });
});
