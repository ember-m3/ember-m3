import { module, test, skip } from 'qunit';
import { setupTest } from 'ember-qunit';

import { run } from '@ember/runloop';
import { isArray } from '@ember/array';

import DefaultSchema from 'ember-m3/services/m3-schema';

module('unit/model/state', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.store = this.owner.lookup('service:store');

    class TestSchema extends DefaultSchema {
      includesModel() {
        return true;
      }

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
        if (value && typeof value === 'object' && value.constructor !== Date && !isArray(value)) {
          return {
            type: value.type,
            id: value.id,
            attributes: value,
          };
        }
      }
    }
    this.owner.register('service:m3-schema', TestSchema);
  });

  skip('isEmpty', function() {});
  skip('isLoading', function() {});
  skip('isLoaded', function() {});
  skip('isSaving', function() {});
  skip('isDeleted', function() {});
  skip('isValid', function() {});

  test('isNew', function(assert) {
    let existingRecord = run(() =>
      this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            title: 'The Storm Before the Storm',
            author: 'Mike Duncan',
          },
        },
      })
    );

    assert.equal(existingRecord.get('isNew'), false, 'existingRecord.isNew');

    existingRecord.deleteRecord();

    assert.equal(existingRecord.get('isDirty'), true, 'existingRecor.delete() -> isDirty');

    let newRecord = this.store.createRecord('com.example.bookstore.Book', {
      title: 'Something is Going On',
      author: 'Just Some Friendly Guy',
    });

    assert.equal(newRecord.get('isNew'), true, 'newRecord.isNew');

    newRecord.deleteRecord();

    // TODO this seems wrong?
    // assert.equal(newRecord.get('isDirty'), false, 'newRecord.delete() -> isDirty');
  });

  test('isDirty', function(assert) {
    let record = run(() => {
      return this.store.push({
        data: {
          id: 1,
          type: 'com.example.bookstore.Book',
          attributes: {
            name: 'The Winds of Winter',
            author: 'George R. R. Martin',
            rating: {
              avg: 10,
            },
          },
        },
      });
    });

    assert.equal(record.get('isDirty'), false, 'record not dirty');
    assert.equal(record.get('rating.isDirty'), false, 'nested record not dirty');

    record.set('author', 'Nobody yet');

    assert.equal(record.get('isDirty'), true, 'record dirty');
    assert.equal(
      record.get('rating.isDirty'),
      true,
      'nested record shares dirty state with parent'
    );

    record.rollbackAttributes();

    assert.equal(record.get('isDirty'), false, 'record no longer dirty');
    assert.equal(record.get('rating.isDirty'), false, 'nested record no longer dirty');

    record.set('rating.avg', 11);

    assert.equal(record.get('isDirty'), true, 'record shares state with nested record');
    assert.equal(record.get('rating.isDirty'), true, 'nested record dirty');
  });
});
