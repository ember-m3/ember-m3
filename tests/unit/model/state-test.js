import { module, test, skip } from 'qunit';
import { setupTest } from 'ember-qunit';

import { run } from '@ember/runloop';
import { isArray } from '@ember/array';

import DefaultSchema from 'ember-m3/services/m3-schema';

let computeNestedModel = function computeNestedModel(key, value) {
  if (value && typeof value === 'object' && !isArray(value)) {
    return {
      type: value.type,
      id: value.id,
      attributes: value,
    };
  }
};

let computeAttributeReference = function computeAttributeReference(
  key,
  value,
  modelName,
  schemaInterface
) {
  let refValue = schemaInterface.getAttr(`*${key}`);
  if (typeof refValue === 'string') {
    return {
      type: null,
      id: refValue,
    };
  } else if (Array.isArray(refValue)) {
    return refValue.map((x) => ({
      type: null,
      id: x,
    }));
  }
  return null;
};

class TestSchema extends DefaultSchema {
  includesModel() {
    return true;
  }
  computeAttribute(key, value, modelName, schemaInterface) {
    let reference = computeAttributeReference(key, value, modelName, schemaInterface);
    if (Array.isArray(reference)) {
      return schemaInterface.managedArray(reference.map((r) => schemaInterface.reference(r)));
    } else if (reference) {
      return schemaInterface.reference(reference);
    }

    if (Array.isArray(value)) {
      let nested = value.map((v) => {
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
}

class TestSchemaOldHooks extends DefaultSchema {
  includesModel() {
    return true;
  }

  computeAttributeReference(key, value, modelName, schemaInterface) {
    return computeAttributeReference(key, value, modelName, schemaInterface);
  }
  computeNestedModel(key, value, modelName, schemaInterface) {
    return computeNestedModel(key, value, modelName, schemaInterface);
  }
}

for (let testRun = 0; testRun < 2; testRun++) {
  module(
    `unit/model/state with ${testRun === 0 ? 'old hooks' : 'with computeAttribute'}`,
    function (hooks) {
      setupTest(hooks);

      hooks.beforeEach(function () {
        if (testRun === 0) {
          this.owner.register('service:m3-schema', TestSchemaOldHooks);
        } else if (testRun === 1) {
          this.owner.register('service:m3-schema', TestSchema);
        }
        this.store = this.owner.lookup('service:store');
      });

      skip('isEmpty', function () {});
      skip('isLoading', function () {});
      skip('isLoaded', function () {});
      skip('isSaving', function () {});
      skip('isDeleted', function () {});
      skip('isValid', function () {});

      test('isNew', function (assert) {
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

      test('isDirty', function (assert) {
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

        record.rollbackAttributes();

        record.set('name', 'The Winds of Never Published');
        assert.equal(record.get('isDirty'), true, 'record is dirty from outside nested record');

        record.set('rating.avg', 11);
        assert.equal(record.get('rating.isDirty'), true, 'nested record dirty from its own attr');

        record.set('rating.avg', 10);
        assert.equal(
          record.get('isDirty'),
          true,
          'record is not un-dirtied from resetting nested value'
        );
      });
    }
  );
}
