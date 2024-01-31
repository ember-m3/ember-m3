import { module, test, skip } from 'qunit';
import sinon from 'sinon';
import { setupTest } from 'ember-qunit';
import { settled } from '@ember/test-helpers';
import { capitalize, underscore } from '@ember/string';
import { A } from '@ember/array';
import DefaultSchema from 'ember-m3/services/m3-schema';
import { HAS_DEBUG_PACKAGE, HAS_MODEL_PACKAGE } from 'ember-m3/-infra/packages';
import require from 'require';
import { DEBUG } from '@glimmer/env';

let InteropDebugAdapter;

if (DEBUG) {
  InteropDebugAdapter = require('ember-m3/adapters/interop-debug-adapter').default;
}

let Model, attr;
if (HAS_MODEL_PACKAGE) {
  let ModelPackage = require('@ember-data/model');
  Model = ModelPackage.default;
  attr = ModelPackage.attr;
} else {
  let DSPackage = require('ember-data').default;
  Model = DSPackage.Model;
  attr = DSPackage.attr;
}

const BOOK_MODEL_TYPE = 'com.example.bookstore.Book';
const NEW_MODEL_TYPE = 'com.example.newModel';
const NEW_MODEL_DATA = {
  data: {
    id: 'urn:model:1',
    type: 'com.example.newModel',
    attributes: {
      $type: 'com.example.newModel',
      name: 'This is a new model',
    },
  },
};

const generateM3Columns = (columnArray) =>
  columnArray.map((attribute) => ({ name: attribute, desc: attribute }));

const generateDSColumns = (columnArray) =>
  columnArray.map((attribute) => {
    const desc = capitalize(underscore(attribute).replace(/_/g, ' ').trim());
    return { name: attribute, desc };
  });

if (DEBUG) {
  module('integration/interop-debug-adapter', function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
      this.sinon = sinon.createSandbox();

      this.Publisher = Model.extend({
        name: attr('string'),
        foundedDate: attr('string'),
      });

      this.Publisher.toString = () => 'Publisher';
      this.owner.register('model:publisher', this.Publisher);

      this.Genre = Model.extend({
        name: attr('string'),
        description: attr('string'),
      });

      this.Genre.toString = () => 'Genre';
      this.owner.register('model:genre', this.Genre);

      this.owner.register(
        'service:m3-schema',
        class TestSchema extends DefaultSchema {
          computeAttribute(key, value, modelName, schemaInterface) {
            let refValue = schemaInterface.getAttr(`*${key}`);
            if (typeof refValue === 'string') {
              return schemaInterface.reference({
                type: null,
                id: refValue,
              });
            } else if (Array.isArray(refValue)) {
              return schemaInterface.reference(
                refValue.map((id) => ({
                  type: null,
                  id,
                }))
              );
            }

            return undefined;
          }
          includesModel(modelName) {
            return /^com\.example\./.test(modelName);
          }
        }
      );

      this.owner.register(
        'data-adapter:main',
        class ExtendedInteropDataAdapter extends InteropDebugAdapter {
          init() {
            super.init(...arguments);
            // This pattern is to ensure @ember-data/model types are being catalogued correctly in the test environment:
            // https://github.com/emberjs/ember.js/blob/91656e1154afe39791514cbe937ada954eab8d11/packages/%40ember/-internals/extension-support/tests/data_adapter_test.js#L18
            this.containerDebugAdapter = {
              canCatalogEntriesByType() {
                return true;
              },
              catalogEntriesByType() {
                return A(['publisher', 'genre']);
              },
            };
          }
        }
      );

      this.interopDebugAdapter = this.owner.lookup('data-adapter:main');
      this.store = this.owner.lookup('service:store');

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
      });

      this.store.push({
        data: {
          id: 'urn:publisher:1',
          type: 'publisher',
          attributes: {
            name: 'Random House',
            foundedDate: 'December 1927',
          },
        },
      });
    });

    hooks.afterEach(function () {
      this.sinon.restore();
    });

    test('It handles adding new types dynamically', async function (assert) {
      this.interopDebugAdapter.addedType = this.sinon.stub();

      this.owner.lookup('service:m3-schema').watchModelTypes = true;
      this.store.pushPayload(NEW_MODEL_TYPE, NEW_MODEL_DATA);

      await settled();
      assert.ok(
        this.interopDebugAdapter.addedType.calledWithExactly('com.example.new-model'),
        'addedType is called when new model types are pushed into the store'
      );
    });

    // TODO: This began failing after https://github.com/emberjs/ember.js/pull/19584 landed on ember-source's LTS channel
    // More context in https://github.com/hjdivad/ember-m3/issues/1146
    skip('watchModelTypes correctly watches both m3 and @ember-data/model records', async function (assert) {
      assert.expect(HAS_DEBUG_PACKAGE ? 7 : 6);

      let typesAddedCallCount = 0;
      let typesUpdatedCallCount = 0;
      const genreClass = this.owner.factoryFor('model:genre').class;
      const m3TypesAdded = [
        {
          name: 'com.example.bookstore.book',
          count: 1,
          columns: generateM3Columns([
            'id',
            '$type',
            'name',
            'author',
            'pubDate',
            'readerComments',
          ]),
          object: 'com.example.bookstore.book',
        },
      ];

      const dsTypesAdded1 = [
        {
          name: 'publisher',
          count: 1,
          columns: generateDSColumns(['id', 'name', 'foundedDate']),
          object: this.owner.factoryFor('model:publisher').class,
        },
      ];

      const dsTypesAdded2 = [
        {
          columns: generateDSColumns(['id', 'name', 'description']),
          count: 0,
          name: 'genre',
          object: genreClass,
        },
      ];

      const newM3TypesAdded = [
        {
          name: 'com.example.new-model',
          count: 1,
          columns: generateM3Columns(['id', '$type', 'name']),
          object: 'com.example.new-model',
        },
      ];

      const newDSTypesUpdated = [
        {
          columns: generateDSColumns(['id', 'name', 'description']),
          count: 1,
          name: 'genre',
          object: genreClass,
        },
      ];

      const m3TypesUpdated = [
        {
          name: 'com.example.bookstore.book',
          count: 2,
          columns: generateM3Columns([
            'id',
            '$type',
            'name',
            'author',
            'pubDate',
            'readerComments',
          ]),
          object: 'com.example.bookstore.book',
        },
      ];

      const newM3TypesUpdated = [
        {
          name: 'com.example.new-model',
          count: 0,
          columns: generateM3Columns(['id']),
          object: 'com.example.new-model',
        },
      ];

      const typesAdded = (typesToSend) => {
        typesAddedCallCount++;
        switch (typesAddedCallCount) {
          case 1:
            // triggered due pushPayload in beforeEach
            return assert.deepEqual(
              typesToSend,
              m3TypesAdded,
              'Added Case 1: Correct type object passed into typesAdded initially for m3 record types'
            );
          case 2:
            // triggered due to push in beforeEach
            return assert.deepEqual(
              typesToSend,
              HAS_DEBUG_PACKAGE ? dsTypesAdded1 : dsTypesAdded1.concat(dsTypesAdded2),
              'Added Case 2: Correct type object passed into typesAdded for @ember-data/model record types'
            );
          case 3:
            return assert.deepEqual(
              typesToSend,
              newM3TypesAdded,
              'Added Case 3: Correct type object passed into typesAdded for new m3 record types'
            );
          case 4:
            if (HAS_DEBUG_PACKAGE) {
              return assert.deepEqual(
                typesToSend,
                dsTypesAdded2,
                'Added Case 4: Correct type object passed into typesAdded for @ember-data/model record types'
              );
            } else {
              // pre-the debug package EmberData would add all types by scanning for models/ so we
              // would never add this type
            }
          // eslint-disable-next-line no-fallthrough
          default:
            throw new Error(`Unexpected typesAdded call`);
        }
      };

      const typesUpdated = (updatedTypesToSend) => {
        typesUpdatedCallCount++;
        switch (typesUpdatedCallCount) {
          case 1:
            return assert.deepEqual(
              updatedTypesToSend,
              newDSTypesUpdated,
              'Update Case 1: Correct type object passed into typesUpdated when new @ember-data/model records are added'
            );
          case 2:
            return assert.deepEqual(
              updatedTypesToSend,
              m3TypesUpdated,
              'Update Case 2: Correct type object passed into typesUpdated initially for m3 record types'
            );
          case 3:
            return assert.deepEqual(
              updatedTypesToSend,
              newM3TypesUpdated,
              'Update Case 3: Correct type object passed into typesUpdated for new m3 record types'
            );
          default:
            throw new Error(`Unexpected typesUpdated call`);
        }
      };

      this.interopDebugAdapter.watchModelTypes(typesAdded, typesUpdated);

      // typesAdded case 3
      this.store.pushPayload(NEW_MODEL_TYPE, NEW_MODEL_DATA);
      await settled();

      // typesUpdated case 1 & typesAdded case 4
      this.store.push({
        data: {
          id: 'urn:genre:1',
          type: 'genre',
          attributes: {
            name: 'Horror',
            description: 'Fiction that will keep you up at night.',
          },
        },
      });

      await settled();

      // typesUpdated case 2
      this.store.pushPayload(BOOK_MODEL_TYPE, {
        data: {
          id: 'urn:bookstore:2',
          type: BOOK_MODEL_TYPE,
          attributes: {
            $type: BOOK_MODEL_TYPE,
            name: 'The Best Book',
            author: 'urn:author:2',
            pubDate: 'Feb 2019',
            readerComments: ['urn:comment:3', 'urn:comment:4'],
          },
        },
      });
      await settled();

      // types updated case 3
      this.store.unloadAll(NEW_MODEL_TYPE);
      await settled();
    });

    test('typesUpdated is called when new m3 and @ember-data/model records are added of an existing type', async function (assert) {
      assert.expect(2);

      let typesUpdatedCallCount = 0;
      const newDSTypesUpdated = [
        {
          name: 'publisher',
          count: 2,
          columns: generateDSColumns(['id', 'name', 'foundedDate']),
          object: this.owner.factoryFor('model:publisher').class,
        },
      ];

      const m3TypesUpdated = [
        {
          name: 'com.example.bookstore.book',
          count: 2,
          columns: generateM3Columns([
            'id',
            '$type',
            'name',
            'author',
            'pubDate',
            'readerComments',
          ]),
          object: 'com.example.bookstore.book',
        },
      ];

      const typesUpdated = (updatedTypesToSend) => {
        typesUpdatedCallCount++;
        switch (typesUpdatedCallCount) {
          case 1:
            return assert.deepEqual(
              updatedTypesToSend,
              m3TypesUpdated,
              'Correct type object passed into typesUpdated for m3 record types'
            );
          case 2:
            return assert.deepEqual(
              updatedTypesToSend,
              newDSTypesUpdated,
              'Correct type object passed into typesUpdated when @ember-data/model records are added'
            );
          default:
            return null;
        }
      };

      this.interopDebugAdapter.watchModelTypes(() => {}, typesUpdated);

      this.store.pushPayload(NEW_MODEL_TYPE, NEW_MODEL_DATA);

      this.store.pushPayload(BOOK_MODEL_TYPE, {
        data: {
          id: 'urn:bookstore:2',
          type: BOOK_MODEL_TYPE,
          attributes: {
            $type: BOOK_MODEL_TYPE,
            name: 'The Best Book',
            author: 'urn:author:2',
            pubDate: 'Feb 2019',
            readerComments: ['urn:comment:3', 'urn:comment:4'],
          },
        },
      });

      this.store.push({
        data: {
          id: 'urn:publisher:2',
          type: 'publisher',
          attributes: {
            name: 'Scholastic',
            foundedDate: 'October 1920',
          },
        },
      });

      await settled();
    });

    test('watchModelTypes keeps track of modelTypes and clears them out on release', async function (assert) {
      const releaseMethod = this.interopDebugAdapter.watchModelTypes(
        () => {},
        () => {}
      );
      assert.deepEqual(
        this.interopDebugAdapter._m3DebugAdapter.seenTypesInAdapter,
        new Set(['com.example.bookstore.book']),
        'seenTypesInAdapter is populated in the m3 debug adapter'
      );

      await releaseMethod();

      assert.deepEqual(
        this.interopDebugAdapter._m3DebugAdapter.seenTypesInAdapter,
        new Set(),
        'seenTypesInAdapter is cleared out in the m3 debug adapter when the release method is called'
      );
    });
  });
}
