import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import DefaultSchema from 'ember-m3/services/m3-schema';

module('integration/reference-array', function(hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register(
      'service:m3-schema',
      class TestSchema extends DefaultSchema {
        computeAttributeReference(key, value, modelName, schemaInterface) {
          let refValue = schemaInterface.getAttr(`*${key}`);
          if (typeof refValue === 'string') {
            return {
              type: null,
              id: refValue,
            };
          } else if (Array.isArray(refValue)) {
            return refValue.map(id => ({
              type: null,
              id,
            }));
          }

          return undefined;
        }
        includesModel(modelName) {
          return /^com\.example\./.test(modelName);
        }
      }
    );
    this.store = this.owner.lookup('service:store');
  });

  test('mutating reference arrays cause re-renders', async function(assert) {
    this.store.pushPayload('com.example.Bookstore', {
      data: {
        id: 'urn:bookstore:1',
        type: 'com.example.Bookstore',
        attributes: {
          '*books': ['urn:book:1', 'urn:book:2'],
        },
      },
      included: [
        {
          id: 'urn:book:1',
          type: 'com.example.Book',
          author: {
            name: 'Edward Gibbons',
          },
        },
        {
          id: 'urn:book:2',
          type: 'com.example.Book',
          author: {
            name: 'Winston Churchill',
          },
        },
        {
          id: 'urn:book:3',
          type: 'com.example.Book',
          attributes: {
            author: {
              name: 'George R. R. Martin',
            },
          },
        },
      ],
    });

    let bookstore = this.store.peekRecord('com.example.Bookstore', 'urn:bookstore:1');
    let books = bookstore.get('books');
    this.set('bookstore', bookstore);
    await render(hbs`
      <ul>
      {{#each this.bookstore.books as |book|}}
        <li>Author: {{book.author.name}} </li>
      {{/each}}
      </ul>
    `);

    let renderedItems = this.element.querySelectorAll('ul li');
    assert.equal(renderedItems.length, 2, '2 initial authors');

    books.popObject();
    await settled();
    renderedItems = this.element.querySelectorAll('ul li');
    assert.equal(renderedItems.length, 1, 'remove; re-render; now 1 author');

    books.pushObject(this.store.peekRecord('com.example.Book', 'urn:book:3'));
    books.pushObject(this.store.peekRecord('com.example.Book', 'urn:book:3'));
    await settled();
    renderedItems = this.element.querySelectorAll('ul li');
    assert.equal(renderedItems.length, 3, 'add two more books; re-render; now 3 authors');
  });
});
