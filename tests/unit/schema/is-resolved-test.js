import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import sinon from 'sinon';
import DefaultSchema from 'ember-m3/services/m3-schema';
import ManagedArray from 'ember-m3/managed-array';

function computeAttributeReference(key, value, modelName, schemaInterface) {
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

function computeNestedModel(key, value) {
  if (value && typeof value === 'object' && value.constructor !== Date && !Array.isArray(value)) {
    return {
      type: value.type,
      id: value.id,
      attributes: value,
    };
  }
}
class TestSchema extends DefaultSchema {
  computeAttribute(key, value, modelName, schemaInterface) {
    let reference = computeAttributeReference(key, value, modelName, schemaInterface);
    if (Array.isArray(reference)) {
      return schemaInterface.managedArray(reference.map(r => schemaInterface.reference(r)));
    } else if (reference) {
      return schemaInterface.reference(reference);
    }

    if (Array.isArray(value)) {
      let nested = value.map(v => {
        if (typeof v === 'object') {
          return schemaInterface.nested(computeNestedModel(key, v, modelName, schemaInterface));
        } else {
          let ref = computeAttributeReference(key, v, modelName, schemaInterface);
          if (ref) {
            return schemaInterface.reference(ref);
          } else {
            return v;
          }
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

  includesModel(modelName) {
    return /^com.example.bookstore\./i.test(modelName);
  }
}

class TestSchemaOldHooks extends DefaultSchema {
  computeAttributeReference(key, value, modelName, schemaInterface) {
    return computeAttributeReference(key, value, modelName, schemaInterface);
  }
  computeNestedModel(key, value, modelName, schemaInterface) {
    return computeNestedModel(key, value, modelName, schemaInterface);
  }
  includesModel(modelName) {
    return /^com.example.bookstore\./i.test(modelName);
  }
}

for (let testRun = 0; testRun < 2; testRun++) {
  module(
    `unit/schema/is-resolved  ${testRun === 0 ? 'old hooks' : 'with computeAttribute'}`,
    function(hooks) {
      setupTest(hooks);

      hooks.beforeEach(function() {
        this.sinon = sinon.createSandbox();
        this.store = this.owner.lookup('service:store');
        if (testRun === 0) {
          this.BaseSchema = TestSchemaOldHooks;
          this.methodName = 'computeAttributeReference';
        } else if (testRun === 1) {
          this.BaseSchema = TestSchema;
          this.methodName = 'computeAttribute';
        }
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
          let computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, this.methodName);

          this.book.set('bestChapter', this.chapter1);
          let ch1Attr = this.book.get('bestChapter');

          assert.deepEqual(Object.keys(this.book._cache), ['bestChapter'], 'attribute is cached');
          assert.equal(ch1Attr, this.chapter1, 'attribute was set');
          assert.equal(computeAttrSpy.callCount, 0, 'attribute was cached (treated as resolved)');
        });

        test('record arrays are treated as resolved', function(assert) {
          let chapters = this.book.get('chapters');

          let computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, this.methodName);

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

          let computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, this.methodName);

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
          let computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, this.methodName);

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
          let computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, this.methodName);

          this.book.set('*mentionedDragons', []);

          assert.deepEqual(Object.keys(this.book._cache), [], 'attribute is not cached');

          let mentionedDragons = this.book.get('mentionedDragons');

          assert.ok(
            mentionedDragons instanceof ManagedArray,
            'attribute is resolved to a managed array'
          );
          assert.deepEqual(mentionedDragons.length, 0, 'resolved array is empty');
          assert.equal(
            computeAttrSpy.callCount,
            1,
            'attribute was not cached (treated as unresolved)'
          );
        });

        test('primitive references are treated as unresolved', function(assert) {
          let computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, this.methodName);

          this.book.set('*someChapter', this.chapter1.id);

          assert.deepEqual(Object.keys(this.book._cache), [], 'attribute is not cached');
          assert.equal(
            this.book.get('someChapter.id'),
            'isbn:9780439708180:chapter:1',
            'attribute was set'
          );
          assert.equal(
            computeAttrSpy.callCount,
            1,
            'attribute was not cached (treated as unresolved)'
          );
        });

        test('primitive values are treated as unresolved', function(assert) {
          let computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, this.methodName);

          this.book.set('someChapter', this.chapter1.id);

          assert.deepEqual(Object.keys(this.book._cache), [], 'attribute is not cached');
          assert.equal(
            this.book.get('someChapter'),
            'isbn:9780439708180:chapter:1',
            'attribute was set'
          );
          assert.equal(
            computeAttrSpy.callCount,
            1,
            'attribute was not cached (treated as unresolved)'
          );
        });

        test('plain objects are treated as unresolved', function(assert) {
          this.book.set('metadata', {
            '*bestChapter': 'isbn:9780439708180:chapter:1',
          });

          assert.ok(!('metadata' in this.book._cache), 'attribute is not cached');
          let metadata = this.book.get('metadata');

          assert.ok(metadata.constructor.isModel, 'attribute is resolved');
          assert.equal(
            this.book.get('metadata.bestChapter.id'),
            'isbn:9780439708180:chapter:1',
            'attribute was set'
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
            class UserSchema extends this.BaseSchema {
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
          let computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, this.methodName);

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

          assert.deepEqual(
            Object.keys(this.book._cache),
            ['someChapter'],
            'attribute is not cached'
          );
          assert.equal(
            this.book.get('someOtherChapter'),
            'isbn:9780439708180:chapter:2',
            'attribute was set'
          );
          assert.equal(
            computeAttrSpy.callCount,
            1,
            'attribute was not cached (treated as unresolved)'
          );
        });

        test('schema.isResolved can treat a set attribute as unresolved', function(assert) {
          this.isAttributeResolved = () => false;
          let computeAttrSpy = this.sinon.spy(this.BaseSchema.prototype, this.methodName);

          this.book.set('someOtherChapter', this.chapter2.id);

          assert.deepEqual(Object.keys(this.book._cache), [], 'attribute is not cached');
          assert.equal(
            this.book.get('someOtherChapter'),
            'isbn:9780439708180:chapter:2',
            'attribute was set'
          );
          assert.equal(
            computeAttrSpy.callCount,
            1,
            'attribute was not cached (treated as unresolved)'
          );
        });
      });
    }
  );
}
