import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';

module(`unit/model/nested-merged`, function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.store = this.owner.lookup('service:store');
  });

  test('merging nested is dasherize-indifferent', function (assert) {
    class TestSchema extends DefaultSchema {
      includesModel() {
        return true;
      }

      computeBaseModelName(modelName) {
        if (/^base:/i.test(modelName)) {
          return undefined;
        }

        // Simulate a user returning un-dasherized model names in their
        // `computeBaseModelName` hook`
        if (/book-characters/i.test(modelName)) {
          return `base:BookCharacters`;
        }

        return `base:${modelName}`;
      }

      computeAttribute(key, value, modelName, schemaInterface) {
        if (typeof value === 'object' && value !== null) {
          let type = key;

          if (/^base:/i.test(modelName)) {
            type = `base:${type}`;
          }

          return schemaInterface.nested({
            id: 'nested',
            type,
            attributes: value,
          });
        }
      }
    }
    this.owner.register('service:m3-schema', TestSchema);

    this.store.pushPayload('com.example.bookstore.Book', {
      data: {
        id: 'book:1',
        type: 'base:com.example.bookstore.Book',
        attributes: {
          title: 'Marlborough: his life and times',
          volume: 1,
          BookCharacters: {
            marlborough: 'John Churchilll',
          },
        },
      },
      included: [
        {
          id: 'book:1',
          type: 'com.example.bookstore.Book',
        },
      ],
    });

    let book = this.store.peekRecord('com.example.bookstore.Book', 'book:1');

    assert.deepEqual(
      book.toJSON(),
      {
        BookCharacters: {
          marlborough: 'John Churchilll',
        },
        title: 'Marlborough: his life and times',
        volume: 1,
      },
      'book - first push'
    );

    this.store.pushPayload('com.example.bookstore.Book', {
      data: {
        id: 'book:1',
        type: 'base:com.example.bookstore.Book',
        attributes: {
          title: 'Marlborough: his life and times',
          volume: 1,
          BookCharacters: {
            vendome: 'Loius Joseph',
          },
        },
      },
    });
    assert.deepEqual(
      book.toJSON(),
      {
        BookCharacters: {
          marlborough: 'John Churchilll',
          vendome: 'Loius Joseph',
        },
        title: 'Marlborough: his life and times',
        volume: 1,
      },
      'book - second push'
    );
  });
});
