import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import DefaultSchema from 'ember-m3/services/m3-schema';
import Component from '@ember/component';
import { CUSTOM_MODEL_CLASS } from 'ember-m3/-infra/features';
import HAS_NATIVE_PROXY from 'ember-m3/utils/has-native-proxy';

if (CUSTOM_MODEL_CLASS) {
  module('integration/managed-array-tracked', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
      this.owner.register(
        'service:m3-schema',
        class TestSchema extends DefaultSchema {
          useNativeProperties() {
            return true;
          }
          computeAttribute(key, value, modelName, schemaInterface) {
            let refValue = schemaInterface.getAttr(`*${key}`);
            if (typeof refValue === 'string') {
              return schemaInterface.reference({
                type: null,
                id: refValue,
              });
            } else if (Array.isArray(refValue)) {
              return schemaInterface.managedArray(
                refValue.map((id) =>
                  schemaInterface.reference({
                    type: null,
                    id,
                  })
                )
              );
            } else if (Array.isArray(value)) {
              return schemaInterface.managedArray(
                value.map((val) => schemaInterface.nested({ attributes: val }))
              );
            } else if (typeof value === 'object') {
              return schemaInterface.nested({ attributes: value });
            }

            return value;
          }
          includesModel(modelName) {
            return /^com\.example\./.test(modelName);
          }
        }
      );
      this.store = this.owner.lookup('service:store');
    });

    test('mutating reference arrays cause re-renders', async function (assert) {
      this.store.push({
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
            attributes: {
              author: {
                name: 'Edward Gibbons',
              },
            },
          },
          {
            id: 'urn:book:2',
            type: 'com.example.Book',
            attributes: {
              author: {
                name: 'Winston Churchill',
              },
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
      this.owner.register(
        'component:first-book',
        class FirstBookComponent extends Component {
          get firstBook() {
            return this.bookstore.books[0];
          }
        }
      );
      this.owner.register(
        'template:components/first-book',
        hbs`<h1>{{this.firstBook.author.name}}</h1>
      `
      );

      let bookstore = this.store.peekRecord('com.example.Bookstore', 'urn:bookstore:1');
      let books = bookstore.books;

      this.set('bookstore', bookstore);
      await render(hbs`
    {{first-book bookstore=this.bookstore}}
  `);

      let renderedAuthor = this.element.querySelector('h1');
      assert.equal(
        renderedAuthor.innerText,
        'Edward Gibbons',
        'Started with the correct book in position 0'
      );

      books.shift();
      await settled();
      renderedAuthor = this.element.querySelector('h1');
      assert.equal(
        renderedAuthor.innerText,
        'Winston Churchill',
        'Recomputed the first book after removal'
      );

      await settled(books.unshift(this.store.peekRecord('com.example.Book', 'urn:book:3')));

      renderedAuthor = this.element.querySelector('h1');
      assert.equal(
        renderedAuthor.innerText,
        'George R. R. Martin',
        'Recomputed the first book after addition'
      );
    });

    if (HAS_NATIVE_PROXY) {
      // We have run into scenarios like these with users stashing M3 Arrays on POJOs in services, and then accessing them and
      // modifying during a render
      test('Can modify a managed array after creation without triggering rerendering assertions', async function (assert) {
        let bookstore = this.store.createRecord('com.example.Bookstore', {
          books: [{ name: 'Igor' }, { name: 'David' }],
        });

        let books = bookstore.books;

        this.owner.register(
          'component:first-book',
          class FirstBookComponent extends Component {
            get firstBook() {
              books.shift();
              return books[0];
            }
          }
        );
        this.owner.register(
          'template:components/first-book',
          hbs`<h1>{{this.firstBook.name}}</h1>
      `
        );

        await render(hbs`
    {{first-book}}
  `);
        let text = this.element.textContent.trim();
        assert.equal(text, 'David', 'Rendered the component');
      });
    }

    test('mutating arrays causes length tracked properties to recompute', async function (assert) {
      this.store.pushPayload('com.example.Bookstore', {
        data: {
          id: 'urn:bookstore:1',
          type: 'com.example.Bookstore',
          attributes: {
            // initially no books
            '*books': [],
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
      this.owner.register(
        'component:x-foo',
        class XFooComponent extends Component {
          get hasAnything() {
            return this.bookstore.books.length > 0;
          }
        }
      );
      this.owner.register(
        'template:components/x-foo',
        hbs`
        {{#if this.hasAnything}}
          Has Content
        {{else}}
          Empty
        {{/if}}
    `
      );

      this.set('bookstore', bookstore);

      assert.equal(books.length, 0, 'initial books.length');
      await render(hbs`
      {{x-foo bookstore=this.bookstore}}
    `);

      let text = this.element.textContent.trim();
      assert.equal(text, 'Empty', 'initially length == 0');

      this.store.pushPayload('com.example.Bookstore', {
        data: {
          id: 'urn:bookstore:1',
          type: 'com.example.Bookstore',
          attributes: {
            '*books': ['urn:book:1', 'urn:book:2'],
          },
        },
      });

      await settled();
      assert.equal(books.length, 2, 'updated books.length');
      text = this.element.textContent.trim();
      assert.equal(text, 'Has Content', 'length updated');
    });

    test('mutating arrays causes properties which accessed the array to recompute', async function (assert) {
      this.store.pushPayload('com.example.Bookstore', {
        data: {
          id: 'urn:bookstore:1',
          type: 'com.example.Bookstore',
          attributes: {
            // initially no books
            '*books': [],
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
      let count = 0;
      this.owner.register(
        'component:x-foo',
        class XFooComponent extends Component {
          get numberOfRenders() {
            this.bookstore.books;
            count++;
            return count;
          }
        }
      );
      this.owner.register(
        'template:components/x-foo',
        hbs`
        {{this.numberOfRenders}}
    `
      );

      this.set('bookstore', bookstore);

      assert.equal(books.length, 0, 'initial books.length');
      await render(hbs`
      {{x-foo bookstore=this.bookstore}}
    `);

      let text = this.element.textContent.trim();
      assert.equal(text, '1', 'we rendered once initally');

      this.store.pushPayload('com.example.Bookstore', {
        data: {
          id: 'urn:bookstore:1',
          type: 'com.example.Bookstore',
          attributes: {
            '*books': ['urn:book:1', 'urn:book:2'],
          },
        },
      });

      await settled();
      text = this.element.textContent.trim();
      assert.equal(text, '2', 'we rerendered once the array changed');
    });
  });
}
