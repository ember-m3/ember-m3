import sinon from 'sinon';
import { get } from '@ember/object';
import { run } from '@ember/runloop';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import M3TrackedArray from 'ember-m3/m3-tracked-array';
import DefaultSchema from 'ember-m3/services/m3-schema';

module('unit/model/tracked-array', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.sinon = sinon.createSandbox();
    this.owner.register(
      'service:m3-schema',
      class TestSchema extends DefaultSchema {
        includesModel(modelName) {
          return /^com.example.bookstore\./i.test(modelName);
        }

        computeNestedModel(key, value /*, modelName, schemaInterface */) {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return {
              attributes: value,
            };
          }
        }
      }
    );

    this.store = this.owner.lookup('service:store');
  });

  test('tracked, non-reference, arrays resolve new values', function(assert) {
    let model = run(() =>
      this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            chapters: [
              {
                name: 'The Boy Who Lived',
              },
              2,
            ],
          },
        },
      })
    );

    let chapters = model.get('chapters');
    assert.equal(chapters instanceof M3TrackedArray, true, 'chapters is a tracked array');

    let chapter1 = chapters.objectAt(0);
    assert.equal(chapter1.constructor.isM3Model, true, 'chapters has resolved values');
    assert.equal(
      chapter1.get('name'),
      'The Boy Who Lived',
      `chapters's embedded records can resolve values`
    );

    assert.equal(
      chapters.objectAt(1),
      2,
      'chapters is a heterogenous mix of resolved and unresolved values'
    );

    run(() => chapters.pushObject(3));
    assert.equal(chapters.objectAt(2), 3, `chapters accepts new values that don't resolve`);

    run(() => chapters.pushObject({ name: 'The Vanishing Glass' }));

    let chapter2 = chapters.objectAt(3);
    assert.equal(chapter2.constructor.isM3Model, true, 'new values can be resolved');
    assert.equal(get(chapter2, 'name'), 'The Vanishing Glass', `new values can be resolved`);
  });

  test('tracked nested array, non-reference, arrays resolve new values', function(assert) {
    let model = run(() =>
      this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            chapters: [
              {
                name: 'The Boy Who Lived',
              },
            ],
          },
        },
      })
    );

    let chapters = model.get('chapters');
    assert.equal(chapters instanceof M3TrackedArray, true, 'chapters is a tracked array');

    let chapter1 = chapters.objectAt(0);
    assert.equal(chapter1.constructor.isM3Model, true, 'chapters has resolved values');
    assert.equal(
      chapter1.get('name'),
      'The Boy Who Lived',
      `chapters's embedded records can resolve values`
    );

    run(() => chapters.pushObject({ name: 'The Vanishing Glass' }));

    let chapter2 = chapters.objectAt(1);
    assert.equal(chapter2.constructor.isM3Model, true, 'new values can be resolved');
    assert.equal(get(chapter2, 'name'), 'The Vanishing Glass', `new values can be resolved`);

    //Remove object
    run(() => chapters.shiftObject());
    assert.equal(chapters.length, 1, 'Item is removed');
    chapter1 = chapters.objectAt(0);
    assert.equal(chapter1.constructor.isM3Model, true, 'chapters has resolved values');
    assert.equal(
      get(chapter1, 'name'),
      'The Vanishing Glass',
      `First item is removed from the array`
    );

    //Push new object
    run(() => chapters.pushObject({ name: 'The Vanishing Glass Pt. 2' }));
    assert.equal(chapters.length, 2, 'Item is pushed at the end');
    let chapter3 = chapters.objectAt(1);
    assert.equal(chapter3.constructor.isM3Model, true, 'new values can be resolved');
    assert.equal(get(chapter3, 'name'), 'The Vanishing Glass Pt. 2', `new values can be resolved`);

    //unshit object
    run(() => chapters.unshiftObject({ name: 'The Boy Who Lived' }));
    chapter1 = chapters.objectAt(0);
    assert.equal(chapters.length, 3, 'Item is removed');
    assert.equal(chapter1.constructor.isM3Model, true, 'chapters has resolved values');
    assert.equal(chapter1.get('name'), 'The Boy Who Lived', `added record at the start`);
  });

  test('unloaded records are automatically removed from tracked arrays', function(assert) {
    let model = run(() =>
      this.store.push({
        data: {
          id: 'isbn:9780439708180',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Sorcerer's Stone`,
            chapters: [],
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
      })
    );

    let chapter1 = this.store.peekRecord(
      'com.example.bookstore.Chapter',
      'isbn:9780439708180:chapter:1'
    );
    let chapter2 = this.store.peekRecord(
      'com.example.bookstore.Chapter',
      'isbn:9780439708180:chapter:2'
    );
    let chapters = model.get('chapters');

    run(() => chapters.pushObject(chapter1));
    run(() => chapters.pushObject(chapter2));

    assert.deepEqual(
      chapters.mapBy('name'),
      ['The Boy Who Lived', 'The Vanishing Glass'],
      'records are added to tracked arrays'
    );

    run(() => chapter2.unloadRecord());

    assert.deepEqual(
      chapters.mapBy('name'),
      ['The Boy Who Lived'],
      'unloaded records are removed from tracked arrays'
    );
  });

  test('embedded models can be added to tracked arrays', function(assert) {
    this.schema = this.owner.lookup('service:m3-schema');
    this.sinon.spy(this.schema, 'setAttribute');

    let [book1, book2] = run(() =>
      this.store.push({
        data: [
          {
            id: 'isbn:9780439708180',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Harry Potter and the Sorcerer's Stone`,
              chapters: [
                {
                  name: 'The Boy Who Lived',
                },
              ],
            },
          },
          {
            id: 'urn:isbn9780439064873',
            type: 'com.example.bookstore.Book',
            attributes: {
              name: `Harry Potter and the Chamber of Secrets`,
              chapters: [
                {
                  name: 'The Worst Birthday',
                },
              ],
            },
          },
        ],
      })
    );

    let book1Chapter1 = book1.get('chapters').objectAt(0);
    let book2Chapter1 = book2.get('chapters').objectAt(0);
    book2.get('chapters').pushObject(book1Chapter1);

    assert.equal(this.schema.setAttribute.callCount, 1, 'setAttribute called once');
    assert.deepEqual(this.schema.setAttribute.lastCall.args.slice(0, -1), [
      // model name is "normalized"
      'com.example.bookstore.book',
      'chapters',
      [book2Chapter1, book1Chapter1],
    ]);

    assert.deepEqual(
      book1.get('chapters').mapBy('name'),
      ['The Boy Who Lived'],
      'book1 chapters correct'
    );
    assert.deepEqual(
      book2.get('chapters').mapBy('name'),
      ['The Worst Birthday', 'The Boy Who Lived'],
      'book2 chapters correct'
    );

    assert.strictEqual(
      book1.get('chapters').objectAt(0),
      book2.get('chapters').objectAt(1),
      'embedded model can be shared between tracked arrays'
    );
  });
});
