import { setupTest } from 'ember-qunit';
import { get } from '@ember/object';
import { settled } from '@ember/test-helpers';
import DebugAdapter from 'ember-m3/adapters/debug-adapter';
import { module, test } from 'qunit';
import sinon from 'sinon';
import DefaultSchema from 'ember-m3/services/m3-schema';

module('integration/debug-adapter', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.sinon = sinon.createSandbox();

    this.store = this.owner.lookup('service:store');
    this.owner.register('data-adapter:main', DebugAdapter);
    this.debugAdapter = this.owner.lookup('data-adapter:main');
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

    this.store.pushPayload('com.example.bookstore.Book', {
      data: {
        id: 'urn:bookstore:1',
        type: 'com.example.bookstore.Book',
        attributes: {
          $type: 'com.example.bookstore.Book',
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
                value: 'Really enjoyed this book',
              },
              {
                value: 'A lot',
              },
            ],
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

  hooks.afterEach(function() {
    this.sinon.restore();
  });

  test('getModelTypes returns a list of model types', function(assert) {
    const modelTypes = this.debugAdapter.getModelTypes();
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
    const bookstore = this.store.peekAll('com.example.bookstore.Book');
    const columns = this.debugAdapter.columnsForType(bookstore);

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
    const columns = this.debugAdapter.columnsForType(readerComments);

    assert.equal(columns.length, 4, 'A column is added for each attribute on the record');
    assert.deepEqual(columns[0], { name: 'id', desc: 'id' });
    assert.deepEqual(columns[1], { name: 'commenter', desc: 'commenter' });
    assert.deepEqual(columns[2], { name: 'body', desc: 'body' });
    assert.deepEqual(columns[3], { name: 'parts', desc: 'parts' });
  });

  test('getRecordColumnValues returns attribute values as expected when records exist', function(assert) {
    const bookstore = this.store.peekRecord('com.example.bookstore.Book', 'urn:bookstore:1');
    const valuesObject = this.debugAdapter.getRecordColumnValues(bookstore);

    assert.deepEqual(
      valuesObject,
      {
        id: 'urn:bookstore:1',
        $type: 'com.example.bookstore.Book',
        name: 'The Birth of Britain',
        author: 'urn:author:1',
        pubDate: 'April 2005',
        readerComments: ['urn:comment:1', 'urn:comment:2'],
      },
      'Object returned contains column to value mapping'
    );
  });

  test('getRecords returns list of records for a specific model type', function(assert) {
    const records = this.debugAdapter.getRecords('com.example.bookstore.Book');
    assert.equal(
      get(records, 'modelName'),
      'com.example.bookstore.book',
      'Correct list of models is returned'
    );
    assert.equal(get(records, 'length'), 1, 'Correct number of models is returned');
  });

  test('It handles adding new types dynamically', async function(assert) {
    this.debugAdapter.addedType = this.sinon.stub();

    this.owner.lookup('service:m3-schema').watchModelTypes = true;

    this.store.pushPayload('com.example.newModel', {
      data: {
        id: 'urn:model:1',
        type: 'com.example.newModel',
        attributes: {
          $type: 'com.example.newModel',
          name: 'This is a new model',
        },
      },
    });
    await settled();

    assert.ok(
      this.debugAdapter.addedType.calledWithExactly('com.example.new-model'),
      'addedType is called when new model types are pushed into the store'
    );
  });

  test('wrapModelType returns wrapper object that includes record information', function(assert) {
    const wrappedModelType = this.debugAdapter.wrapModelType('com.example.bookstore.Book');
    const wrappedModelTypeObject = {
      name: 'com.example.bookstore.Book',
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
      object: 'com.example.bookstore.Book',
    };

    assert.deepEqual(
      wrappedModelTypeObject,
      wrappedModelType,
      'Wrapped model information is returned as expected'
    );
  });
});
