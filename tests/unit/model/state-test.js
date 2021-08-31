import { module, test, skip } from 'qunit';
import { setupTest, setupRenderingTest } from 'ember-qunit';
import { run } from '@ember/runloop';
import { isArray } from '@ember/array';
import Component from '@ember/component';
import { hbs } from 'ember-cli-htmlbars';
import { render } from '@ember/test-helpers';
import { gte } from 'ember-compatibility-helpers';
import propGet from '../../helpers/prop-get';
import DefaultSchema from 'ember-m3/services/m3-schema';
import { CUSTOM_MODEL_CLASS } from 'ember-m3/-infra/features';

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
  useNativeProperties() {
    return gte('@ember-data/model', '3.28.0') || gte('ember-data', '3.28.0');
  }
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
  useNativeProperties() {
    return gte('@ember-data/model', '3.28.0') || gte('ember-data', '3.28.0');
  }

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
        assert.equal(propGet(record, 'isLoading'), false, 'record is not loading');
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
        assert.equal(propGet(record, 'isLoaded'), true, 'record is loaded');
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
        assert.equal(propGet(record, 'isDeleted'), false, 'record starts off not deleted');
        record.deleteRecord();
        assert.equal(propGet(record, 'isDeleted'), true, 'record is now deleted');
        record.rollbackAttributes();
        assert.equal(
          propGet(record, 'isDeleted'),
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

        assert.equal(propGet(existingRecord, 'isDeleted'), false, 'existingRecord.isNew');

        existingRecord.deleteRecord();

        assert.equal(
          propGet(existingRecord, 'isDeleted'),
          true,
          'existingRecord.delete() -> isDirty'
        );

        let newRecord = this.store.createRecord('com.example.bookstore.Book', {
          title: 'Something is Going On',
          author: 'Just Some Friendly Guy',
        });

        assert.equal(propGet(newRecord, 'isNew'), true, 'newRecord.isNew');

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

        assert.equal(propGet(record, 'isDirty'), false, 'record not dirty');
        assert.equal(
          propGet(propGet(record, 'rating'), 'isDirty'),
          false,
          'nested record not dirty'
        );

        record.set('author', 'Nobody yet');

        assert.equal(propGet(record, 'isDirty'), true, 'record dirty');
        assert.equal(
          propGet(propGet(record, 'rating'), 'isDirty'),
          true,
          'nested record shares dirty state with parent'
        );

        record.rollbackAttributes();

        assert.equal(propGet(record, 'isDirty'), false, 'record no longer dirty');
        assert.equal(
          propGet(propGet(record, 'rating'), 'isDirty'),
          false,
          'nested record no longer dirty'
        );

        record.set('rating.avg', 11);

        assert.equal(propGet(record, 'isDirty'), true, 'record shares state with nested record');
        assert.equal(propGet(propGet(record, 'rating'), 'isDirty'), true, 'nested record dirty');

        record.rollbackAttributes();

        record.set('name', 'The Winds of Never Published');
        assert.equal(
          propGet(record, 'isDirty'),
          true,
          'record is dirty from outside nested record'
        );

        record.set('rating.avg', 11);
        assert.equal(
          propGet(propGet(record, 'rating'), 'isDirty'),
          true,
          'nested record dirty from its own attr'
        );

        record.set('rating.avg', 10);
        assert.equal(
          propGet(record, 'isDirty'),
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

    if (CUSTOM_MODEL_CLASS) {
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
              // Passing `{ someKey: undefined }` will trigger a property change on the newly created model, but will not dirty the properties
              // If we are not careful we could create a rerender cycle by notifying `isDirty` change on a record in the middle of instantiation
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
    }
  });
}
