import { test, module } from 'qunit';
import { setupTest } from 'ember-qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';
import DS from 'ember-data';
import { run } from '@ember/runloop';

module('unit/model/references-test', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.Publisher = DS.Model.extend({
      name: DS.attr('string'),
    });
    this.Publisher.toString = () => 'Publisher';
    this.owner.register('model:publisher', this.Publisher);

    class TestSchema extends DefaultSchema {
      includesModel(modelName) {
        if (modelName === 'publisher') {
          return false;
        }
        return true;
      }

      computeAttributeReference(modelName) {
        if (modelName === 'publishers') {
          return [{ id: '1', type: 'publisher' }];
        } else {
          return { id: null, type: 'com.example.Author' };
        }
      }
    }
    this.owner.register('service:m3-schema', TestSchema);
    this.store = this.owner.lookup('service:store');
  });

  test('references with null ids return null records', function(assert) {
    this.store.push({
      data: {
        id: 'urn:book:1',
        type: 'com.example.Book',
        attributes: {
          author: null,
        },
      },
    });

    let book = this.store.peekRecord('com.example.Book', 'urn:book:1');
    assert.equal(book.id, 'urn:book:1', 'book pushed into store');

    assert.strictEqual(book.get('author'), null, 'reference with null id does not error');
  });

  test('references are prioritized over raw values for determining isArray', function(assert) {
    this.store.push({
      data: {
        id: 'urn:book:1',
        type: 'com.example.Book',
        attributes: {
          author: ['urn:author:1'],
        },
      },
    });

    let book = this.store.peekRecord('com.example.Book', 'urn:book:1');
    assert.equal(book.id, 'urn:book:1', 'book pushed into store');

    assert.strictEqual(
      book.get('author'),
      null,
      'null reference with raw array value does not error'
    );
  });

  test('references to DS.Models', function(assert) {
    this.store.push({
      data: {
        id: 'urn:book:1',
        type: 'com.example.Book',
        attributes: {
          author: null,
          publishers: '',
        },
      },
      included: [
        {
          type: 'publisher',
          id: '1',
          attributes: {
            name: 'eric',
          },
        },
      ],
    });

    let book = this.store.peekRecord('com.example.Book', 'urn:book:1');
    assert.equal(book.id, 'urn:book:1', 'book pushed into store');
    let bookPublishers = book.get('publishers');
    let bookPublisher = bookPublishers.objectAt(0);
    assert.strictEqual(bookPublisher.get('name'), 'eric', 'reference to DS.Model resolves');
    assert.ok(bookPublisher instanceof DS.Model, 'reference is a DS.Model');
    assert.strictEqual(
      bookPublisher,
      this.store.peekRecord('publisher', '1'),
      'reference and peekRecord resolve to the same model'
    );
  });

  test('unloading DS.Models removes them from reference arrays', function(assert) {
    this.store.push({
      data: {
        id: 'urn:book:1',
        type: 'com.example.Book',
        attributes: {
          author: null,
          publishers: '',
        },
      },
      included: [
        {
          type: 'publisher',
          id: '1',
          attributes: {
            name: 'eric',
          },
        },
      ],
    });

    let book = this.store.peekRecord('com.example.Book', 'urn:book:1');
    assert.equal(book.id, 'urn:book:1', 'book pushed into store');
    let publisher = this.store.peekRecord('publisher', '1');

    let bookPublishers = book.get('publishers');
    assert.strictEqual(
      bookPublishers.objectAt(0).get('name'),
      'eric',
      'reference to DS.Model resolves'
    );
    assert.strictEqual(
      bookPublishers.get('length'),
      1,
      'initial length of reference array is correct'
    );
    run(() => publisher.unloadRecord());
    assert.strictEqual(
      bookPublishers.get('length'),
      0,
      'record is removed from the reference array'
    );
  });

  test('unloading unresolved DS.Models removes them from reference arrays', function(assert) {
    this.store.push({
      data: {
        id: 'urn:book:1',
        type: 'com.example.Book',
        attributes: {
          author: null,
          publishers: '',
        },
      },
      included: [
        {
          type: 'publisher',
          id: '1',
          attributes: {
            name: 'eric',
          },
        },
      ],
    });

    let book = this.store.peekRecord('com.example.Book', 'urn:book:1');
    assert.equal(book.id, 'urn:book:1', 'book pushed into store');
    let publisher = this.store.peekRecord('publisher', '1');

    let bookPublishers = book.get('publishers');
    assert.strictEqual(
      bookPublishers.objectAt(0).get('name'),
      'eric',
      'reference to DS.Model resolves'
    );
    assert.strictEqual(
      bookPublishers.get('length'),
      1,
      'initial length of reference array is correct'
    );
    this.store.push({
      data: {
        id: 'urn:book:1',
        type: 'com.example.Book',
        attributes: {
          author: null,
          publishers: 'hi',
        },
      },
    });
    run(() => publisher.unloadRecord());
    assert.strictEqual(
      bookPublishers.get('length'),
      0,
      'record is removed from the reference array'
    );
  });
});
