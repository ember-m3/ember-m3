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
  skip('isNew', function() {});
  skip('isValid', function() {});

  test('isDirty', function(assert) {
    let model = run(() => {
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

    assert.equal(model.get('isDirty'), false, 'model not dirty');
    assert.equal(model.get('rating.isDirty'), false, 'nested model not dirty');

    model.set('author', 'Nobody yet');

    assert.equal(model.get('isDirty'), true, 'model dirty');
    assert.equal(model.get('rating.isDirty'), true, 'nested model shares dirty state with parent');

    model.rollbackAttributes();

    assert.equal(model.get('isDirty'), false, 'model no longer dirty');
    assert.equal(model.get('rating.isDirty'), false, 'nested model no longer dirty');

    model.set('rating.avg', 11);

    assert.equal(model.get('isDirty'), true, 'model shares state with nested model');
    assert.equal(model.get('rating.isDirty'), true, 'nested model dirty');
  });

  skip();
});
