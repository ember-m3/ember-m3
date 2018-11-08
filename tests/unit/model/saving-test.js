import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { run } from '@ember/runloop';
import { recordDataFor } from 'ember-m3/-private';
import DefaultSchema from 'ember-m3/services/m3-schema';

module('unit/model/saving', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register(
      'service:m3-schema',
      class TestSchema extends DefaultSchema {
        includesModel(modelName) {
          return /^com.example.bookstore\./i.test(modelName);
        }

        computeNestedModel(key, value /*, modelName, schemaInterface */) {
          if (value !== undefined && typeof value === 'object') {
            return {
              attributes: value,
            };
          }
        }
      }
    );
    this.store = this.owner.lookup('service:store');
  });

  test('.save saves via the store', function(assert) {
    assert.expect(4);

    this.owner.register(
      'adapter:-ember-m3',
      class TestAdapter {
        static create() {
          return new TestAdapter(...arguments);
        }

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
        }
      }
    );

    let record = run(() => {
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

    assert.equal(record.get('isSaving'), false, 'initially record not saving');

    return run(() => {
      record.set('estimatedPubDate', '2231?');

      return record.save().then(() => {
        assert.equal(record.get('isSaving'), false, 'record done saving');
        assert.deepEqual(
          recordDataFor(record)._data,
          {
            name: 'The Winds of Winter',
            estimatedRating: '11/10',
            estimatedPubDate: '2231?',
          },
          'data post save resolve'
        );
      });
    });
  });

  test('.reload calls findRecord with reload: true and passes adapterOptions', function(assert) {
    assert.expect(3);

    this.owner.register(
      'adapter:-ember-m3',
      class TestAdapter {
        static create() {
          return new TestAdapter(...arguments);
        }

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
            'adapterOptions passed to adapter from record.reload'
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
        }
      }
    );

    let record = run(() => {
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

    return run(() => record.reload({ adapterOptions: { doAdapterThings: true } }));
  });

  test('.deleteRecord works', function(assert) {
    assert.expect(2);

    this.owner.register(
      'adapter:-ember-m3',
      class TestAdapter {
        static create() {
          return new TestAdapter(...arguments);
        }

        deteRecord() {
          assert.ok(false, 'Did not make it to adapter');
        }
      }
    );

    let record = run(() => {
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

    assert.equal(record.get('isDeleted'), false, 'not initially deleted');
    record.deleteRecord();
    assert.equal(record.get('isDeleted'), true, 'record deleted');
  });

  test('.destroyRecord works for existing records', function(assert) {
    assert.expect(4);

    this.owner.register(
      'adapter:-ember-m3',
      class TestAdapter {
        static create() {
          return new TestAdapter(...arguments);
        }

        deleteRecord(store, type, snapshot) {
          assert.equal(snapshot.record.get('isDeleted'), true, 'record is deleted');
          return Promise.resolve();
        }
      }
    );

    let record = run(() => {
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
    assert.equal(record.get('isDeleted'), false, 'not initially deleted');
    return run(() =>
      record
        .destroyRecord()
        .then(() => record.unloadRecord())
        .then(() => {
          assert.equal(
            this.store.hasRecordForId('com.example.bookstore.book', '1'),
            false,
            'gone from identity map'
          );
        })
    );
  });

  test('.destroyRecord works for new records', function(assert) {
    assert.expect(2);

    this.owner.register(
      'adapter:-ember-m3',
      class TestAdapter {
        static create() {
          return new TestAdapter(...arguments);
        }

        deleteRecord(/* store, type, snapshot */) {
          assert.ok(false, 'destroying new records does not cause an API call');
          return Promise.reject();
        }
      }
    );

    let record = this.store.createRecord('com.example.bookstore.Book', {
      title: 'The Storm Before the Storm',
    });

    assert.equal(record.get('isDeleted'), false, 'not initially deleted');

    return run(() =>
      record.destroyRecord().then(() => {
        assert.equal(record.get('isDeleted'), true, 'record.isDeleted');
      })
    );
  });
});
