import { setupTest } from 'ember-qunit';
import { get } from '@ember/object';
import { module, test } from 'qunit';
import DefaultSchema from 'ember-m3/services/m3-schema';
import M3DebugAdapter from 'ember-m3/adapters/m3-debug-adapter';

const BOOK_MODEL_TYPE = 'com.example.bookstore.Book';

module('integration/m3-debug-adapter', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register(
      'service:m3-schema',
      class TestSchema extends DefaultSchema {
        computeAttributeReference(key, value, modelName, schemaInterface) {
          let refValue = schemaInterface.getAttr(`*${key}`);
          if (typeof refValue === 'string') {
            return {
              type: null,
              id: refValue,
            };
          } else if (Array.isArray(refValue)) {
            return refValue.map(id => ({
              type: null,
              id,
            }));
          }

          return undefined;
        }
        includesModel(modelName) {
          return /^com\.example\./.test(modelName);
        }
      }
    );
    this.owner.register('data-adapter:main', M3DebugAdapter);
    this.schema = this.owner.lookup('service:m3-schema');
    this.store = this.owner.lookup('service:store');
    this._m3debugAdapter = this.owner.lookup('data-adapter:main');

    this.wrappedModelTypeObject = {
      name: BOOK_MODEL_TYPE,
      count: 1,
      columns: [
        {
          name: 'id',
          desc: 'id',
        },
        {
          name: '$type',
          desc: '$type',
        },
        {
          name: 'name',
          desc: 'name',
        },
        {
          name: 'author',
          desc: 'author',
        },
        {
          name: 'pubDate',
          desc: 'pubDate',
        },
        {
          name: 'readerComments',
          desc: 'readerComments',
        },
      ],
      object: BOOK_MODEL_TYPE,
    };

    this.store.pushPayload(BOOK_MODEL_TYPE, {
      data: {
        id: 'urn:bookstore:1',
        type: BOOK_MODEL_TYPE,
        attributes: {
          $type: BOOK_MODEL_TYPE,
          name: 'The Birth of Britain',
          author: 'urn:author:1',
          pubDate: 'April 2005',
          readerComments: ['urn:comment:1', 'urn:comment:2'],
        },
      },
      included: [
        {
          id: 'urn:comment:1',
          type: 'com.example.bookstore.ReaderComment',
          attributes: {
            commenter: {
              $type: 'com.example.bookstore.Commenter',
              name: 'Some User',
              favouriteBook: 'isbn:9780760768587',
            },
            body: 'This book is great',
          },
        },
        {
          id: 'urn:comment:2',
          type: 'com.example.bookstore.ReaderComment',
          attributes: {
            commenter: {
              $type: 'com.example.bookstore.Commenter',
              name: 'Some Other User',
            },
            parts: [
              {
                value: { text: 'Really enjoyed this book' },
              },
              {
                value: ['A lot'],
              },
            ],
            metadata: {
              commentLikedBy: ['urn:author:1', 'urn:author:2'],
              avatar: {
                logo: 'test.png',
              },
            },
          },
        },
        {
          id: 'urn:author:1',
          type: 'com.example.bookstore.Author',
          attributes: {
            name: 'Winston Churchill',
          },
        },
      ],
    });
  });

  test('getModelTypes returns a list of model types', function(assert) {
    const modelTypes = this._m3debugAdapter.getModelTypes();
    const modelTypeArray = [
      {
        klass: 'com.example.bookstore.reader-comment',
        name: 'com.example.bookstore.reader-comment',
      },
      {
        klass: 'com.example.bookstore.author',
        name: 'com.example.bookstore.author',
      },
      {
        klass: 'com.example.bookstore.book',
        name: 'com.example.bookstore.book',
      },
    ];

    assert.deepEqual(modelTypes, modelTypeArray, 'Correct list of m3 model types is returned');
  });

  test('columnsForType returns attribute names as expected when records exist', function(assert) {
    const bookstore = this.store.peekAll(BOOK_MODEL_TYPE);
    const columns = this._m3debugAdapter.columnsForType(bookstore);

    assert.equal(columns.length, 6, 'A column is added for each attribute on the record');
    assert.deepEqual(columns[0], { name: 'id', desc: 'id' });
    assert.deepEqual(columns[1], { name: '$type', desc: '$type' });
    assert.deepEqual(columns[2], { name: 'name', desc: 'name' });
    assert.deepEqual(columns[3], { name: 'author', desc: 'author' });
    assert.deepEqual(columns[4], { name: 'pubDate', desc: 'pubDate' });
    assert.deepEqual(columns[5], { name: 'readerComments', desc: 'readerComments' });
  });

  test('columnsForType returns attribute names as expected when records have different attribute values', function(assert) {
    const readerComments = this.store.peekAll('com.example.bookstore.ReaderComment');
    const columns = this._m3debugAdapter.columnsForType(readerComments);

    assert.equal(columns.length, 5, 'A column is added for each attribute on the record');
    assert.deepEqual(columns[0], { name: 'id', desc: 'id' });
    assert.deepEqual(columns[1], { name: 'commenter', desc: 'commenter' });
    assert.deepEqual(columns[2], { name: 'body', desc: 'body' });
    assert.deepEqual(columns[3], { name: 'parts', desc: 'parts' });
    assert.deepEqual(columns[4], { name: 'metadata', desc: 'metadata' });
  });

  test('getRecordColumnValues returns attribute values as expected when records exist', function(assert) {
    const bookstore = this.store.peekRecord(BOOK_MODEL_TYPE, 'urn:bookstore:1');
    const bookValuesObject = this._m3debugAdapter.getRecordColumnValues(bookstore);
    const readerComment = this.store.peekRecord(
      'com.example.bookstore.ReaderComment',
      'urn:comment:2'
    );
    const readerValuesObject = this._m3debugAdapter.getRecordColumnValues(readerComment);

    assert.deepEqual(
      bookValuesObject,
      {
        id: 'urn:bookstore:1',
        $type: BOOK_MODEL_TYPE,
        name: 'The Birth of Britain',
        author: 'urn:author:1',
        pubDate: 'April 2005',
        readerComments: ['urn:comment:1', 'urn:comment:2'],
      },
      'Object returned contains column to value mapping'
    );

    assert.deepEqual(
      readerValuesObject,
      {
        commenter: {
          $type: 'com.example.bookstore.Commenter',
          name: 'Some Other User',
        },
        id: 'urn:comment:2',
        metadata: {
          avatar: '{"logo":"test.png"}',
          commentLikedBy: '["urn:author:1","urn:author:2"]',
        },
        parts: [
          {
            value: '{"text":"Really enjoyed this book"}',
          },
          {
            value: '["A lot"]',
          },
        ],
      },
      'Object returned contains stringified values for deeply nested data'
    );
  });

  test('getRecords returns list of records for a specific model type', function(assert) {
    const records = this._m3debugAdapter.getRecords(BOOK_MODEL_TYPE);
    assert.equal(
      get(records, 'modelName'),
      'com.example.bookstore.book',
      'Correct list of models is returned'
    );
    assert.equal(get(records, 'length'), 1, 'Correct number of models is returned');
  });

  test('wrapModelType returns wrapper object that includes record information', function(assert) {
    const wrappedModelType = this._m3debugAdapter.wrapModelType(BOOK_MODEL_TYPE);

    assert.deepEqual(
      this.wrappedModelTypeObject,
      wrappedModelType,
      'Wrapped model information is returned as expected'
    );
  });
});
