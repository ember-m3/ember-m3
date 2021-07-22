import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';
import MegamorphicModel, { EmbeddedMegamorphicModel } from 'ember-m3/model';

class TestSchema extends DefaultSchema {
  includesModel() {
    return true;
  }
}

module(`unit/model/plain-array`, function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.store = this.owner.lookup('service:store');
  });

  test('can resolve a plain array of primitives', function (assert) {
    class PrimitiveSchema extends TestSchema {
      computeAttribute(key, value) {
        return value;
      }
    }
    this.owner.register('service:m3-schema', PrimitiveSchema);
    let model = this.store.push({
      data: {
        id: 'isbn:9780439708180',
        type: 'com.example.bookstore.Book',
        attributes: {
          books: ['isbn:9780439064873', 'isbn:9780439136365'],
        },
      },
    });

    assert.deepEqual(
      model.get('books'),
      ['isbn:9780439064873', 'isbn:9780439136365'],
      'Got the book values'
    );
  });

  test('can resolve a plain array of pojos', function (assert) {
    class PrimitiveSchema extends TestSchema {
      computeAttribute(key, value) {
        return value;
      }
    }
    this.owner.register('service:m3-schema', PrimitiveSchema);
    let model = this.store.push({
      data: {
        id: 'isbn:9780439708180',
        type: 'com.example.bookstore.Book',
        attributes: {
          books: [{ id: 'isbn:9780439064873' }, { id: 'isbn:9780439136365' }],
        },
      },
    });

    assert.deepEqual(
      model.get('books'),
      [{ id: 'isbn:9780439064873' }, { id: 'isbn:9780439136365' }],
      'Got the book values'
    );
  });

  test('can resolve a plain array of nested objects', function (assert) {
    class NestedSchema extends TestSchema {
      computeAttribute(key, value, modelName, schemaInterface) {
        if (Array.isArray(value)) {
          return value.map((o) => schemaInterface.nested({ attributes: o }));
        } else {
          return value;
        }
      }
    }

    this.owner.register('service:m3-schema', NestedSchema);

    let model = this.store.push({
      data: {
        id: 'isbn:9780439708180',
        type: 'com.example.bookstore.Book',
        attributes: {
          books: [{ id: 'isbn:9780439064873' }, { id: 'isbn:9780439136365' }],
        },
      },
    });

    assert.ok(model.get('books')[0] instanceof EmbeddedMegamorphicModel);
    assert.equal(
      model.get('books')[0].get('id'),
      'isbn:9780439064873',
      'Can access the first object value'
    );
    assert.ok(model.get('books')[1] instanceof EmbeddedMegamorphicModel);
    assert.equal(
      model.get('books')[1].get('id'),
      'isbn:9780439136365',
      'Can access the second object value'
    );
  });

  test('can resolve a plain array of references', function (assert) {
    class ReferenceSchema extends TestSchema {
      computeAttribute(key, value, modelName, schemaInterface) {
        if (Array.isArray(value)) {
          return value.map((o) =>
            schemaInterface.reference({ id: o, type: 'com.example.bookstore.Book' })
          );
        } else {
          return value;
        }
      }
    }

    this.owner.register('service:m3-schema', ReferenceSchema);

    let model = this.store.push({
      data: {
        id: 'isbn:9780439708180',
        type: 'com.example.bookstore.Book',
        attributes: {
          books: ['isbn:9780439064873', 'isbn:9780439136365'],
        },
      },
      included: [
        {
          id: 'isbn:9780439064873',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Chamber of Secrets`,
          },
        },
        {
          id: 'isbn:9780439136365',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Prisoner of Azkaban`,
          },
        },
      ],
    });

    assert.ok(model.get('books')[0] instanceof MegamorphicModel);
    assert.equal(
      model.get('books')[0].get('name'),
      'Harry Potter and the Chamber of Secrets',
      'Can access the first object value'
    );
    assert.ok(model.get('books')[1] instanceof MegamorphicModel);
    assert.equal(
      model.get('books')[1].get('name'),
      'Harry Potter and the Prisoner of Azkaban',
      'Can access the second object value'
    );
  });

  test('can resolve a plain array mix of nested models and references', function (assert) {
    class ReferenceSchema extends TestSchema {
      computeAttribute(key, value, modelName, schemaInterface) {
        if (Array.isArray(value)) {
          return [
            schemaInterface.nested({ attributes: value[0] }),
            schemaInterface.reference({ id: value[1], type: 'com.example.bookstore.Book' }),
          ];
        } else {
          return value;
        }
      }
    }

    this.owner.register('service:m3-schema', ReferenceSchema);

    let model = this.store.push({
      data: {
        id: 'isbn:9780439708180',
        type: 'com.example.bookstore.Book',
        attributes: {
          books: [{ id: 'isbn:9780439064873' }, 'isbn:9780439136365'],
        },
      },
      included: [
        {
          id: 'isbn:9780439136365',
          type: 'com.example.bookstore.Book',
          attributes: {
            name: `Harry Potter and the Prisoner of Azkaban`,
          },
        },
      ],
    });

    assert.ok(model.get('books')[0] instanceof EmbeddedMegamorphicModel);
    assert.equal(
      model.get('books')[0].get('id'),
      'isbn:9780439064873',
      'Can access the first object value'
    );
    assert.ok(model.get('books')[1] instanceof MegamorphicModel);
    assert.equal(
      model.get('books')[1].get('name'),
      'Harry Potter and the Prisoner of Azkaban',
      'Can access the second object value'
    );
  });
});
