import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';

let computeNestedModel = function computeNestedModel(key, value) {
  if (Array.isArray(value)) {
    return null;
  }

  if (value !== null && typeof value === 'object') {
    return { id: key, type: value.type, attributes: value };
  }
};

class TestSchema extends DefaultSchema {
  includesModel() {
    return true;
  }

  computeAttribute(key, value, modelName, schemaInterface) {
    if (Array.isArray(value)) {
      let nested = value.map((v) => {
        if (typeof v === 'object') {
          return schemaInterface.nested(computeNestedModel(key, v, modelName, schemaInterface));
        } else if (typeof v === 'string' && v.includes('urn')) {
          if (modelName.includes('projected')) {
            return schemaInterface.reference({ type: 'com.bookstore.projected-book', id: v });
          }
          if (modelName.includes('excerpt')) {
            return schemaInterface.reference({ type: 'com.bookstore.excerpt-book', id: v });
          }
          return schemaInterface.reference({ type: 'com.bookstore.book', id: v });
        } else {
          return v;
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

  computeBaseModelName(modelName) {
    if (['com.bookstore.projected-book', 'com.bookstore.excerpt-book'].includes(modelName)) {
      return 'com.bookstore.book';
    }
    if (
      ['com.bookstore.projected-bookstore', 'com.bookstore.excerpt-bookstore'].includes(modelName)
    ) {
      return 'com.bookstore.bookstore';
    }
    return null;
  }
}

module(`unit/model/projections/managed-array`, function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.store = this.owner.lookup('service:store');
    this.owner.register('service:m3-schema', TestSchema);
  });

  test('projected managed arrays can be kept in sync when a base array pushes a new record in', function (assert) {
    /*
        Projections setup:
        com.bookstore.Bookstore
        /                     \
      ProjectedBookstore  ExcerptBookstore

        com.bookstore.Book
        /                \
      ProjectedBook     ExcerptBook
      */

    this.store.push({
      data: [
        {
          id: 'urn:book:1',
          type: 'com.bookstore.Book',
          attributes: {
            title: 'A History of the English Speaking Peoples Vol I',
            randomChapter: {
              position: 2,
              title: 'Not actually a chapter in this book',
            },
          },
        },
        {
          id: 'urn:book:1',
          type: 'com.bookstore.ProjectedBook',
          attributes: {
            title: 'A History of the English Speaking Peoples Vol I',
          },
        },
        {
          id: 'urn:book:1',
          type: 'com.bookstore.ExcerptBook',
          attributes: {
            randomChapter: {
              position: 2,
              title: 'Not actually a chapter in this book',
            },
          },
        },
        {
          id: 'urn:bookstore:1',
          type: 'com.bookstore.Bookstore',
          attributes: {
            books: ['urn:book:1'],
          },
        },
        {
          id: 'urn:bookstore:1',
          type: 'com.bookstore.ProjectedBookstore',
          attributes: {
            books: ['urn:book:1'],
          },
        },
        {
          id: 'urn:bookstore:1',
          type: 'com.bookstore.ExcerptBookstore',
          attributes: {
            books: ['urn:book:1'],
          },
        },
      ],
    });

    let projectedBookstore = this.store.peekRecord(
      'com.bookstore.ProjectedBookstore',
      'urn:bookstore:1'
    );
    let projectedBooks = projectedBookstore.get('books');

    let excerptBookstore = this.store.peekRecord(
      'com.bookstore.ExcerptBookstore',
      'urn:bookstore:1'
    );
    let excerptBooks = excerptBookstore.get('books');

    // We push in a base record for 'urn:book:2', but not the projections
    this.store.push({
      data: {
        id: 'urn:book:2',
        type: 'com.bookstore.Book',
        attributes: {
          title: 'New book',
          randomChapter: {
            position: 5,
          },
        },
      },
    });
    this.store.push({
      data: {
        id: 'urn:bookstore:1',
        type: 'com.bookstore.Bookstore',
        attributes: {
          books: ['urn:book:1', 'urn:book:2'],
        },
      },
    });

    // But when accessed from the projected arrays we want to make sure we get the projected books
    assert.equal(
      projectedBooks.objectAt(1)._modelName,
      'com.bookstore.projected-book',
      'Got the right type of book projection'
    );
    assert.equal(
      excerptBooks.objectAt(1)._modelName,
      'com.bookstore.excerpt-book',
      'Got the right type of book projection'
    );
  });
});
