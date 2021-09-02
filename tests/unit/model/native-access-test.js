import { test, module } from 'qunit';
import { setupTest } from 'ember-qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';
import { CUSTOM_MODEL_CLASS } from 'ember-m3/-infra/features';
import HAS_NATIVE_PROXY from 'ember-m3/utils/has-native-proxy';

if (CUSTOM_MODEL_CLASS && HAS_NATIVE_PROXY) {
  class TestSchema extends DefaultSchema {
    includesModel(modelName) {
      return /^com.example.bookstore\./i.test(modelName);
    }
    setAttribute(modelName, attr, value, schemaInterface) {
      schemaInterface.setAttr(attr, value);
    }
  }

  class NativeSchema extends TestSchema {
    useNativeProperties() {
      return true;
    }
  }

  module('unit/model/native-access', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
      this.store = this.owner.lookup('service:store');
    });

    test('can access model properties via native access', function (assert) {
      this.owner.register('service:m3-schema', NativeSchema);

      this.store.push({
        data: {
          id: 'urn:li:book:1',
          type: 'com.example.bookstore.Book',
          attributes: {
            title: 'How to Win Friends and Influence People',
          },
        },
      });

      let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      assert.equal(
        book.title,
        'How to Win Friends and Influence People',
        'accessed field via native property get'
      );

      assert.equal(
        book.get('title'),
        'How to Win Friends and Influence People',
        'accessing field via .get() still works'
      );
    });

    test('can set and get model propeties via native access', function (assert) {
      let calledSetAttribute = 0;
      class SetSchema extends NativeSchema {
        setAttribute(modelName, attr, value, schemaInterface) {
          calledSetAttribute++;
          assert.equal(attr, 'name', 'called setAttribute for the correct field');
          schemaInterface.setAttr('name', value);
        }
      }
      this.owner.register('service:m3-schema', SetSchema);
      this.store.push({
        data: {
          id: 'urn:li:book:1',
          type: 'com.example.bookstore.Book',
          attributes: {
            title: 'How to Win Friends and Influence People',
          },
        },
      });

      let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      assert.equal(
        book.title,
        'How to Win Friends and Influence People',
        'accessed field via native property get'
      );

      book.name = 'Test name';
      assert.equal(book.name, 'Test name', 'name field got updated');

      assert.equal(calledSetAttribute, 1, 'called setAttribute');

      assert.equal(book.get('name'), 'Test name', 'accessing field via .get() still works');

      book.set('name', 'name2');

      assert.equal(calledSetAttribute, 2, 'called setAttribute');
      assert.equal(book.name, 'name2', 'name field got updated after .set');
    });

    test('can use native properties without triggering m3 setAttribute when useNativeProperties is not defined', function (assert) {
      class NonNativeSetSchema extends TestSchema {
        setAttribute(modelName, attr, value, schemaInterface) {
          assert.ok(false, 'should not call setAttribute when useNativeProperties is not true');
          schemaInterface.setAttr('name', value);
        }
      }

      this.owner.register('service:m3-schema', NonNativeSetSchema);
      this.store.push({
        data: {
          id: 'urn:li:book:1',
          type: 'com.example.bookstore.Book',
          attributes: {
            title: 'How to Win Friends and Influence People',
          },
        },
      });

      let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');
      assert.equal(
        book.something,
        undefined,
        'native property access can loookup an undefined value'
      );

      assert.expectNoDeprecation(() => {
        book.name = 'Temp title';
      });

      assert.equal(book.name, 'Temp title', 'native property access write changes the value');
      assert.throws(
        () => {
          book.title;
        },
        /You attempted to access the `title` property/,
        'Native access of an m3 property errors out'
      );
    });

    test('setting native properties deprecates when useNativeProperties is false', function (assert) {
      class NonNativeSetSchema extends TestSchema {
        setAttribute(modelName, attr, value, schemaInterface) {
          assert.ok(false, 'should not call setAttribute when useNativeProperties is not true');
          schemaInterface.setAttr('name', value);
        }
        useNativeProperties() {
          return false;
        }
      }
      this.owner.register('service:m3-schema', NonNativeSetSchema);
      this.store.push({
        data: {
          id: 'urn:li:book:1',
          type: 'com.example.bookstore.Book',
          attributes: {
            title: 'How to Win Friends and Influence People',
          },
        },
      });

      let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      assert.expectDeprecation(() => {
        book.name = 'Temp title';
      }, `You set the property 'name' on a 'com.example.bookstore.book' with id 'urn:li:book:1'`);

      assert.equal(book.name, 'Temp title', 'native property access write changes the value');
      assert.throws(
        () => {
          book.title;
        },
        /You attempted to access the `title` property/,
        'Native access of an m3 property errors out'
      );
    });

    test('useNativeProperties can be set for each model type', function (assert) {
      let useNativePropertiesCount = 0;
      class DynamicSchema extends NativeSchema {
        useNativeProperties(modelName) {
          if (useNativePropertiesCount === 0) {
            assert.equal(
              modelName,
              'com.example.bookstore.book',
              'Passsed in the correct modelName to useNativeProperties hook'
            );
            useNativePropertiesCount++;
            return true;
          }

          if (useNativePropertiesCount === 1) {
            assert.equal(
              modelName,
              'com.example.bookstore.author',
              'Passsed in the correct modelName to useNativeProperties hook'
            );
            useNativePropertiesCount++;
            return false;
          }
          assert.ok(false, 'Should not reach useNativeProperties more than once per model');
        }
      }
      this.owner.register('service:m3-schema', DynamicSchema);

      this.store.push({
        data: {
          id: 'urn:li:book:1',
          type: 'com.example.bookstore.Book',
          attributes: {
            title: 'How to Win Friends and Influence People',
          },
        },
      });

      let book = this.store.peekRecord('com.example.bookstore.Book', 'urn:li:book:1');

      assert.equal(
        book.title,
        'How to Win Friends and Influence People',
        'accessed field via native property get'
      );

      let author = this.store.push({
        data: {
          id: 'urn:li:author:1',
          type: 'com.example.bookstore.Author',
          attributes: {
            name: 'J.R.R. Tolkien',
          },
        },
      });

      assert.expectDeprecation(() => {
        author.randomProp = 'random value';
      }, `You set the property 'randomProp' on a 'com.example.bookstore.author' with id 'urn:li:author:1'`);

      assert.throws(
        () => {
          author.name;
        },
        /You attempted to access the `name` property/,
        'Native access of an m3 property errors out'
      );
    });
  });
}
