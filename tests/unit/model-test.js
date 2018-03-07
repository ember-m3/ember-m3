import Ember from 'ember';
import { module, test, skip } from 'qunit';
import { setupTest } from 'ember-qunit';
import sinon from 'sinon';

import DS from 'ember-data';
import { zip } from 'lodash';

import MegamorphicModel from 'ember-m3/model';
import SchemaManager from 'ember-m3/schema-manager';
import { initialize as initializeStore } from 'ember-m3/initializers/m3-store';
import EmberObject, { get, set } from '@ember/object';
import { Promise, resolve } from 'rsvp';
import { run } from '@ember/runloop';

const UrnWithTypeRegex = /^urn:([a-zA-Z.]+):(.*)/;
const UrnWithoutTypeRegex = /^urn:(.*)/;

module('unit/model', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.sinon = sinon.sandbox.create();
    initializeStore(this);
    this.store = this.owner.lookup('service:store');

    this.Author = DS.Model.extend({
      name: DS.attr('string'),
      publishedBooks: DS.hasMany('com.example.bookstore.Book', {
        async: false,
      }),
    });
    this.Author.toString = () => 'Author';
    this.owner.register('model:author', this.Author);

    SchemaManager.registerSchema({
      includesModel(modelName) {
        return /^com.example.bookstore\./i.test(modelName);
      },

      // TODO: split this up to different tests
      computeAttributeReference(key, value, modelName, schemaInterface) {
        if (this.isAttributeArrayReference(key) && Array.isArray(value)) {
          return value.map(id => ({
            type: null,
            id,
          }));
        } else if (/^isbn:/.test(value)) {
          return {
            id: value,
            type: 'com.example.bookstore.Book',
          };
        } else if (UrnWithTypeRegex.test(value)) {
          let parts = UrnWithTypeRegex.exec(value);
          return {
            type: parts[1],
            id: parts[2],
          };
        } else if (UrnWithoutTypeRegex.test(value)) {
          return {
            type: null,
            id: value,
          };
        } else if (value === undefined) {
          let refValue = schemaInterface.getAttr(`*${key}`);
          if (typeof refValue === 'string') {
            return {
              type: null,
              id: refValue,
            };
          } else if (Array.isArray(refValue)) {
            return refValue.map(x => ({
              type: null,
              id: x,
            }));
          }
          return null;
        }
      },

      isAttributeArrayReference(key) {
        return key === 'otherBooksInSeries';
      },

      computeNestedModel(key, value) {
        if (value && typeof value === 'object' && value.constructor !== Date) {
          return {
            type: value.type,
            id: value.id,
            attributes: value,
          };
        }
      },

      models: {
        'com.example.bookstore.book': {
          aliases: {
            title: 'name',
            cost: 'price',
            pub: 'publisher',
            releaseDate: 'pubDate',
            pb: 'paperback',
            hb: 'hardback',
          },
          defaults: {
            publisher: 'Penguin Classics',
            hardback: true,
            paperback: true,
            publishedIn: 'US',
          },
          transforms: {
            publisher(value) {
              return `${value}, of course`;
            },
            pubDate(value) {
              return value === undefined ? undefined : new Date(Date.parse(value));
            },
          },
        },
        'com.example.bookstore.chapter': {
          defaults: {
            firstCharacterMentioned: 'Harry Potter',
          },
        },
      },
    });
  });

  hooks.afterEach(function() {
    this.sinon.restore();
  });

  test('it appears as a model to ember data', function(assert) {
    assert.equal(MegamorphicModel.isModel, true, 'M3.isModel');
    assert.equal(MegamorphicModel.klass, MegamorphicModel, 'M3.klass');

    let klassAttrsMap = MegamorphicModel.attributes;
    assert.equal(typeof klassAttrsMap.has, 'function', 'M3.attributes.has()');
  });

  test('.unknownProperty returns undefined for attributes not included in the schema', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            title: `Harry Potter and the Sorcerer's Stone`,
          },
        },
      });
    });

    assert.equal(get(model, 'title'), `Harry Potter and the Sorcerer's Stone`);
    assert.equal(get(model, 'pubDate'), undefined);
  });

  test('.unknownProperty returns schema-transformed values', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            pubDate: '01 September 1998',
          },
        },
      });
    });

    assert.equal(
      get(model, 'pubDate').getTime(),
      new Date(Date.parse('01 September 1998')).getTime()
    );
  });

  test('.unknownProperty resolves id-matched values to external m3-models', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            followedBy: 'isbn:9780439064873',
          },
        },
        included: [
          {
            id: 'isbn:9780439064873',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Harry Potter and the Chamber of Secrets`,
            },
          },
        ],
      });
    });

    assert.equal(get(model, 'followedBy.name'), 'Harry Potter and the Chamber of Secrets');
    assert.equal(get(model, 'followedBy').constructor, MegamorphicModel);
  });

  test('.unknownProperty resolves id-matched values to external m3-models of different types', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            // type embedded in value
            firstChapter: 'urn:com.example.bookstore.Chapter:1',
            // no type, requires global m3 index
            lastChapter: 'urn:chapter17',
          },
        },
        included: [
          {
            id: '1',
            type: 'com.example.bookstore.Chapter',
            attributes: {
              name: `The Boy Who Lived`,
            },
          },
          {
            id: 'urn:chapter17',
            type: 'com.example.bookstore.Chapter',
            attributes: {
              name: `The Man with Two Faces`,
            },
          },
        ],
      });
    });

    assert.equal(get(model, 'firstChapter.name'), 'The Boy Who Lived', 'resolve with type');
    assert.equal(
      get(model, 'lastChapter.name'),
      'The Man with Two Faces',
      'resolve with global m3 index'
    );
  });

  test('global m3 cache removes unloaded records', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            // no type, requires global m3 index
            lastChapter: 'urn:chapter17',
          },
        },
        included: [
          {
            id: 'urn:chapter17',
            type: 'com.example.bookstore.Chapter',
            attributes: {
              name: `The Man with Two Faces`,
            },
          },
        ],
      });
    });

    run(() =>
      this.store.peekRecord('com.example.bookstore.Chapter', 'urn:chapter17').unloadRecord()
    );
    assert.equal(get(model, 'lastChapter'), null, 'global m3 cache removed unloaded record');
  });

  test('.unknownProperty resolves id-matched values to external DS.models', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            author: 'urn:author:3',
          },
        },
        included: [
          {
            id: '3',
            type: 'author',
            attributes: {
              name: `JK Rowling`,
            },
          },
        ],
      });
    });

    assert.equal(get(model, 'author.name'), 'JK Rowling');
    assert.equal(get(model, 'author').constructor, this.Author);
  });

  test('.unknownProperty resolves nested-matched values as nested m3-models', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            relatedToAuthor: {
              $type: 'com.example.bookstore.RelatedLink',
              value: 'urn:author:3',
              relation: 'She wrote it',
            },
            relatedToBook: {
              $type: 'com.example.bookstore.RelatedLink',
              value: 'isbn:9780439064873',
              relation: 'Next in series',
            },
          },
        },
        included: [
          {
            id: 'isbn:9780439064873',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Harry Potter and the Chamber of Secrets`,
            },
          },
          {
            id: '3',
            type: 'author',
            attributes: {
              name: `JK Rowling`,
            },
          },
        ],
      });
    });

    assert.equal(get(model, 'relatedToAuthor.relation'), 'She wrote it');
    assert.equal(get(model, 'relatedToAuthor.value.name'), 'JK Rowling');
    assert.equal(get(model, 'relatedToAuthor.value').constructor, this.Author);
    assert.equal(get(model, 'relatedToBook.relation'), 'Next in series');
    assert.equal(get(model, 'relatedToBook.value.name'), 'Harry Potter and the Chamber of Secrets');
    assert.equal(get(model, 'relatedToBook.value').constructor, MegamorphicModel);
  });

  test('.unknownProperty resolves arrays of id-matched values', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            relatedBooks: ['isbn:9780439064873', 'isbn:9780439136365'],
          },
        },
        included: [
          {
            id: 'isbn:9780439064873',
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
        ],
      });
    });

    assert.deepEqual(get(model, 'relatedBooks').map(x => get(x, 'name')), [
      'Harry Potter and the Chamber of Secrets',
      'Harry Potter and the Prisoner of Azkaban',
    ]);
  });

  test('.unknownProperty resolves arrays of id-matched values against the global cache', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            relatedBooks: ['urn:isbn9780439064873', 'urn:isbn9780439136365'],
          },
        },
        included: [
          {
            id: 'urn:isbn9780439064873',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Harry Potter and the Chamber of Secrets`,
            },
          },
          {
            id: 'urn:isbn9780439136365',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Harry Potter and the Prisoner of Azkaban`,
            },
          },
        ],
      });
    });

    assert.deepEqual(get(model, 'relatedBooks').map(x => get(x, 'name')), [
      'Harry Potter and the Chamber of Secrets',
      'Harry Potter and the Prisoner of Azkaban',
    ]);
  });

  test('.unknownProperty resolves record arrays of id-matched values against the global cache', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            otherBooksInSeries: ['urn:isbn9780439064873', 'urn:isbn9780439136365'],
          },
        },
        included: [
          {
            id: 'urn:isbn9780439064873',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Harry Potter and the Chamber of Secrets`,
            },
          },
          {
            id: 'urn:isbn9780439136365',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Harry Potter and the Prisoner of Azkaban`,
            },
          },
        ],
      });
    });

    assert.deepEqual(get(model, 'otherBooksInSeries').map(x => get(x, 'name')), [
      'Harry Potter and the Chamber of Secrets',
      'Harry Potter and the Prisoner of Azkaban',
    ]);
  });

  test('.unknownProperty resolves arrays of nested-matched values', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            chapters: [
              {
                name: 'The Boy Who Lived',
              },
              {
                name: 'The Vanishing Glass',
              },
            ],
          },
        },
      });
    });

    assert.deepEqual(get(model, 'chapters').map(x => get(x, 'name')), [
      'The Boy Who Lived',
      'The Vanishing Glass',
    ]);
  });

  test('.unknownProperty resolves heterogenous arrays of m3-references, ds-references and nested objects', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            relatedItems: [
              {
                name: 'Chapter 1: The Boy Who Lived',
              },
              'isbn:9780439064873',
              'urn:author:3',
            ],
          },
        },
        included: [
          {
            id: 'isbn:9780439064873',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Harry Potter and the Chamber of Secrets`,
            },
          },
          {
            id: '3',
            type: 'author',
            attributes: {
              name: `JK Rowling`,
            },
          },
        ],
      });
    });

    let relatedItems = get(model, 'relatedItems');
    assert.equal(relatedItems.length, 3, 'array has right length');
    assert.equal(get(relatedItems[0], 'name'), 'Chapter 1: The Boy Who Lived', 'array nested');
    assert.equal(
      get(relatedItems[1], 'name'),
      'Harry Potter and the Chamber of Secrets',
      'array ref-to-m3'
    );
    assert.equal(get(relatedItems[2], 'name'), 'JK Rowling', 'array ref-to-ds.model');
  });

  test('.unknownProperty resolves reference arrays', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            otherBooksInSeries: ['isbn:9780439064873', 'isbn:9780439136365'],
          },
        },
        included: [
          {
            id: 'isbn:9780439064873',
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
            id: 'isbn:9780439139601',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Harry Potter and the Goblet of Fire`,
            },
          },
        ],
      });
    });

    let otherBooksInSeries = get(model, 'otherBooksInSeries');
    // so far just like a normal array of references
    assert.deepEqual(
      otherBooksInSeries.mapBy('id'),
      ['isbn:9780439064873', 'isbn:9780439136365'],
      'ref array looks up the referenced objects'
    );

    let chamberOfSecrets = this.store.peekRecord(
      'com.example.bookstore.Book',
      'isbn:9780439064873'
    );
    let gobletOfFire = this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439139601');
    model.set('otherBooksInSeries', [chamberOfSecrets, gobletOfFire]);
    assert.deepEqual(
      get(model, 'otherBooksInSeries').mapBy('id'),
      ['isbn:9780439064873', 'isbn:9780439139601'],
      'ref arrays update on set'
    );
    assert.deepEqual(
      otherBooksInSeries.mapBy('id'),
      ['isbn:9780439064873', 'isbn:9780439139601'],
      'ref arrays can be "set" like DS.hasMany'
    );

    // Need to rollback to detect the changes from the server
    model.rollbackAttributes();

    run(() => {
      this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            otherBooksInSeries: ['isbn:9780439136365', 'isbn:9780439358071'],
          },
        },
        included: [
          {
            id: 'isbn:9780439358071',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Harry Potter and the Order of the Phoenix`,
            },
          },
        ],
      });
    });

    assert.deepEqual(
      get(model, 'otherBooksInSeries').mapBy('id'),
      ['isbn:9780439136365', 'isbn:9780439358071'],
      'ref array properties update from server'
    );
    assert.deepEqual(
      otherBooksInSeries.mapBy('id'),
      ['isbn:9780439136365', 'isbn:9780439358071'],
      'ref arrays update in-place; treated like RecordArrays'
    );
  });

  test('reference arrays act like record arrays - deleted records removed', function(assert) {
    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        deleteRecord() {
          return resolve();
        },
      })
    );
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            otherBooksInSeries: ['isbn:9780439064873', 'isbn:9780439136365'],
          },
        },
        included: [
          {
            id: 'isbn:9780439064873',
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
        ],
      });
    });

    let otherBooks;

    return run(() => {
      otherBooks = get(model, 'otherBooksInSeries');
      assert.deepEqual(
        otherBooks.mapBy('id'),
        ['isbn:9780439064873', 'isbn:9780439136365'],
        'reference array initially resolved'
      );

      return otherBooks.objectAt(0).destroyRecord();
    }).then(() => {
      assert.strictEqual(get(model, 'otherBooksInSeries'), otherBooks, 'record array re-used');
      assert.deepEqual(
        otherBooks.mapBy('id'),
        ['isbn:9780439136365'],
        'destroyed model removed from existing record arrays'
      );
    });
  });

  test('.unknownProperty resolves null reference arrays', function(assert) {
    let model = run(() =>
      this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            otherBooksInSeries: null,
          },
        },
        included: [
          {
            id: 'isbn:9780439064873',
            type: 'com.example.bookstore.Book',
          },
        ],
      })
    );

    let otherBooksInSeries = get(model, 'otherBooksInSeries');
    assert.deepEqual(otherBooksInSeries.mapBy('id'), [], 'null ref arrays resolved');

    run(() => {
      this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            otherBooksInSeries: ['isbn:9780439064873', 'isbn:9780439136365'],
          },
        },
        included: [
          {
            id: 'isbn:9780439136365',
            type: 'com.example.bookstore.Book',
          },
        ],
      });
    });

    assert.deepEqual(
      otherBooksInSeries.mapBy('id'),
      ['isbn:9780439064873', 'isbn:9780439136365'],
      'ref arrays update in-place; treated like RecordArrays'
    );
  });

  test('.unknownProperty supports default values', function(assert) {
    let model = run(() =>
      this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            publishedIn: 'UK',
          },
        },
      })
    );

    assert.equal(get(model, 'nothing'), undefined, 'non-existent attribute returns undefind');
    assert.equal(
      get(model, 'hardback'),
      true,
      'missing attribute with default returns default value'
    );
    assert.equal(get(model, 'publishedIn'), 'UK', 'specified attributes trump defaults');
  });

  test('.unknownProperty supports alias values', function(assert) {
    let model = run(() =>
      this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            pubDate: 'September 1989',
          },
        },
      })
    );

    let sept1989 = new Date(Date.parse('September 1989')).getTime();

    assert.equal(
      get(model, 'title'),
      `Harry Potter and the Sorcerer's Stone`,
      'alias to value present'
    );
    assert.equal(
      get(model, 'releaseDate').getTime(),
      sept1989,
      'alias to value present with transform'
    );
    assert.equal(
      get(model, 'title'),
      `Harry Potter and the Sorcerer's Stone`,
      'alias to value present after caching'
    );
    assert.equal(get(model, 'cost'), undefined, 'alias to missing');
    assert.equal(get(model, 'hb'), true, 'alias to missing with default');

    set(model, 'name', 'Harry Potter and the different title');
    assert.equal(
      get(model, 'title'),
      `Harry Potter and the different title`,
      'alias invalidated when dependent is changed'
    );
  });

  test('schema can access other attributes when computing attribute references', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            pubDate: 'September 1989',
            '*relatedBook': 'isbn:9780439358071',
            '*relatedBooks': ['isbn:9780439064873', 'isbn:9780439136365'],
          },
        },
        included: [
          {
            id: 'isbn:9780439064873',
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
            id: 'isbn:9780439358071',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Harry Potter and the Order of the Phoenix`,
            },
          },
        ],
      });
    });
    assert.equal(
      get(model, 'relatedBook.name'),
      `Harry Potter and the Order of the Phoenix`,
      'computing attribute reference'
    );
    assert.equal(get(model, 'relatedBook.pubDate'), undefined);
    assert.deepEqual(
      get(model, 'relatedBooks').map(b => get(b, 'name')),
      ['Harry Potter and the Chamber of Secrets', 'Harry Potter and the Prisoner of Azkaban'],
      'compute attribute array reference'
    );
  });

  test('schema can return a different value for attribute array references', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            pubDate: 'September 1989',
            '*otherBooksInSeries': ['isbn:9780439064873', 'isbn:9780439136365'],
          },
        },
        included: [
          {
            id: 'isbn:9780439064873',
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
        ],
      });
    });
    let otherBooks = get(model, 'otherBooksInSeries');
    assert.deepEqual(
      otherBooks.map(b => get(b, 'name')),
      ['Harry Potter and the Chamber of Secrets', 'Harry Potter and the Prisoner of Azkaban'],
      'attr array ref is array-like'
    );

    set(model, 'otherBooksInSeries', [
      this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439064873'),
    ]);
    // This is part of the special sauce of record arrays
    assert.deepEqual(
      otherBooks.map(b => get(b, 'name')),
      ['Harry Potter and the Chamber of Secrets'],
      'array ref updated in place on set'
    );
  });

  test('default values are not transformed', function(assert) {
    let model = run(() =>
      this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
        },
      })
    );

    assert.equal(get(model, 'publisher'), 'Penguin Classics', 'default value not transformed');

    run(() =>
      this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            publisher: 'Harper Collins',
          },
        },
      })
    );

    assert.equal(
      get(model, 'publisher'),
      'Harper Collins, of course',
      'specified value transformed'
    );
  });

  test('early set of an ID to a newly created records is allowed', function(assert) {
    let model = run(() =>
      this.store.createRecord('com.example.bookstore.Book', {
        id: 'my-crazy-id',
      })
    );

    assert.equal(get(model, 'id'), 'my-crazy-id', 'init id property set');
  });

  test('late set of an id for top-level models to a newly created records is not allowed', function(assert) {
    let model = run(() =>
      this.store.createRecord('com.example.bookstore.Book', {
        name: 'Marlborough: His Life and Times',
      })
    );

    assert.throws(
      () => {
        set(model, 'id', 'my-crazy-id');
      },
      /You tried to set 'id' to 'my-crazy-id' for 'com.example.bookstore.book' but records can only set their ID by providing it to store.createRecord\(\)/,
      'error to set ID late'
    );
  });

  test('late set of an id for nested models to a newly created records is allowed', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            nextChapter: {
              name: 'The Boy Who Lived',
              nextChapter: {
                name: 'The Vanishing Glass',
              },
            },
          },
        },
      });
    });

    assert.throws(
      () => {
        set(model, 'id', 'mutated-id');
      },
      /You tried to set 'id' to 'mutated-id' for 'com.example.bookstore.book' but records can only set their ID by providing it to store.createRecord\(\)/,
      'error to set ID late'
    );

    let nestedModel = get(model, 'nextChapter');
    set(nestedModel, 'id', 'mutated-id');

    assert.equal(get(nestedModel, 'id'), 'mutated-id'), 'able to set id of nested model';
  });

  // This is unspecified behaviour; unclear if we can do anything sane here
  // TODO: 'default values are not checked for reference arrays'

  test('m3 models can be created with initial properties (init prop buffering)', function(assert) {
    let model = run(() =>
      this.store.createRecord('com.example.bookstore.Book', {
        name: 'Marlborough: His Life and Times',
        isbn: '978-0226106335',
        publisher: 'University Of Chicago Press',
      })
    );

    assert.equal(get(model, 'name'), 'Marlborough: His Life and Times', 'init property set');
    assert.equal(get(model, 'isbn'), '978-0226106335', 'init property set');
    assert.equal(
      get(model, 'publisher'),
      'University Of Chicago Press, of course',
      'init property set'
    );
  });

  test('.setUnknownProperty updates data and clears simple attribute cache', function(assert) {
    let model = run(() =>
      this.store.push({
        data: {
          id: 'isbn:9780760768570',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Birth of Britain',
          },
        },
      })
    );

    assert.equal(get(model, 'title'), 'The Birth of Britain', 'initial - alias');
    assert.equal(get(model, 'name'), 'The Birth of Britain', 'initial - prop');

    set(model, 'name', 'Vol. I');

    assert.equal(get(model, 'title'), 'Vol. I', 'set prop - cached alias');
    assert.equal(get(model, 'name'), 'Vol. I', 'set prop - prop');

    assert.throws(
      () => {
        set(model, 'title', 'Volume I. The Birth of Britain');
      },
      /You tried to set 'title' to 'Volume I. The Birth of Britain', but 'title' is an alias in 'com.example.bookstore.book' and aliases are read-only/,
      'error to set an alias'
    );
  });

  test('.setUnknownProperty triggers change events', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            fans: 'lots',
          },
        },
      });
    });

    let propChanges = [];
    model.addObserver('fans', (model, key) => {
      propChanges.push([model + '', key]);
    });

    // observe alias
    model.addObserver('title', (model, key) => {
      propChanges.push([model + '', key]);
    });

    set(model, 'fans', 'millions');
    // check that alias doesn't get prop changes when not requested
    set(model, 'name', 'First Book');

    assert.deepEqual(propChanges, [[model + '', 'fans']], 'change events trigger for direct props');

    propChanges.splice(0, propChanges.length);
    assert.equal(get(model, 'title'), `First Book`, 'initialize alias');
    set(model, 'name', 'Book 1');

    assert.deepEqual(propChanges, [[model + '', 'title']], 'change events trigger for aliases');
  });

  // TODO: '.setUnknownProperty can update belongs-to relationships'

  skip('DS.Models can have relationships into m3 models', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: '3',
          type: 'author',
          attributes: {
            name: 'JK Rowling',
          },
          relationships: {
            publishedBooks: {
              data: [
                {
                  id: 'isbn:9780439708180',
                  // Ember-Data requires model-name normalized types in relationship portions of a jsonapi resource
                  type: 'com.example.bookstore.book',
                },
              ],
            },
          },
        },

        included: [
          {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Harry Potter and the Sorcerer's Stone`,
            },
          },
        ],
      });
    });

    assert.equal(get(model, 'name'), 'JK Rowling', 'ds.model loaded');
    assert.equal(
      get(model, 'publishedBooks.firstObject.name'),
      `Harry Potter and the Sorcerer's Stone`,
      'ds.model can access m3 model via relationship'
    );
  });

  test('nested models are created lazily', function(assert) {
    let init = this.sinon.spy(MegamorphicModel.prototype, 'init');
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            nextChapter: {
              name: 'The Boy Who Lived',
              nextChapter: {
                name: 'The Vanishing Glass',
              },
            },
          },
        },
      });
    });

    assert.equal(init.callCount, 1, 'initially only one model is created');

    model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            nextChapter: {
              name: 'The Boy Who Lived',
              nextChapter: {
                name: 'The Vanishing Glass',
                nextChapter: {
                  name: 'The Letters from No One',
                },
              },
            },
          },
        },
      });
    });

    assert.equal(init.callCount, 1, 'model changes do not reify nested models');

    assert.equal(get(model, 'nextChapter.name'), 'The Boy Who Lived');
    assert.equal(init.callCount, 2, 'nested model is created lazily');

    assert.equal(get(model, 'nextChapter.name'), 'The Boy Who Lived');
    assert.equal(init.callCount, 2, 'nested model is cached');

    assert.equal(get(model, 'nextChapter.nextChapter.name'), 'The Vanishing Glass');
    assert.equal(init.callCount, 3, 'doubly nested model is created lazily');

    assert.equal(get(model, 'nextChapter.nextChapter.name'), 'The Vanishing Glass');
    assert.equal(init.callCount, 3, 'doubly nested model is cached');
  });

  test('nested models have normalized model names', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            nextChapter: {
              name: 'The Boy Who Lived',
              type: 'com.example.bookstore.Chapter',
            },
          },
        },
      });
    });

    assert.equal(
      get(model, 'nextChapter._internalModel.modelName'),
      'com.example.bookstore.chapter',
      'nested models have normalized model names'
    );
  });

  test('nested models with unnormalized model names can have defaults', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            nextChapter: {
              name: 'The Boy Who Lived',
              type: 'com.example.bookstore.Chapter',
            },
          },
        },
      });
    });

    // This will only work if nested model names are normalized
    assert.equal(
      get(model, 'nextChapter.firstCharacterMentioned'),
      'Harry Potter',
      'nested models with non-normalized names can have defaults'
    );
  });

  test('attribute property changes are properly detected', function(assert) {
    let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and hmm I forget the next bit`,
          },
        },
      });
    });

    run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
          },
        },
      });
    });

    assert.deepEqual(zip(propChange.thisValues.map(x => x + ''), propChange.args), [
      [model + '', ['name']],
    ]);
  });

  test('omitted attributes are treated as deletes', function(assert) {
    let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            author: 'JK Rowling',
          },
        },
      });
    });

    assert.equal(get(model, 'name'), `Harry Potter and the Sorcerer's Stone`, 'name initially set');

    run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            author: `JK Rowling`,
          },
        },
      });
    });

    assert.strictEqual(
      get(model, 'name'),
      undefined,
      'omitted name treated as deleting the property'
    );

    assert.deepEqual(
      zip(propChange.thisValues.map(x => x + ''), propChange.args),
      [[model + '', ['name']]],
      'omitted attributes are treated as deletes'
    );
  });

  test('null attributes are detected as changed', function(assert) {
    let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            author: 'JK Rowling',
          },
        },
      });
    });

    run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: null,
            author: 'JK Rowling',
          },
        },
      });
    });

    assert.deepEqual(
      zip(propChange.thisValues.map(x => x + ''), propChange.args),
      [[model + '', ['name']]],
      'nulled attributes are treated as changed'
    );
  });

  test('nulled attributes in nested models are detected as changed', function(assert) {
    let init = this.sinon.spy(MegamorphicModel.prototype, 'init');
    let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            nextChapter: {
              id: 'ch1',
              name: 'The Boy Who Lived',
              number: 0,
              nextChapter: {
                id: 'ch2',
                name: 'The Vanishing Glass',
                number: 1,
              },
            },
          },
        },
      });
    });

    assert.equal(init.callCount, 1, 'one model is initially created');
    assert.equal(propChange.callCount, 0, 'no property changes');

    let nested = get(model, 'nextChapter');
    let doubleNested = get(model, 'nextChapter.nextChapter');

    assert.equal(init.callCount, 3, 'models created lazily');

    assert.equal(get(nested, 'name'), `The Boy Who Lived`);
    assert.equal(get(doubleNested, 'name'), 'The Vanishing Glass');

    run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            nextChapter: {
              id: 'ch1',
              name: null,
              number: 1,
              nextChapter: {
                id: 'ch2',
                name: null,
                number: 2,
              },
            },
          },
        },
      });
    });

    assert.deepEqual(
      zip(propChange.thisValues.map(x => x + ''), propChange.args),
      [
        [doubleNested + '', ['name']],
        [doubleNested + '', ['number']],
        [nested + '', ['name']],
        [nested + '', ['number']],
      ],
      'nulled attributes in nested models are detected as changed'
    );

    assert.equal(get(nested, 'number'), 1);
    assert.equal(get(nested, 'name'), null);
    assert.equal(get(doubleNested, 'number'), 2);
    assert.equal(get(doubleNested, 'name'), null);
  });

  test('omitted attributes in nested models are treated as deletes', function(assert) {
    let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            nextChapter: {
              id: 'ch1',
              name: 'The Boy Who Lived',
              number: 0,
              nextChapter: {
                id: 'ch2',
                name: 'The Vanishing Glass',
                number: 1,
              },
            },
          },
        },
      });
    });

    assert.equal(propChange.callCount, 0, 'no property changes');

    let nested = get(model, 'nextChapter');
    let doubleNested = get(model, 'nextChapter.nextChapter');

    run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            nextChapter: {
              id: 'ch1',
              number: 0,
              nextChapter: {
                id: 'ch2',
                number: 1,
              },
            },
          },
        },
      });
    });

    assert.deepEqual(
      zip(propChange.thisValues.map(x => x + ''), propChange.args),
      [[doubleNested + '', ['name']], [nested + '', ['name']]],
      'omitted attributes in nested models are treated as deletes'
    );

    assert.equal(get(nested, 'number'), 0);
    assert.equal(get(nested, 'name'), null);
    assert.equal(get(doubleNested, 'number'), 1);
    assert.equal(get(doubleNested, 'name'), null);
  });

  test('new attributes are treated as changed', function(assert) {
    let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
          },
        },
      });
    });

    assert.equal(get(model, 'name'), `Harry Potter and the Sorcerer's Stone`);
    assert.equal(get(model, 'chapterCount'), undefined);

    run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            chapterCount: 17,
          },
        },
      });
    });

    assert.deepEqual(
      zip(propChange.thisValues.map(x => x + ''), propChange.args),
      [[model + '', ['chapterCount']]],
      'new attributes are treated as changes'
    );

    assert.equal(get(model, 'name'), `Harry Potter and the Sorcerer's Stone`);
    assert.equal(get(model, 'chapterCount'), 17);
  });

  test('new attributes in nested models are treated as changed', function(assert) {
    let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            nextChapter: {
              name: 'The Boy Who Lived',
            },
          },
        },
      });
    });

    let nested = model.get('nextChapter');
    assert.equal(get(nested, 'name'), 'The Boy Who Lived');

    run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            nextChapter: {
              name: 'The Boy Who Lived',
              number: 1,
            },
          },
        },
      });
    });

    assert.deepEqual(
      zip(propChange.thisValues.map(x => x + ''), propChange.args),
      [[nested + '', ['number']]],
      'new attributes in nested models are treated as changes'
    );
  });

  test('nested model attribute changes are properly detected', function(assert) {
    let init = this.sinon.spy(MegamorphicModel.prototype, 'init');
    let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            number: 0,
            nextChapter: {
              name: 'The Boy Who whatever',
              number: 1,
              nextChapter: {
                name: 'The Vanishing dunno',
                number: 2,
              },
            },
          },
        },
      });
    });

    assert.equal(init.callCount, 1, 'one model is initially created');
    assert.equal(propChange.callCount, 0, 'no property changes');

    let nested = get(model, 'nextChapter');
    let doubleNested = get(model, 'nextChapter.nextChapter');

    assert.equal(init.callCount, 3, 'models created lazily');

    assert.equal(get(nested, 'name'), `The Boy Who whatever`, 'get nested.name');
    assert.equal(get(doubleNested, 'name'), 'The Vanishing dunno', 'get nested.nested.name');

    run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            number: 0,
            nextChapter: {
              name: 'The Boy Who Lived',
              number: 1,
              nextChapter: {
                name: 'The Vanishing Glass',
                number: 2,
              },
            },
          },
        },
      });
    });

    assert.deepEqual(
      zip(propChange.thisValues.map(x => x + ''), propChange.args),
      [[nested + '', ['name']], [doubleNested + '', ['name']]],
      'property changes are called for changed attributes on nested models, but not for unchanged attributes'
    );
  });

  test('nested model updates null -> model', function(assert) {
    let init = this.sinon.spy(MegamorphicModel.prototype, 'init');
    let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
          },
        },
      });
    });

    assert.equal(
      get(model, 'name'),
      `Harry Potter and the Sorcerer's Stone`,
      'property get as expected'
    );
    assert.equal(init.callCount, 1, 'one model is initially created');

    run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            nextChapter: {
              name: 'The Boy Who Lived',
            },
          },
        },
      });
    });

    assert.equal(init.callCount, 1, 'nested models are not eaagerly created from changes');
    assert.deepEqual(
      zip(propChange.thisValues.map(x => x + ''), propChange.args),
      [[model + '', ['nextChapter']]],
      'nested model from null is treated as a change'
    );

    assert.equal(get(model, 'nextChapter.name'), 'The Boy Who Lived', 'nested model attrs set');
    assert.equal(init.callCount, 2, 'nested models are lazily created');
  });

  test('nested model updates primitive -> model', function(assert) {
    let init = this.sinon.spy(MegamorphicModel.prototype, 'init');
    let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            nextChapter: 'The Boy Who Lived',
          },
        },
      });
    });

    assert.equal(get(model, 'name'), `Harry Potter and the Sorcerer's Stone`, 'get model.property');
    assert.equal(get(model, 'nextChapter'), `The Boy Who Lived`, 'get model.nested');
    assert.equal(init.callCount, 1, 'one model is initially created');

    run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            nextChapter: {
              name: 'The Boy Who Lived',
            },
          },
        },
      });
    });

    assert.equal(init.callCount, 1, 'nested models are not eaagerly created from changes');
    assert.deepEqual(
      zip(propChange.thisValues.map(x => x + ''), propChange.args),
      [[model + '', ['nextChapter']]],
      'nested model from null is treated as a change'
    );

    assert.equal(get(model, 'nextChapter.name'), 'The Boy Who Lived', 'get model.nested.name');
    assert.equal(init.callCount, 2, 'nested models are lazily created');
  });

  test('nested model updates model -> null (model reified)', function(assert) {
    let init = this.sinon.spy(MegamorphicModel.prototype, 'init');
    let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            nextChapter: {
              name: 'The Boy Who Lived',
            },
          },
        },
      });
    });

    assert.equal(get(model, 'nextChapter.name'), `The Boy Who Lived`, 'get model.nested');
    assert.equal(init.callCount, 2, 'nested models created');

    run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
          },
        },
      });
    });

    assert.equal(init.callCount, 2, 'no additional models created');
    assert.deepEqual(
      zip(propChange.thisValues.map(x => x + ''), propChange.args),
      [[model + '', ['nextChapter']]],
      'nested model -> null is a change'
    );

    assert.equal(get(model, 'nextChapter.name'), undefined, 'nested model cleared');
  });

  test('nested model updates model -> primitive', function(assert) {
    let init = this.sinon.spy(MegamorphicModel.prototype, 'init');
    let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            nextChapter: {
              name: 'The Boy Who Lived',
            },
          },
        },
      });
    });

    assert.equal(get(model, 'nextChapter.name'), `The Boy Who Lived`, 'get model.nested');
    assert.equal(init.callCount, 2, 'nested models created');

    run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            nextChapter: 'The Boy Who Lived',
          },
        },
      });
    });

    assert.equal(init.callCount, 2, 'no additional models created');
    assert.deepEqual(
      zip(propChange.thisValues.map(x => x + ''), propChange.args),
      [[model + '', ['nextChapter']]],
      'nested model -> primitive is a change'
    );

    assert.equal(get(model, 'nextChapter'), 'The Boy Who Lived', 'nested model -> primitive');
  });

  test('nested model updates model -> null (model inert)', function(assert) {
    let init = this.sinon.spy(MegamorphicModel.prototype, 'init');
    let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            nextChapter: {
              name: 'The Boy Who Lived',
            },
          },
        },
      });
    });

    assert.equal(init.callCount, 1, 'one model initially created');

    run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
          },
        },
      });
    });

    assert.equal(init.callCount, 1, 'no additional models created');
    assert.deepEqual(
      zip(propChange.thisValues.map(x => x + ''), propChange.args),
      [[model + '', ['nextChapter']]],
      'nested model -> null is a change'
    );

    assert.equal(get(model, 'nextChapter.name'), undefined, 'nested model not set');
    assert.equal(init.callCount, 1, 'no additional models created');
  });

  test('nested model updates (model -> model) no changes', function(assert) {
    let init = this.sinon.spy(MegamorphicModel.prototype, 'init');
    let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            nextChapter: {
              name: 'The Boy Who Lived',
              number: 1,
            },
          },
        },
      });
    });

    assert.equal(init.callCount, 1, 'one model initially created');

    run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            nextChapter: {
              name: 'The Boy Who Lived',
              number: 1,
            },
          },
        },
      });
    });

    assert.equal(init.callCount, 1, 'no additional models created');
    assert.deepEqual(
      zip(propChange.thisValues.map(x => x + ''), propChange.args),
      [[model + '', ['nextChapter']]],
      'nested pojo -> pojo change even if hte values are deep equal'
    );
  });

  test('nested array attribute changes are properly detected', function(assert) {
    let init = this.sinon.spy(MegamorphicModel.prototype, 'init');
    let propChange = this.sinon.spy(MegamorphicModel.prototype, 'notifyPropertyChange');

    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            chapters: [
              {
                name: 'The Boy Who Lived',
              },
              {
                name: 'The Vanishing Glass',
              },
            ],
          },
        },
      });
    });

    let childModel = get(model, 'chapters')[1];
    assert.equal(init.callCount, 3, 'nested models in arrays are eagerly reified');

    run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            chapters: [
              {
                name: 'The Boy Who Lived',
              },
              {
                name: 'The Vanishing Glass',
              },
            ],
          },
        },
      });
    });

    assert.equal(init.callCount, 3, 'no additional models created');
    assert.deepEqual(
      zip(propChange.thisValues.map(x => x + ''), propChange.args),
      [[model + '', ['chapters']]],
      'nested array -> array change even if the values are deep equal'
    );

    assert.notEqual(
      get(model, 'chapters')[1],
      childModel,
      'previous nested models in arrays are not re-used'
    );
    assert.equal(init.callCount, 5, 'nested models in arrays are not re-used');
  });

  test(`.serialize serializers with the user's -ember-m3 serializer`, function(assert) {
    assert.expect(4);

    this.owner.register(
      'serializer:-ember-m3',
      EmberObject.extend({
        serialize(snapshot, options) {
          assert.deepEqual(options, { some: 'options' }, 'options are passed through to serialize');
          assert.equal(snapshot.attr('name'), 'The Winds of Winter', 'attr - name');
          assert.equal(
            snapshot.attr('estimatedPubDate'),
            'January 2622',
            'attr - estimatedPubDate'
          );

          let eachAttrCBCalls = [];
          snapshot.eachAttribute(key => eachAttrCBCalls.push(key));

          assert.deepEqual(
            eachAttrCBCalls.sort(),
            ['estimatedPubDate', 'name', 'newAttr'],
            'eachAttribute iterates each attribute'
          );
        },
      })
    );

    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            estimatedPubDate: 'January 2622',
          },
        },
      });
    });

    set(model, 'newAttr', 'newAttrValue');

    return model.serialize({ some: 'options' });
  });

  test('.save saves via the store', function(assert) {
    assert.expect(4);

    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        updateRecord(store, type, snapshot) {
          assert.equal(snapshot.record.get('isSaving'), true, 'record is saving');
          return Promise.resolve({
            data: {
              id: 1,
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'The Winds of Winter',
                estimatedRating: '11/10',
              },
            },
          });
        },
      })
    );

    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            estimatedPubDate: 'January 2622',
          },
        },
      });
    });

    assert.equal(model.get('isSaving'), false, 'initially model not saving');
    model.set('estimatedPubDate', '2231?');

    return run(() =>
      model.save().then(() => {
        assert.equal(model.get('isSaving'), false, 'model done saving');
        assert.deepEqual(
          model._internalModel._modelData._data,
          {
            name: 'The Winds of Winter',
            estimatedRating: '11/10',
            // estimatedPubDate omitted in response
          },
          'data post save resolve'
        );
      })
    );
  });

  test('.reload calls findRecord with reload: true and passes adapterOptions', function(assert) {
    assert.expect(3);

    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        findRecord(store, type, id, snapshot) {
          // TODO: this is annoying but name normalization means we get the wrong
          // model name in snapshots. See #11
          assert.equal(snapshot.modelName, 'com.example.bookstore.book', 'snapshot.modelName');
          assert.equal(id, '1', 'findRecord(id)');
          let { adapterOptions } = snapshot;

          assert.deepEqual(
            adapterOptions,
            {
              doAdapterThings: true,
            },
            'adapterOptions passed to adapter from model.reload'
          );

          return Promise.resolve({
            data: {
              id: '1',
              type: 'com.example.bookstore.Book',
              attributes: {
                name: 'The Winds of Winter',
              },
            },
          });
        },
      })
    );

    let model = run(() => {
      return this.store.push({
        data: {
          id: '1',
          type: 'com.example.bookstore.book',
          attributes: {
            name: 'The Winds of Winter',
          },
        },
      });
    });

    return run(() => model.reload({ adapterOptions: { doAdapterThings: true } }));
  });

  test('.deleteRecord works', function(assert) {
    assert.expect(2);

    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        deteRecord() {
          assert.ok(false, 'Did not make it to adapter');
        },
      })
    );

    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
          },
        },
      });
    });

    assert.equal(model.get('isDeleted'), false, 'not initially deleted');
    model.deleteRecord();
    assert.equal(model.get('isDeleted'), true, 'model deleted');
  });

  test('.destroyRecord works', function(assert) {
    assert.expect(4);

    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        deleteRecord(store, type, snapshot) {
          assert.equal(snapshot.record.get('isDeleted'), true, 'model is deleted');
          return Promise.resolve();
        },
      })
    );

    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
          },
        },
      });
    });

    assert.equal(
      this.store.hasRecordForId('com.example.bookstore.book', '1'),
      true,
      'record in identity map'
    );
    assert.equal(model.get('isDeleted'), false, 'not initially deleted');
    return run(() =>
      model
        .destroyRecord()
        .then(() => model.unloadRecord())
        .then(() => {
          assert.equal(
            this.store.hasRecordForId('com.example.bookstore.book', '1'),
            false,
            'gone from identity map'
          );
        })
    );
  });

  test('.unloadRecord works', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
          },
        },
      });
    });

    assert.equal(
      this.store.hasRecordForId('com.example.bookstore.book', '1'),
      true,
      'record in identity map'
    );
    run(() => model.unloadRecord());
    assert.equal(
      this.store.hasRecordForId('com.example.bookstore.book', '1'),
      false,
      'gone from identity map'
    );
  });

  test('.unloadRecord on a nested model warns and does not error', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: '1',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `The Winds of Winter`,
            relatedToAuthor: {
              id: 'urn:author:2',
              type: 'com.example.bookstore.RelatedLink',
              relation: 'Presumptive author',
            },
          },
        },
      });
    });

    let nestedModel = model.get('relatedToAuthor');

    assert.equal(
      this.store.hasRecordForId('com.example.bookstore.book', '1'),
      true,
      'record in identity map'
    );
    assert.equal(
      this.store.hasRecordForId('com.example.bookstore.RelatedLink', 'urn:author:2'),
      false,
      'nested record do not appear in identity map'
    );

    // This is how to assert via workmanw/ember-qunit-assert-helpers but this
    // helper does not prevent the warning from hitting the console
    //
    // assert.expectNoWarning();
    // nestedModel.unloadRecord();
    // assert.expectWarning(`Nested models cannot be directly unloaded.  Perhaps you meant to unload the top level model, 'com.example.bookstore.book:1'`);

    let warnSpy = this.sinon.stub(Ember, 'warn');
    nestedModel.unloadRecord();
    assert.deepEqual(zip(warnSpy.thisValues.map(x => x + ''), warnSpy.args), [
      [
        'Ember',
        [
          "Nested models cannot be directly unloaded.  Perhaps you meant to unload the top level model, 'com.example.bookstore.book:1'",
          false,
          { id: 'ember-m3.nested-model-unloadRecord' },
        ],
      ],
    ]);
    assert.equal(
      this.store.hasRecordForId('com.example.bookstore.book', '1'),
      true,
      '"unloading" nested model has no effect on either it or parent model'
    );
  });

  test('.changedAttributes returns the dirty attributes', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            author: 'George R. R. Martin',
            rating: 10,
            expectedPubDate: 'never',
          },
        },
      });
    });

    model.set('name', 'Alice in Wonderland');
    model.set('rating', null);
    model.set('expectedPubDate', undefined);

    assert.deepEqual(
      model.changedAttributes(),
      {
        name: ['The Winds of Winter', 'Alice in Wonderland'],
        rating: [10, null],
        expectedPubDate: ['never', undefined],
      },
      'changed attributes should be return as changed'
    );
  });

  test('.changedAttributes returns nested dirty attributes within an object', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            number: 0,
            nextChapter: {
              name: 'The Boy Who whatever',
              number: 1,
              nextChapter: {
                name: 'The Vanishing dunno',
                number: 2,
              },
            },
          },
        },
      });
    });

    let nested = get(model, 'nextChapter');
    let doubleNested = get(nested, 'nextChapter');

    assert.deepEqual(model.changedAttributes(), {}, 'initially no attributes are changed');

    set(model, 'name', 'secret book name');
    set(model, 'newAttr', 'a wild attribute appears!');

    assert.deepEqual(
      model.changedAttributes(),
      {
        name: [`Harry Potter and the Sorcerer's Stone`, 'secret book name'],
        newAttr: [undefined, 'a wild attribute appears!'],
      },
      'initially no attributes are changed'
    );

    set(nested, 'name', 'a new chapter name');
    set(nested, 'newAttr', 'first chapter; new attr!');
    set(doubleNested, 'number', 24601);
    set(doubleNested, 'anotherNewAttr', 'another new attr!');

    assert.deepEqual(
      model.changedAttributes(),
      {
        name: [`Harry Potter and the Sorcerer's Stone`, 'secret book name'],
        newAttr: [undefined, 'a wild attribute appears!'],
        nextChapter: {
          name: ['The Boy Who whatever', 'a new chapter name'],
          newAttr: [undefined, 'first chapter; new attr!'],
          nextChapter: {
            number: [2, 24601],
            anotherNewAttr: [undefined, 'another new attr!'],
          },
        },
      },
      'only changed attributes in nested models are included'
    );
  });

  test('.changedAttributes returns dirty attributes for arrays of primitive values', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            author: 'George R. R. Martin',
            chapters: ['Windy eh', 'I guess winter was coming after all'],
          },
        },
      });
    });

    set(model, 'chapters', ['so windy', 'winter winter']);

    assert.deepEqual(
      model.changedAttributes(),
      {
        chapters: [
          ['Windy eh', 'I guess winter was coming after all'],
          ['so windy', 'winter winter'],
        ],
      },
      '.changedAttributes returns changed arrays'
    );
  });

  test('.changedAttributes returns nested dirty attributes within arrays of nested models', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            author: 'George R. R. Martin',
            chapters: [
              {
                name: 'Windy eh',
                number: 1,
              },
              {
                name: `I guess winter was coming after all`,
                number: 2,
              },
            ],
            notes: [{ value: 'Unsure if this book will ever be published' }],
          },
        },
      });
    });

    let nestedModels = get(model, 'chapters');
    set(nestedModels[0], 'name', 'super windy');

    assert.deepEqual(
      model.changedAttributes(),
      {
        chapters: [
          {
            name: ['Windy eh', 'super windy'],
          },
          undefined,
        ],
      },
      '.changedAttributes returns nested dirty attributes within arrays of nested models'
    );
  });

  test('.rollbackAttributes resets state from dirty (uncached)', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
          },
        },
      });
    });

    model.set('name', 'Some other book');
    model.rollbackAttributes();

    assert.equal(
      get(model, 'currentState.stateName'),
      'root.loaded.saved',
      'after rolling back model.state loaded.saved'
    );
    assert.equal(
      get(model, 'name'),
      'The Winds of Winter',
      'rollbackAttributes reverts changes to the record'
    );
  });

  test('.rollbackAttributes resets state from dirty (cached)', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
          },
        },
      });
    });

    model.set('name', 'Some other book');
    // cache new value in resolution cache
    assert.equal(get(model, 'name'), 'Some other book', 'value is set correctly (and cached)');

    model.rollbackAttributes();

    assert.equal(
      get(model, 'currentState.stateName'),
      'root.loaded.saved',
      'after rolling back model.state loaded.saved'
    );
    assert.equal(
      get(model, 'name'),
      'The Winds of Winter',
      'rollbackAttributes reverts changes to the record'
    );
  });

  test('.rollbackAttributes rolls back nested dirty attributes', function(assert) {
    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            nextChapter: {
              name: 'The first chapter',
            },
          },
        },
      });
    });

    set(model, 'nextChapter.name', 'The beginning');
    assert.equal(get(model, 'nextChapter.name'), 'The beginning', 'nested model attribute changed');

    model.rollbackAttributes();

    assert.equal(
      get(model, 'nextChapter.name'),
      'The first chapter',
      'rollbackAttributes reverts changes to the nested model'
    );

    assert.deepEqual(
      model.changedAttributes(),
      {},
      'after rollback, there are no changed attriutes'
    );
  });

  test('.rollbackAttributes rolls back nested dirty attributes after a rejected save', function(assert) {
    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        updateRecord() {
          return Promise.reject();
        },
      })
    );
    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            nextChapter: {
              name: 'The first chapter',
            },
          },
        },
      });
    });

    set(model, 'nextChapter.name', 'The beginning');
    assert.equal(get(model, 'nextChapter.name'), 'The beginning', 'nested model attribute changed');

    return run(() => model.save()).then(
      value => {
        throw new Error(`unexpected promise fulfillment with value ${value}`);
      },
      () => {
        model.rollbackAttributes();

        assert.equal(
          get(model, 'nextChapter.name'),
          'The first chapter',
          'rollbackAttributes reverts changes to the nested model'
        );

        assert.deepEqual(
          model.changedAttributes(),
          {},
          'after rollback, there are no changed attriutes'
        );
      }
    );
  });

  test('updates from .save do not overwrite attributes  or nested attributes set after .save is called', function(assert) {
    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        updateRecord() {
          return Promise.resolve({
            data: {
              id: 1,
              type: 'com.example.bookstore.Book',
              attributes: {
                name: "Harry Potter and the Sorcerer's Stone",
                author: 'J. K. Rowling',
                nextChapter: {
                  name: 'The Boy Who Lived',
                  number: 1,
                  nextChapter: {
                    name: 'The Vanishing Glass',
                    number: 2,
                  },
                },
              },
            },
          });
        },
      })
    );
    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            author: 'George R. R. Martin',
            nextChapter: {
              name: 'Windy eh',
              number: 1,
              nextChapter: {
                name: `I guess winter was coming after all`,
                number: 2,
              },
            },
          },
        },
      });
    });
    let nestedModel = get(model, 'nextChapter');
    let doubleNested = get(model, 'nextChapter.nextChapter');

    set(model, 'name', 'Alice in Wonderland');
    set(nestedModel, 'name', 'There must be some first chapter');
    set(doubleNested, 'name', 'Likely there is a second chapter as well');

    return run(() => {
      let savePromise = model.save();

      set(model, 'author', 'Lewis Carroll');
      set(nestedModel, 'number', 6);
      set(doubleNested, 'number', 24601);

      return savePromise.then(() => {
        assert.equal(
          get(model, 'author'),
          'Lewis Carroll',
          'the author was set after save, should not be updated'
        );
        assert.equal(
          get(model, 'name'),
          "Harry Potter and the Sorcerer's Stone",
          'the name of the book is updated from the save'
        );

        assert.equal(
          get(nestedModel, 'number'),
          6,
          'the author was set after save, should not be updated'
        );
        assert.equal(
          get(nestedModel, 'name'),
          'The Boy Who Lived',
          'the name of the first chapter is updated from the save'
        );

        assert.equal(
          get(doubleNested, 'number'),
          24601,
          'the author was set after save, should not be updated'
        );
        assert.equal(
          get(doubleNested, 'name'),
          'The Vanishing Glass',
          'the name of the second chapter is updated from the save'
        );
      });
    });
  });

  test('updates from .save clear changed attributes in nested models within arrays', function(assert) {
    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        updateRecord() {
          return Promise.resolve({
            data: {
              id: 1,
              type: 'com.example.bookstore.Book',
              attributes: {
                name: "Harry Potter and the Sorcerer's Stone",
                author: 'J. K. Rowling',
                chapters: [
                  {
                    name: 'The Boy Who Lived',
                    number: 1,
                  },
                  {
                    name: 'The Vanishing Glass',
                    number: 2,
                  },
                ],
              },
            },
          });
        },
      })
    );
    let model = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            author: 'George R. R. Martin',
            chapters: [
              {
                name: 'Windy eh',
                number: 1,
              },
              {
                name: `I guess winter was coming after all`,
                number: 2,
              },
            ],
          },
        },
      });
    });

    let nestedModels = get(model, 'chapters');
    set(nestedModels[0], 'name', 'super windy');

    assert.deepEqual(
      get(model, 'chapters').map(m => get(m, 'name')),
      ['super windy', 'I guess winter was coming after all'],
      'initially properties reflect locally changed attributes'
    );

    return run(() => {
      let savePromise = model.save();

      set(nestedModels[0], 'name', 'sooooooo super windy');

      return savePromise.then(() => {
        assert.deepEqual(
          get(model, 'chapters').map(m => get(m, 'name')),
          ['The Boy Who Lived', 'The Vanishing Glass'],
          'local changes to nested models within arrays are not preserved after adapter commit'
        );
      });
    });
  });

  test('store.findRecord', function(assert) {
    assert.expect(5);

    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        findRecord(store, modelClass, id, snapshot) {
          // TODO: this is annoying but name normalization means we get the wrong
          // model name in snapshots.  Should fix this upstream by dropping name
          // normalization.  See #11
          assert.equal(snapshot.modelName, 'com.example.bookstore.book', 'snapshot.modelName');
          assert.equal(modelClass, MegamorphicModel);
          assert.equal(id, 'isbn:9780439708180', 'findRecord(id)');

          return Promise.resolve({
            data: {
              id: 'isbn:9780439708180',
              type: 'com.example.bookstore.Book',
            },
          });
        },
      })
    );

    return run(() =>
      this.store.findRecord('com.example.bookstore.Book', 'isbn:9780439708180').then(model => {
        assert.equal(model.get('id'), 'isbn:9780439708180', 'model.id');
        assert.equal(model.constructor, MegamorphicModel, 'model.constructor');
      })
    );
  });

  test('store.deleteRecord', function(assert) {
    let model = run(() =>
      this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
        },
      })
    );

    assert.equal(
      this.store.hasRecordForId('com.example.bookstore.Book', 'isbn:9780439708180'),
      true,
      'model present'
    );
    run(() => {
      this.store.deleteRecord(model);
      this.store.unloadRecord(model);
    });
    assert.equal(
      this.store.hasRecordForId('com.example.bookstore.Book', 'isbn:9780439708180'),
      false,
      'model gone'
    );

    assert.equal(model.get('isDestroyed'), true, 'model.isDestroyed');
  });

  test('store.findAll', function(assert) {
    assert.expect(4);

    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        shouldReloadAll() {
          return true;
        },

        findAll(store, modelClass) {
          assert.equal(modelClass, MegamorphicModel);

          return Promise.resolve({
            data: [
              {
                id: 'isbn:9780439708180',
                type: 'com.example.bookstore.book',
              },
              {
                id: 'isbn:9780439064873',
                type: 'com.example.bookstore.book',
              },
            ],
          });
        },
      })
    );

    return run(() =>
      this.store.findAll('com.example.bookstore.book').then(models => {
        assert.deepEqual(
          models.mapBy('id'),
          ['isbn:9780439708180', 'isbn:9780439064873'],
          'models.[id]'
        );
        assert.deepEqual(
          models.mapBy('constructor'),
          [MegamorphicModel, MegamorphicModel],
          'models.[constructor]'
        );

        this.store.push({
          data: {
            id: 'isbn:9780439136365',
            type: 'com.example.bookstore.book',
          },
        });

        assert.deepEqual(
          models.mapBy('id'),
          ['isbn:9780439708180', 'isbn:9780439064873'],
          'models.[id]'
        );
      })
    );
  });

  test('store.query', function(assert) {
    assert.expect(5);

    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        shouldReloadAll() {
          return true;
        },

        query(store, modelClass, query /*, recordArray */) {
          assert.equal(modelClass, MegamorphicModel, 'modelClass arg');
          assert.deepEqual(query, { author: 'JK Rowling' }, 'query arg');

          return Promise.resolve({
            data: [
              {
                id: 'isbn:9780439708180',
                type: 'com.example.bookstore.book',
              },
              {
                id: 'isbn:9780439064873',
                type: 'com.example.bookstore.book',
              },
            ],
          });
        },
      })
    );

    return run(() =>
      this.store.query('com.example.bookstore.book', { author: 'JK Rowling' }).then(models => {
        assert.deepEqual(
          models.mapBy('id'),
          ['isbn:9780439708180', 'isbn:9780439064873'],
          'models.[id]'
        );
        assert.deepEqual(
          models.mapBy('constructor'),
          [MegamorphicModel, MegamorphicModel],
          'models.[constructor]'
        );

        this.store.push({
          data: {
            id: 'isbn:9780439136365',
            type: 'com.example.bookstore.book',
          },
        });

        assert.deepEqual(
          models.mapBy('id'),
          ['isbn:9780439708180', 'isbn:9780439064873'],
          'models.[id]'
        );
      })
    );
  });

  test('store.queryRecord', function(assert) {
    assert.expect(4);

    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        shouldReloadAll() {
          return true;
        },

        queryRecord(store, modelClass, query) {
          assert.equal(modelClass, MegamorphicModel, 'modelClass arg');
          assert.deepEqual(query, { author: 'JK Rowling' }, 'query arg');

          return Promise.resolve({
            data: {
              id: 'isbn:9780439708180',
              type: 'com.example.bookstore.book',
            },
          });
        },
      })
    );

    return run(() =>
      this.store.queryRecord('com.example.bookstore.book', { author: 'JK Rowling' }).then(model => {
        assert.equal(model.get('id'), 'isbn:9780439708180', 'model.id');
        assert.equal(model.constructor, MegamorphicModel, 'model.constructor');
      })
    );
  });

  test('store.unloadRecord', function(assert) {
    run(() => {
      this.store.push({
        data: {
          id: 'isbn:9780439136365',
          type: 'com.example.bookstore.book',
        },
      });

      assert.equal(
        this.store.hasRecordForId('com.example.bookstore.book', 'isbn:9780439136365'),
        true,
        'book in store'
      );
      let model = this.store.peekRecord('com.example.bookstore.book', 'isbn:9780439136365');
      this.store.unloadRecord(model);
    });

    assert.equal(
      this.store.hasRecordForId('com.example.bookstore.book', 'isbn:9780439136365'),
      false,
      'book unloaded'
    );
  });

  test('store.getReference', function(assert) {
    assert.expect(10);

    this.owner.register(
      'adapter:-ember-m3',
      EmberObject.extend({
        findRecord(store, modelClass, id, snapshot) {
          assert.equal(snapshot.modelName, 'com.example.bookstore.book', 'snapshot.modelName');
          assert.equal(modelClass, MegamorphicModel);
          assert.equal(id, 'isbn:9780439708180', 'findRecord(id)');

          return Promise.resolve({
            data: {
              id: 'isbn:9780439708180',
              type: 'com.example.bookstore.Book',
            },
          });
        },
      })
    );

    run(() => {
      let ref = this.store.getReference('com.example.bookstore.book', 'isbn:9780439708180');

      return ref
        .load()
        .then(model => {
          assert.deepEqual(model.get('id'), 'isbn:9780439708180', 'ref.load(x => x.id)');
          assert.deepEqual(model.constructor, MegamorphicModel, 'ref.load(x => x.constructor)');

          return ref.reload();
        })
        .then(model => {
          assert.deepEqual(model.get('id'), 'isbn:9780439708180', 'ref.reload(x => x.id)');
          assert.deepEqual(model.constructor, MegamorphicModel, 'ref.reload(x => x.constructor)');
        });
    });
  });

  test('store.hasRecordForId', function(assert) {
    return run(() => {
      this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
        },
      });

      assert.equal(
        this.store.hasRecordForId('com.example.bookstore.Book', 'isbn:9780439708180'),
        true,
        'store has model'
      );
      assert.equal(
        this.store.hasRecordForId('com.example.bookstore.Book', 'isbn:12345'),
        false,
        'store does not have model'
      );
    });
  });

  test('store.modelFor', function(assert) {
    let bookModel = this.store.modelFor('com.example.bookstore.Book');
    let chapterModel = this.store.modelFor('com.example.bookstore.Chapter');
    let authorModel = this.store.modelFor('author');

    assert.equal(authorModel, this.Author, 'modelFor DS.Model');
    assert.equal(bookModel, MegamorphicModel, 'modelFor schema-matching');
    assert.equal(chapterModel, MegamorphicModel, 'modelFor other schema-matching');
  });

  test('store.peekAll', function(assert) {
    run(() => {
      this.store.push({
        data: [
          {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
          },
          {
            id: 'isbn:9780439064873',
            type: 'com.example.bookstore.Book',
          },
        ],
      });
    });

    let models = this.store.peekAll('com.example.bookstore.Book');
    assert.deepEqual(
      models.mapBy('id'),
      ['isbn:9780439708180', 'isbn:9780439064873'],
      'store.peekAll().[id]'
    );

    run(() => {
      this.store.push({
        data: {
          id: 'isbn:9780439136365',
          type: 'com.example.bookstore.Book',
        },
      });
    });

    assert.deepEqual(
      models.mapBy('id'),
      ['isbn:9780439708180', 'isbn:9780439064873', 'isbn:9780439136365'],
      'peekAll.[id] live updates'
    );

    run(() => {
      this.store.createRecord('com.example.bookstore.Book', {
        name: 'A History of the English Speaking Peoples Volume I',
      });
    });

    assert.equal(
      models.get('lastObject.name'),
      'A History of the English Speaking Peoples Volume I',
      'peekAll.[prop] live updates'
    );

    // TODO: batch by cacheKeyForType
  });

  test('store.peekAll - grouped by model name', function(assert) {
    run(() => {
      this.store.push({
        data: [
          {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
          },
          {
            id: 'isbn:9780439708180/chapter/1',
            type: 'com.example.bookstore.Chapter',
          },
          {
            id: 'isbn:9780439064873',
            type: 'com.example.bookstore.Book',
          },
          {
            id: 'isbn:9780439708180/chapter/2',
            type: 'com.example.bookstore.Chapter',
          },
        ],
      });
    });

    let books = this.store.peekAll('com.example.bookstore.Book');
    let chapters = this.store.peekAll('com.example.bookstore.Chapter');

    assert.deepEqual(
      books.mapBy('id'),
      ['isbn:9780439708180', 'isbn:9780439064873'],
      'store.peekAll().[id]'
    );
    assert.deepEqual(
      chapters.mapBy('id'),
      ['isbn:9780439708180/chapter/1', 'isbn:9780439708180/chapter/2'],
      'store.peekAll groups by modelName'
    );
  });

  test('store.peekRecord', function(assert) {
    run(() => {
      this.store.push({
        data: [
          {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
          },
          {
            id: 'isbn:9780439708180/chapter/1',
            type: 'com.example.bookstore.Chapter',
          },
          {
            id: 'isbn:9780439064873',
            type: 'com.example.bookstore.Book',
          },
          {
            id: 'isbn:9780439708180/chapter/2',
            type: 'com.example.bookstore.Chapter',
          },
        ],
      });
    });

    assert.equal(
      get(this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439708180'), 'id'),
      'isbn:9780439708180'
    );
    assert.equal(
      get(this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439064873'), 'id'),
      'isbn:9780439064873'
    );
    assert.equal(
      this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439708180/chapter/1'),
      null
    );
    assert.equal(
      this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439708180/chapter/2'),
      null
    );

    assert.equal(
      get(
        this.store.peekRecord('com.example.bookstore.Chapter', 'isbn:9780439708180/chapter/1'),
        'id'
      ),
      'isbn:9780439708180/chapter/1'
    );
    assert.equal(
      get(
        this.store.peekRecord('com.example.bookstore.Chapter', 'isbn:9780439708180/chapter/2'),
        'id'
      ),
      'isbn:9780439708180/chapter/2'
    );
    assert.equal(
      this.store.peekRecord('com.example.bookstore.Chapter', 'isbn:9780439708180'),
      null
    );
    assert.equal(
      this.store.peekRecord('com.example.bookstore.Chapter', 'isbn:9780439064873'),
      null
    );
  });

  test('store.hasRecordForId', function(assert) {
    run(() => {
      this.store.push({
        data: [
          {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
          },
          {
            id: 'isbn:9780439708180/chapter/1',
            type: 'com.example.bookstore.Chapter',
          },
          {
            id: 'isbn:9780439064873',
            type: 'com.example.bookstore.Book',
          },
          {
            id: 'isbn:9780439708180/chapter/2',
            type: 'com.example.bookstore.Chapter',
          },
        ],
      });
    });

    assert.equal(
      this.store.hasRecordForId('com.example.bookstore.Book', 'isbn:9780439708180'),
      true
    );
    assert.equal(
      this.store.hasRecordForId('com.example.bookstore.Book', 'isbn:9780439064873'),
      true
    );
    assert.equal(
      this.store.hasRecordForId('com.example.bookstore.Book', 'isbn:9780439708180/chapter/1'),
      false
    );
    assert.equal(
      this.store.hasRecordForId('com.example.bookstore.Book', 'isbn:9780439708180/chapter/2'),
      false
    );

    assert.equal(
      this.store.hasRecordForId('com.example.bookstore.Chapter', 'isbn:9780439708180'),
      false
    );
    assert.equal(
      this.store.hasRecordForId('com.example.bookstore.Chapter', 'isbn:9780439064873'),
      false
    );
    assert.equal(
      this.store.hasRecordForId('com.example.bookstore.Chapter', 'isbn:9780439708180/chapter/1'),
      true
    );
    assert.equal(
      this.store.hasRecordForId('com.example.bookstore.Chapter', 'isbn:9780439708180/chapter/2'),
      true
    );
  });
});
