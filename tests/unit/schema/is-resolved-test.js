import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import sinon from 'sinon';
import DefaultSchema from 'ember-m3/services/m3-schema';
import M3ReferenceArray from 'ember-m3/m3-reference-array';

module('unit/schema/is-resolved', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.sinon = sinon.createSandbox();
    this.store = this.owner.lookup('service:store');
    this.BaseSchema = class BaseTestSchema extends DefaultSchema {
      computeAttributeReference(key, value, modelName, schemaInterface) {
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

      computeNestedModel(key, value) {
        if (
          value &&
          typeof value === 'object' &&
          value.constructor !== Date &&
          !Array.isArray(value)
        ) {
          return {
            type: value.type,
            id: value.id,
            attributes: value,
          };
        }
      }

      includesModel(modelName) {
        return /^com.example.bookstore\./i.test(modelName);
      }
    };
  });

  hooks.afterEach(function() {
    this.sinon.restore();
  });

  module('default impl', function(hooks) {
    hooks.beforeEach(function() {
      this.owner.register('service:m3-schema', this.BaseSchema);

      this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            '*chapters': ['isbn:9780439708180:chapter:1', 'isbn:9780439708180:chapter:2'],
            '*dragons': [],
          },
        },
        included: [
          {
            id: 'isbn:9780439708180:chapter:1',
            type: 'com.example.bookstore.Chapter',
            attributes: {
              name: 'The Boy Who Lived',
            },
          },
          {
            id: 'isbn:9780439708180:chapter:2',
            type: 'com.example.bookstore.Chapter',
            attributes: {
              name: 'The Vanishing Glass',
            },
          },
        ],
      });

      this.book = this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439708180');
      this.chapter1 = this.store.peekRecord(
        'com.example.bookstore.Chapter',
        'isbn:9780439708180:chapter:1'
      );
      this.chapter2 = this.store.peekRecord(
        'com.example.bookstore.Chapter',
        'isbn:9780439708180:chapter:2'
      );
    });

    test('records are treated as resolved', function(assert) {
      let computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, 'computeAttributeReference');

      this.book.set('bestChapter', this.chapter1);
      let ch1Attr = this.book.get('bestChapter');

      assert.deepEqual(Object.keys(this.book._cache), ['bestChapter'], 'attribute is cached');
      assert.equal(ch1Attr, this.chapter1, 'attribute was set');
      assert.equal(computeAttrSpy.callCount, 0, 'attribute was cached (treated as resolved)');
    });

    test('record arrays are treated as resolved', function(assert) {
      let chapters = this.book.get('chapters');

      let computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, 'computeAttributeReference');

      this.book.set('chaptersAgain', chapters);

      assert.deepEqual(
        Object.keys(this.book._cache),
        ['chapters', 'chaptersAgain'],
        'attribute is cached'
      );
      assert.equal(this.book.get('chaptersAgain'), chapters, 'attribute was set');
      assert.equal(computeAttrSpy.callCount, 0, 'attribute was cached (treated as resolved)');
    });

    test('empty record arrays are treated as resolved', function(assert) {
      let dragons = this.book.get('dragons');

      let computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, 'computeAttributeReference');

      this.book.set('dragonsAgain', dragons);

      assert.deepEqual(
        Object.keys(this.book._cache),
        ['dragons', 'dragonsAgain'],
        'attribute is cached'
      );
      assert.equal(this.book.get('dragonsAgain'), dragons, 'attribute was set');
      assert.equal(computeAttrSpy.callCount, 0, 'attribute was cached (treated as resolved)');
    });

    test('plain arrays of records are treated as resolved', function(assert) {
      let computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, 'computeAttributeReference');

      this.book.set('chaptersAgain', [this.chapter1, this.chapter2]);

      assert.deepEqual(Object.keys(this.book._cache), ['chaptersAgain'], 'attribute is cached');
      assert.deepEqual(
        this.book.get('chaptersAgain').map(x => x.get('id')),
        ['isbn:9780439708180:chapter:1', 'isbn:9780439708180:chapter:2'],
        'attribute was set'
      );
      assert.equal(computeAttrSpy.callCount, 0, 'attribute was cached (treated as resolved)');
    });

    test('empty plain arrays are treated as unresolved', function(assert) {
      let computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, 'computeAttributeReference');

      this.book.set('*mentionedDragons', []);

      assert.deepEqual(Object.keys(this.book._cache), [], 'attribute is not cached');

      let mentionedDragons = this.book.get('mentionedDragons');

      assert.ok(
        mentionedDragons instanceof M3ReferenceArray,
        'attribute is resolved to a reference array'
      );
      assert.deepEqual(mentionedDragons.length, 0, 'resolved array is empty');
      assert.equal(computeAttrSpy.callCount, 1, 'attribute was not cached (treated as unresolved)');
    });

    test('primitive references are treated as unresolved', function(assert) {
      let computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, 'computeAttributeReference');

      this.book.set('*someChapter', this.chapter1.id);

      assert.deepEqual(Object.keys(this.book._cache), [], 'attribute is not cached');
      assert.equal(
        this.book.get('someChapter.id'),
        'isbn:9780439708180:chapter:1',
        'attribute was set'
      );
      assert.equal(computeAttrSpy.callCount, 1, 'attribute was not cached (treated as unresolved)');
    });

    test('primitive values are treated as unresolved', function(assert) {
      let computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, 'computeAttributeReference');

      this.book.set('someChapter', this.chapter1.id);

      assert.deepEqual(Object.keys(this.book._cache), [], 'attribute is not cached');
      assert.equal(
        this.book.get('someChapter'),
        'isbn:9780439708180:chapter:1',
        'attribute was set'
      );
      assert.equal(computeAttrSpy.callCount, 1, 'attribute was not cached (treated as unresolved)');
    });

    test('plain objects are treated as unresolved', function(assert) {
      let computeNestedModelSpy = this.sinon.spy(this.BaseSchema.prototype, 'computeNestedModel');

      this.book.set('metadata', {
        '*bestChapter': 'isbn:9780439708180:chapter:1',
      });

      assert.ok(!('metadata' in this.book._cache), 'attriubte is not cached');
      let metadata = this.book.get('metadata');

      assert.ok(metadata.constructor.isM3Model, 'attribute is resolved');
      assert.equal(
        this.book.get('metadata.bestChapter.id'),
        'isbn:9780439708180:chapter:1',
        'attribute was set'
      );
      assert.equal(
        computeNestedModelSpy.callCount,
        1,
        'attribute was not cached (treated as unresolved)'
      );
    });
  });

  module('user impl', function(hooks) {
    hooks.beforeEach(function() {
      let testContext = this;
      this.isAttributeResolved = function() {
        throw new Error('implement this in test');
      };
      this.owner.register(
        'service:m3-schema',
        class TestSchema extends this.BaseSchema {
          isAttributeResolved(/* modelName, attrName, value, schemaInterface */) {
            return testContext.isAttributeResolved(...arguments);
          }
        }
      );

      this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            '*chapters': ['isbn:9780439708180:chapter:1', 'isbn:9780439708180:chapter:2'],
          },
        },
        included: [
          {
            id: 'isbn:9780439708180:chapter:1',
            type: 'com.example.bookstore.Chapter',
            attributes: {
              name: 'The Boy Who Lived',
            },
          },
          {
            id: 'isbn:9780439708180:chapter:2',
            type: 'com.example.bookstore.Chapter',
            attributes: {
              name: 'The Vanishing Glass',
            },
          },
        ],
      });

      this.book = this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439708180');
      this.chapter1 = this.store.peekRecord(
        'com.example.bookstore.Chapter',
        'isbn:9780439708180:chapter:1'
      );
      this.chapter2 = this.store.peekRecord(
        'com.example.bookstore.Chapter',
        'isbn:9780439708180:chapter:2'
      );
    });

    test('schema.isResolved can treat a set attribute as resolved', function(assert) {
      this.isAttributeResolved = () => true;
      let computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, 'computeAttributeReference');

      this.book.set('someChapter', this.chapter1.id);

      assert.deepEqual(Object.keys(this.book._cache), ['someChapter'], 'attribute is cached');
      assert.equal(
        this.book.get('someChapter'),
        'isbn:9780439708180:chapter:1',
        'attribute was set'
      );
      assert.equal(computeAttrSpy.callCount, 0, 'attribute was cached (treated as resolved)');

      this.isAttributeResolved = () => false;

      this.book.set('someOtherChapter', this.chapter2.id);

      assert.deepEqual(Object.keys(this.book._cache), ['someChapter'], 'attribute is not cached');
      assert.equal(
        this.book.get('someOtherChapter'),
        'isbn:9780439708180:chapter:2',
        'attribute was set'
      );
      assert.equal(computeAttrSpy.callCount, 1, 'attribute was not cached (treated as unresolved)');
    });

    test('schema.isResolved can treat a set attribute as unresolved', function(assert) {
      this.isAttributeResolved = () => false;
      let computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, 'computeAttributeReference');

      this.book.set('someOtherChapter', this.chapter2.id);

      assert.deepEqual(Object.keys(this.book._cache), [], 'attribute is not cached');
      assert.equal(
        this.book.get('someOtherChapter'),
        'isbn:9780439708180:chapter:2',
        'attribute was set'
      );
      assert.equal(computeAttrSpy.callCount, 1, 'attribute was not cached (treated as unresolved)');
    });
  });
});
