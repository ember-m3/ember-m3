import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import hbs from 'htmlbars-inline-precompile';
import DefaultSchema from 'ember-m3/services/m3-schema';
import Component from '@ember/component';
import { computed } from '@ember/object';
import { run } from '@ember/runloop';
import { alias } from '@ember/object/computed';

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
        refValue.map(id =>
          schemaInterface.reference({
            type: null,
            id,
          })
        )
      );
    } else if (Array.isArray(value)) {
      return schemaInterface.managedArray(value);
    }

    return undefined;
  }
  includesModel(modelName) {
    return /^com\.example\./.test(modelName);
  }
}

class TestSchemaOldHooks extends DefaultSchema {
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

for (let i = 0; i < 2; i++) {
  module(`integration/chain-watchers ${i ? 'old hooks' : 'computeAttribute'}`, function(hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function() {
      if (i === 0) {
        this.owner.register('service:m3-schema', TestSchemaOldHooks);
      } else if (i === 1) {
        this.owner.register('service:m3-schema', TestSchema);
      }
      this.store = this.owner.lookup('service:store');

      this.owner.register(
        'component:show-bookstore',
        Component.extend({
          layout: hbs`
        Authors:
        <ul>
        {{#each authorNames as |authorName|}}
          <li>{{authorName}}</li>
        {{/each}}
        </ul>
      `,
          bookstore: null,
          bookstoreAuthors: computed('bookstore.books.[]', function() {
            return this.get('bookstore.books').mapBy('author');
          }),
          authors: alias('bookstoreAuthors'),
          // this cp depends on books.[]
          // so when it's rendered in a template we'll have a chain watcher with
          // parent `books`, a property from an m3 record
          authorNames: computed('authors.[]', function() {
            let authors = this.get('authors');
            return authors.mapBy('name');
          }),
        })
      );
    });

    test('properties can update when chain watchers are active', async function(assert) {
      this.store.pushPayload('com.example.Bookstore', {
        data: {
          id: 'urn:bookstore:1',
          type: 'com.example.Bookstore',
          attributes: {},
        },
      });

      let bookstore = this.store.peekRecord('com.example.Bookstore', 'urn:bookstore:1');
      bookstore.set('books', [
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
      ]);

      let resolvedBooks = bookstore.get('books');
      assert.ok(!resolvedBooks._isAllReference, 'initially books is tracked array');
      assert.equal(resolvedBooks.length, 2, 'initially 2 books');

      this.set('bookstore', bookstore);
      await render(hbs`
      {{show-bookstore bookstore=bookstore}}
    `);

      let renderedItems = this.element.querySelectorAll('ul li');
      assert.equal(renderedItems.length, 2, '2 initial authors');
      let renderedAuthorNames = Array.from(renderedItems).map(n => n.textContent);
      assert.deepEqual(
        renderedAuthorNames,
        ['Edward Gibbons', 'Winston Churchill'],
        'author names rendered'
      );

      run(() =>
        this.store.pushPayload('com.example.Bookstore', {
          data: [
            {
              id: 'urn:book:3',
              type: 'com.example.Book',
              attributes: {
                author: {
                  name: 'George R. R. Martin',
                },
              },
            },
            {
              id: 'urn:book:4',
              type: 'com.example.Book',
              attributes: {
                author: {
                  name: 'Orson Scott Card',
                },
              },
            },
          ],
          included: [
            {
              id: 'urn:bookstore:1',
              type: 'com.example.Bookstore',
              attributes: {
                '*books': ['urn:book:3', 'urn:book:4'],
              },
            },
          ],
        })
      );

      renderedItems = this.element.querySelectorAll('ul li');
      assert.equal(renderedItems.length, 2, '2 updated authors');
      renderedAuthorNames = Array.from(renderedItems).map(n => n.textContent);
      assert.deepEqual(
        renderedAuthorNames,
        ['George R. R. Martin', 'Orson Scott Card'],
        'author names rerendered'
      );
    });

    test('properties can update through reference arrays when chain watchers are active', async function(assert) {
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
        ],
      });

      let bookstore = this.store.peekRecord('com.example.Bookstore', 'urn:bookstore:1');

      let resolvedBooks = bookstore.get('books');
      assert.ok(resolvedBooks._isAllReference, 'initially books is tracked array');
      assert.equal(resolvedBooks.length, 2, 'initially 2 books');

      this.set('bookstore', bookstore);
      await render(hbs`
      {{show-bookstore bookstore=bookstore}}
    `);

      let renderedItems = this.element.querySelectorAll('ul li');
      assert.equal(renderedItems.length, 2, '2 initial authors');
      let renderedAuthorNames = Array.from(renderedItems).map(n => n.textContent);
      assert.deepEqual(
        renderedAuthorNames,
        ['Edward Gibbons', 'Winston Churchill'],
        'author names rendered initially'
      );

      run(() =>
        this.store.pushPayload('com.example.Bookstore', {
          data: [
            {
              id: 'urn:book:3',
              type: 'com.example.Book',
              attributes: {
                author: {
                  name: 'George R. R. Martin',
                },
              },
            },
            {
              id: 'urn:book:4',
              type: 'com.example.Book',
              attributes: {
                author: {
                  name: 'Orson Scott Card',
                },
              },
            },
          ],
          included: [
            {
              id: 'urn:bookstore:1',
              type: 'com.example.Bookstore',
              attributes: {
                '*books': ['urn:book:3', 'urn:book:4'],
              },
            },
          ],
        })
      );

      renderedItems = this.element.querySelectorAll('ul li');
      assert.equal(renderedItems.length, 2, '2 updated authors');
      renderedAuthorNames = Array.from(renderedItems).map(n => n.textContent);
      assert.deepEqual(
        renderedAuthorNames,
        ['George R. R. Martin', 'Orson Scott Card'],
        'author names rerendered after update'
      );
    });
  });
}
