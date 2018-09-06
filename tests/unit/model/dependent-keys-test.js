import sinon from 'sinon';
import { get } from '@ember/object';
import { run } from '@ember/runloop';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';

module('unit/model/dependent-keys', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.sinon = sinon.createSandbox();
    this.store = this.owner.lookup('service:store');

    this.owner.register(
      'service:m3-schema',
      class TestSchema extends DefaultSchema {
        includesModel(modelName) {
          return /^com.example.bookstore\./i.test(modelName);
        }

        computeAttributeReference(key, value, modelName, schemaInterface) {
          let refValue = schemaInterface.getAttr(`*${key}`);
          if (refValue !== undefined) {
            if (Array.isArray(refValue)) {
              return refValue.map(id => ({ id, type: null }));
            } else {
              return {
                id: refValue,
                type: null,
              };
            }
          }
        }
      }
    );
  });

  test('when new payloads invalidate properties, their dependent properties are invalidated', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            pubDate: 'September 1989',
            '*relatedBooks': ['isbn:9780439358079'],
            '*otherBooksInSeries': ['isbn:9780439358071', 'isbn:9780439136365'],
          },
        },
        included: [
          {
            id: 'isbn:9780439358071',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Harry Potter and the Chamber of Secrets`,
            },
          },
          {
            id: 'isbn:9780439136365',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Harry Potter and the Prisoner of Azkaban`,
            },
          },
          {
            id: 'isbn:9780439358079',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Fantastic Beasts and Where to Find Them`,
            },
          },
        ],
      });
    });

    let otherBooks = get(model, 'otherBooksInSeries');
    let relatedBooks = get(model, 'relatedBooks');
    assert.deepEqual(
      otherBooks.map(b => get(b, 'name')),
      ['Harry Potter and the Chamber of Secrets', 'Harry Potter and the Prisoner of Azkaban'],
      'attr array ref is array-like'
    );
    assert.deepEqual(
      relatedBooks.map(b => get(b, 'name')),
      ['Fantastic Beasts and Where to Find Them'],
      'attr array ref is array-like'
    );

    //Update record with new data
    run(() =>
      this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            pubDate: 'September 1989',
            '*relatedBooks': ['isbn:9780439358080'],
            '*otherBooksInSeries': ['isbn:9780439064878', 'isbn:9780439064879'],
          },
        },
        included: [
          {
            id: 'isbn:9780439064878',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Harry Potter and the Goblet of Fire`,
            },
          },
          {
            id: 'isbn:9780439064879',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Harry Potter and the Order of the Phoenix`,
            },
          },
          {
            id: 'isbn:9780439358080',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Fantastic Beasts and Where to Find Them 2`,
            },
          },
        ],
      })
    );

    model = this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439708180');
    otherBooks = get(model, 'otherBooksInSeries');
    relatedBooks = get(model, 'relatedBooks');
    assert.deepEqual(
      otherBooks.map(b => get(b, 'name')),
      ['Harry Potter and the Goblet of Fire', 'Harry Potter and the Order of the Phoenix'],
      'attr ref is updated upon reload'
    );
    assert.deepEqual(
      relatedBooks.map(b => get(b, 'name')),
      ['Fantastic Beasts and Where to Find Them 2'],
      'attr array is updated upon reload'
    );
  });

  test('properties requested in computeAttributeRef are treated as dependent even when initially absent', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            pubDate: 'September 1989',
            relatedBooks: [],
          },
        },
      });
    });

    assert.equal(get(model, 'relatedBooks.length'), 0, 'initially relatedBooks is an empty array');

    run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            '*relatedBooks': ['isbn:9780439358080'],
          },
        },
        included: [
          {
            id: 'isbn:9780439358080',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Fantastic Beasts and Where to Find Them`,
            },
          },
        ],
      });
    });

    assert.deepEqual(
      get(model, 'relatedBooks').mapBy('name'),
      [`Fantastic Beasts and Where to Find Them`],
      'relatedBooks is invalidated when *relatedBooks changes'
    );
  });
});
