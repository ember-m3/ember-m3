import sinon from 'sinon';
import { get } from '@ember/object';
import { run } from '@ember/runloop';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { initialize as initializeStore } from 'ember-m3/initializers/m3-store';
import M3TrackedArray from 'ember-m3/m3-tracked-array';

module('unit/model/tracked-array', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.sinon = sinon.sandbox.create();
    initializeStore(this);
    this.store = this.owner.lookup('service:store');

    this.schemaManager = this.owner.lookup('service:m3-schema-manager');
    this.schemaManager.registerSchema({
      includesModel(modelName) {
        return /^com.example.bookstore\./i.test(modelName);
      },

      computeBaseModelName() {},

      computeAttributeReference(/* key, value, modelName, schemaInterface */) {},

      computeNestedModel(key, value /*, modelName, schemaInterface */) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return {
            attributes: value,
          };
        }
      },

      models: {},
    });
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
    assert.equal(chapter1.constructor.isModel, true, 'chapters has resolved values');
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
    assert.equal(chapter2.constructor.isModel, true, 'new values can be resolved');
    assert.equal(get(chapter2, 'name'), 'The Vanishing Glass', `new values can be resolved`);
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
});
