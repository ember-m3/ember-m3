import { module, test, skip } from 'qunit';
import { setupTest, setupRenderingTest } from 'ember-qunit';
import { run } from '@ember/runloop';
import { isArray } from '@ember/array';
import Component from '@ember/component';
import { hbs } from 'ember-cli-htmlbars';
import { render } from '@ember/test-helpers';
import { gte } from 'ember-compatibility-helpers';

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
      // There is no way to observe this in the true state
      test('isLoading', function (assert) {
        let data = {
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              title: 'The Storm Before the Storm',
              author: 'Mike Duncan',
            },
          },
        };

        let record = this.store.push(data);
        assert.equal(record.get('isLoading'), false, 'record is not loading');
      });

      // There is no way to observe this in the false state
      test('isLoaded', function (assert) {
        let data = {
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              title: 'The Storm Before the Storm',
              author: 'Mike Duncan',
            },
          },
        };

        let record = this.store.push(data);
        assert.equal(record.get('isLoaded'), true, 'record is loaded');
      });
      skip('isSaving', function () {});
      test('isDeleted', function (assert) {
        let data = {
          data: {
            id: 1,
            type: 'com.example.bookstore.Book',
            attributes: {
              title: 'The Storm Before the Storm',
              author: 'Mike Duncan',
            },
          },
        };
        let record = this.store.push(data);
        assert.equal(record.get('isDeleted'), false, 'record starts off not deleted');
        record.deleteRecord();
        assert.equal(record.get('isDeleted'), true, 'record is now deleted');
        record.rollbackAttributes();
        assert.equal(
          record.get('isDeleted'),
          false,
          'after rollbackAttributes record is no longer deleted'
        );
      });

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

        assert.equal(existingRecord.get('isDirty'), true, 'existingRecord.delete() -> isDirty');

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

if (gte('3.24.0')) {
  module('unit/model/state with rendering', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
      this.owner.register('service:m3-schema', TestSchema);
      this.store = this.owner.lookup('service:store');
    });

    test('updating isDirty flag does not cause rerenders', async function (assert) {
      this.owner.register(
        'component:show-dirtyness',
        class ShowDirtyness extends Component {
          layout = hbs`
          {{#if this.myBook.isDirty}}
            Book is dirty
          {{/if}}
      `;

          get myBook() {
            this.book.get('rating').set('property', 'prop');
            return this.book;
          }
        }
      );

      let book = this.store.push({
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

      this.set('book', book);
      book.get('isDirty');

      await render(hbs`
        {{show-dirtyness book=this.book}}
      `);

      assert.equal(this.element.innerText, 'Book is dirty', 'Book renders as dirty');
    });

    test('creating a record does not cause rerenders from reading `isDirty` when key values are undefined', async function (assert) {
      this.owner.register(
        'component:show-dirtyness',
        class ShowDirtyness extends Component {
          layout = hbs`
          {{#if this.myBook.isDirty}}
            Book is dirty
          {{/if}}
      `;

          get myBook() {
            return this.store.createRecord('com.example.bookstore.book', { someKey: undefined });
          }
        }
      );

      this.set('store', this.store);

      await render(hbs`
        {{show-dirtyness store=this.store}}
      `);

      assert.equal(this.element.innerText, 'Book is dirty', 'Book renders as dirty');
    });
  });
}
