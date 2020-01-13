import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import sinon from 'sinon';
import { GTE_VERSION_3_5_1 } from 'ember-m3/-infra/versions';

import { get } from '@ember/object';
import { run } from '@ember/runloop';
import { isArray } from '@ember/array';

import MegamorphicModel from 'ember-m3/model';
import DefaultSchema from 'ember-m3/services/m3-schema';
import { HAS_MODEL_PACKAGE } from 'ember-m3/-infra/packages';
import require from 'require';

let Model, attr, hasMany;
if (HAS_MODEL_PACKAGE) {
  let ModelPackage = require('@ember-data/model');
  Model = ModelPackage.default;
  attr = ModelPackage.attr;
  hasMany = ModelPackage.hasMany;
} else {
  let DSPackage = require('ember-data').default;
  Model = DSPackage.Model;
  attr = DSPackage.attr;
  hasMany = DSPackage.hasMany;
}

const UrnWithTypeRegex = /^urn:([a-zA-Z.]+):(.*)/;
const UrnWithoutTypeRegex = /^urn:(.*)/;

module('unit/m3-model (interop with @ember-data/model)', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.sinon = sinon.createSandbox();
    this.store = this.owner.lookup('service:store');

    this.Author = Model.extend({
      name: attr('string'),
      publishedBooks: hasMany('com.example.bookstore.Book', {
        async: false,
      }),
    });
    this.Author.toString = () => 'Author';
    this.owner.register('model:author', this.Author);

    class TestSchema extends DefaultSchema {
      includesModel(modelName) {
        return /^com.example.bookstore\./i.test(modelName);
      }

      // TODO: split this up to different tests
      computeAttributeReference(key, value, modelName, schemaInterface) {
        if (value === undefined) {
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
        } else if (key === 'otherBooksInSeries') {
          return (value || []).map(id => ({
            type: null,
            id,
          }));
        } else if (Array.isArray(value)) {
          return value.every(v => typeof v === 'string' && /^isbn:/.test(v))
            ? value.map(id => ({
                type: /^isbn:/.test(id) ? 'com.example.bookstore.Book' : null,
                id,
              }))
            : undefined;
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
        }
      }

      computeNestedModel(key, value, modelName, data) {
        if (value === undefined) {
          value = data.getAttr(`${key}Embedded`);
        }
        if (value && typeof value === 'object' && value.constructor !== Date && !isArray(value)) {
          return {
            type: value.type,
            id: value.id,
            attributes: value,
          };
        }
      }
    }
    TestSchema.prototype.models = {
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
    };
    this.owner.register('service:m3-schema', TestSchema);
  });

  hooks.afterEach(function() {
    this.sinon.restore();
  });

  test('.unknownProperty resolves id-matched values to external @ember-data/model Models.', function(assert) {
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

  test('.unknownProperty resolves heterogenous arrays of m3-references, @ember-data/model model-references and nested objects', function(assert) {
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

    let relatedItems = get(model, 'relatedItems').content;
    assert.equal(relatedItems.length, 3, 'array has right length');
    assert.equal(get(relatedItems[0], 'name'), 'Chapter 1: The Boy Who Lived', 'array nested');
    assert.equal(
      get(relatedItems[1], 'name'),
      'Harry Potter and the Chamber of Secrets',
      'array ref-to-m3'
    );
    assert.equal(get(relatedItems[2], 'name'), 'JK Rowling', 'array ref-to-ds.model');
  });

  test('tracked arrays with @ember-data/model', function(assert) {
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
    //let dsModel = relatedItems.objectAt(2);
    let dsModel = this.store.peekRecord('author', '3');
    run(() => {
      relatedItems.pushObject(dsModel);
    });
    assert.equal(get(relatedItems, 'length'), 3, 'array has right length');
    run(() => {
      dsModel.unloadRecord();
    });
    assert.equal(get(relatedItems, 'length'), 2, 'array has right length');
  });

  if (GTE_VERSION_3_5_1) {
    test('DS.Models can have relationships into m3 models', function(assert) {
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
  }

  test('store.modelFor', function(assert) {
    let bookModel = this.store.modelFor('com.example.bookstore.Book');
    let chapterModel = this.store.modelFor('com.example.bookstore.Chapter');
    let authorModel = this.store.modelFor('author');

    assert.equal(authorModel, this.Author, 'modelFor @ember-data/model');
    assert.equal(bookModel, MegamorphicModel, 'modelFor schema-matching');
    assert.equal(chapterModel, MegamorphicModel, 'modelFor other schema-matching');
  });
});
