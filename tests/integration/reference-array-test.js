import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import DefaultSchema from 'ember-m3/services/m3-schema';
import Component from '@ember/component';
import { gt } from '@ember/object/computed';

module('integration/reference-array', function (hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register(
      'service:m3-schema',
      class TestSchema extends DefaultSchema {
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

  test('mutating reference arrays cause re-renders', async function (assert) {
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
      <span class='books-length'>{{this.bookstore.books.length}}</span>
      <ul>
      {{#each this.bookstore.books as |book|}}
        <li>Author: {{book.author.name}} </li>
      {{/each}}
      </ul>
    `);

    let renderedItems = this.element.querySelectorAll('ul li');
    assert.equal(renderedItems.length, 2, '2 initial authors');

    let renderedLength = this.element.querySelector('.books-length').textContent;
    assert.equal(renderedLength, '2', 'length === 2');

    books.popObject();
    await settled();
    renderedItems = this.element.querySelectorAll('ul li');
    assert.equal(renderedItems.length, 1, 'remove; re-render; now 1 author');

    renderedLength = this.element.querySelector('.books-length').textContent;
    assert.equal(renderedLength, '1', 'length rerenders');

    books.pushObject(this.store.peekRecord('com.example.Book', 'urn:book:3'));
    books.pushObject(this.store.peekRecord('com.example.Book', 'urn:book:3'));
    await settled();
    renderedItems = this.element.querySelectorAll('ul li');
    assert.equal(renderedItems.length, 3, 'add two more books; re-render; now 3 authors');

    renderedLength = this.element.querySelector('.books-length').textContent;
    assert.equal(renderedLength, '3', 'length rerenders again');
  });

  test('reference arrays trigger rerenders on unload', async function (assert) {
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
      <span class='books-length'>{{this.bookstore.books.length}}</span>
      <ul>
      {{#each this.bookstore.books as |book|}}
        <li>Author: {{book.author.name}} </li>
      {{/each}}
      </ul>
    `);

    let renderedItems = this.element.querySelectorAll('ul li');
    assert.equal(renderedItems.length, 2, '2 initial authors');

    let renderedLength = this.element.querySelector('.books-length').textContent;
    assert.equal(renderedLength, '2', 'length === 2');

    books.objectAt(0).unloadRecord();
    await settled();

    renderedItems = this.element.querySelectorAll('ul li');
    assert.equal(renderedItems.length, 1, '1 author unloaded');

    renderedLength = this.element.querySelector('.books-length').textContent;
    assert.equal(renderedLength, '1', 'length === 1');

    books.objectAt(0).unloadRecord();
    await settled();

    renderedItems = this.element.querySelectorAll('ul li');
    assert.equal(renderedItems.length, 0, 'all authors gone');

    renderedLength = this.element.querySelector('.books-length').textContent;
    assert.equal(renderedLength, '0', 'length === 0');
  });

  test('mutating reference arrays causes length cps to invalidate', async function (assert) {
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
      Component.extend({
        hasAnything: gt('bookstore.books.length', 0),
      })
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
});
