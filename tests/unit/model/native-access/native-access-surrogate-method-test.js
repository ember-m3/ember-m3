/**
 * A test case to show that 'firstObject' doesn't return
 * the current value of a ManagedArray with ember-source
 * v4.10.0 due to its change of property notification.
 */
import { get } from '@ember/object';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';
import HAS_NATIVE_PROXY from 'ember-m3/utils/has-native-proxy';

function computeNestedModel(key, value /*, modelName, schemaInterface */) {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return {
      attributes: value,
    };
  }
}

class TestSchema extends DefaultSchema {
  includesModel(modelName) {
    return /^com.example.bookstore\./i.test(modelName);
  }
  computeAttribute(key, value, modelName, schemaInterface) {
    if (Array.isArray(value)) {
      let nested = value.map((v) => {
        if (typeof v === 'object') {
          return schemaInterface.nested(computeNestedModel(key, v, modelName, schemaInterface));
        } else {
          return v;
        }
      });
      return schemaInterface.managedArray(nested);
    } else {
      let nested = computeNestedModel(key, value, modelName, schemaInterface);
      if (nested) {
        return schemaInterface.nested(nested);
      }
    }
  }
}

if (HAS_NATIVE_PROXY) {
  module(`unit/model/native-access/native-access-arrays/first-object`, function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
      this.owner.register('service:m3-schema', TestSchema);
      this.store = this.owner.lookup('service:store');
    });

    test('Empty Array: firstObject should work', function (assert) {
      let model = this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            chapters: [],
          },
        },
      });

      let chapters = model.get('chapters');
      get(chapters, 'firstObject.name'); // this READ would screw up the internal versioning state
      chapters.pushObject({ name: 'The Boy Who Lived' });

      assert.equal(get(chapters[0], 'name'), 'The Boy Who Lived', `[] reference works`);
      // this assertion would fail with ember-source@4.10.0
      assert.equal(get(chapters, 'firstObject.name'), 'The Boy Who Lived', `firstObject works`);
    });

    test('Empty Array: lastObject should work', function (assert) {
      let model = this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            chapters: [],
          },
        },
      });

      let chapters = model.get('chapters');
      get(chapters, 'lastObject.name'); // this READ would screw up the internal versioning state
      chapters.pushObject({ name: 'The Boy Who Lived' });

      assert.equal(
        get(chapters[chapters.length - 1], 'name'),
        'The Boy Who Lived',
        `[] reference works`
      );
      // this assertion would fail with ember-source@4.10.0
      assert.equal(get(chapters, 'lastObject.name'), 'The Boy Who Lived', `lastObject works`);
    });

    test('Non-empty Array: firstObject should work', function (assert) {
      let model = this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            chapters: [{ name: 'The Boy Who Lived' }],
          },
        },
      });

      let chapters = model.get('chapters');
      get(chapters, 'firstObject.name'); // this READ would screw up the internal versioning state
      chapters.pushObject({ name: 'Lives Forever!' });

      assert.equal(get(chapters[0], 'name'), 'The Boy Who Lived', `[] reference works`);
      // this assertion would fail with ember-source@4.10.0
      assert.equal(get(chapters, 'firstObject.name'), 'The Boy Who Lived', `firstObject works`);
    });

    test('Non-empty Array: lastObject should work', function (assert) {
      let model = this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            chapters: [{ name: 'The Boy Who Lived' }],
          },
        },
      });

      let chapters = model.get('chapters');
      get(chapters, 'lastObject.name'); // this READ would screw up the internal versioning state
      chapters.pushObject({ name: 'Lives Forever!' });

      assert.equal(
        get(chapters[chapters.length - 1], 'name'),
        'Lives Forever!',
        `[] reference works`
      );
      // this assertion would fail with ember-source@4.10.0
      assert.equal(get(chapters, 'lastObject.name'), 'Lives Forever!', `lastObject works`);
    });
  });
}
