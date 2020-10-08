import MegamorphicModel from 'ember-m3/model';
import EmberObject, { get } from '@ember/object';
import { module, test } from 'qunit';
import { run } from '@ember/runloop';
import {
  setupTestPerSchema,
  BOOK_CLASS_PATH,
  NORM_BOOK_CLASS_PATH,
  BOOK_EXCERPT_PROJECTION_CLASS_PATH,
  NORM_BOOK_EXCERPT_PROJECTION_CLASS_PATH,
} from './common';

for (let { name, setupTest } of setupTestPerSchema()) {
  module(`unit/projections/cache-consistency: ${name}`, function (hooks) {
    setupTest(hooks);

    test(`store.peekRecord() will only return a projection or base-record if it has been fetched`, function (assert) {
      assert.expect(4);

      const UNFETCHED_PROJECTION_ID = 'isbn:9780439708180';
      const FETCHED_PROJECTION_ID = 'isbn:9780439708181';
      let { store } = this;

      /*
        populate the store with a starting state of
         a base-record for the UNFETCHED_PROJECTION_ID and a projected-record
         for the FETCHED_PROJECTION_ID

        remember:
          the FETCHED_PROJECTION_ID is the unfetched base-record
          the UNFETCHED_PROJECTION_ID is the already fetched base-record
        */
      run(() => {
        store.push({
          data: {
            type: BOOK_CLASS_PATH,
            id: UNFETCHED_PROJECTION_ID,
            attributes: {
              title: 'Carry On! Mr. Bowditch',
            },
          },
        });
        store.push({
          data: {
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            id: FETCHED_PROJECTION_ID,
            attributes: {
              title: `Mr. Popper's Penguins`,
            },
          },
        });
      });

      let projection = store.peekRecord(
        BOOK_EXCERPT_PROJECTION_CLASS_PATH,
        UNFETCHED_PROJECTION_ID
      );

      assert.equal(
        projection,
        null,
        'The unfetched projection with a fetched base-record is unfound by peekRecord()'
      );

      projection = store.peekRecord(BOOK_EXCERPT_PROJECTION_CLASS_PATH, FETCHED_PROJECTION_ID);
      assert.ok(
        projection instanceof MegamorphicModel,
        'The fetched projection is found by peekRecord()'
      );

      let record = store.peekRecord(BOOK_CLASS_PATH, UNFETCHED_PROJECTION_ID);
      assert.ok(
        record instanceof MegamorphicModel,
        'The fetched base-record is found by peekRecord()'
      );

      record = store.peekRecord(BOOK_CLASS_PATH, FETCHED_PROJECTION_ID);

      assert.equal(
        record,
        null,
        'The unfetched base-record with a fetched projection is unfound by peekRecord()'
      );
    });

    test(`store.findRecord() will only fetch a projection or base-model if it has not been fetched previously`, function (assert) {
      assert.expect(12);

      const UNFETCHED_PROJECTION_ID = 'isbn:9780439708180';
      const FETCHED_PROJECTION_ID = 'isbn:9780439708181';
      let { store } = this;

      let expectedFindRecordModelName;
      let trueFindRecordModelName;
      let expectedFindRecordId;
      let findRecordCallCount = 0;

      this.owner.register(
        'adapter:-ember-m3',
        EmberObject.extend({
          findRecord(store, modelClass, id, snapshot) {
            findRecordCallCount++;
            assert.equal(
              snapshot.modelName,
              expectedFindRecordModelName,
              'findRecord snapshot has the correct modelName'
            );
            assert.equal(id, expectedFindRecordId, 'findRecord received the correct id');

            return Promise.resolve({
              data: {
                id: expectedFindRecordId,
                type: trueFindRecordModelName,
                attributes: {
                  title: 'Carry on! Mr. Bowditch',
                },
              },
            });
          },

          shouldReloadRecord() {
            return false;
          },

          shouldBackgroundReloadRecord() {
            return false;
          },
        })
      );

      /*
        populate the store with a starting state of
         a base-record for the UNFETCHED_PROJECTION_ID and a projected-record
         for the FETCHED_PROJECTION_ID

        remember:
          the FETCHED_PROJECTION_ID is the unfetched base-record
          the UNFETCHED_PROJECTION_ID is the already fetched base-record
        */
      run(() => {
        store.push({
          data: {
            type: BOOK_CLASS_PATH,
            id: UNFETCHED_PROJECTION_ID,
            attributes: {
              title: 'Carry On! Mr. Bowditch',
            },
          },
        });
        store.push({
          data: {
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            id: FETCHED_PROJECTION_ID,
            attributes: {
              title: `Mr. Popper's Penguins`,
            },
          },
        });
      });

      /*
        Setup findRecord params for projection requests

        remember:
          the FETCHED_PROJECTION_ID is the unfetched base-record
          the UNFETCHED_PROJECTION_ID is the already fetched base-record
       */
      findRecordCallCount = 0;
      expectedFindRecordModelName = NORM_BOOK_EXCERPT_PROJECTION_CLASS_PATH;
      trueFindRecordModelName = BOOK_EXCERPT_PROJECTION_CLASS_PATH;
      expectedFindRecordId = UNFETCHED_PROJECTION_ID;

      run(() => {
        store
          .findRecord(BOOK_EXCERPT_PROJECTION_CLASS_PATH, FETCHED_PROJECTION_ID)
          .then((model) => {
            assert.equal(
              get(model, 'id'),
              FETCHED_PROJECTION_ID,
              'we retrieved the already fetched the model'
            );
            assert.equal(findRecordCallCount, 0, 'We did not re-fetch');
          });
      });

      run(() => {
        store
          .findRecord(BOOK_EXCERPT_PROJECTION_CLASS_PATH, UNFETCHED_PROJECTION_ID)
          .then((model) => {
            assert.equal(get(model, 'id'), UNFETCHED_PROJECTION_ID, 'we fetched the model');
            assert.equal(findRecordCallCount, 1, 'We made a single request');
          });
      });

      /*
        Setup findRecord params for base-record requests,

        remember:
          the FETCHED_PROJECTION_ID is the unfetched base-record
          the UNFETCHED_PROJECTION_ID is the already fetched base-record
      */
      findRecordCallCount = 0;
      expectedFindRecordModelName = NORM_BOOK_CLASS_PATH;
      trueFindRecordModelName = BOOK_CLASS_PATH;
      expectedFindRecordId = FETCHED_PROJECTION_ID;

      run(() => {
        store.findRecord(BOOK_CLASS_PATH, UNFETCHED_PROJECTION_ID).then((model) => {
          assert.equal(
            get(model, 'id'),
            UNFETCHED_PROJECTION_ID,
            'we retrieved the already fetched the model'
          );
          assert.equal(findRecordCallCount, 0, 'We did not re-fetch');
        });
      });

      run(() => {
        store.findRecord(BOOK_CLASS_PATH, FETCHED_PROJECTION_ID).then((model) => {
          assert.equal(get(model, 'id'), FETCHED_PROJECTION_ID, 'we fetched the model');
          assert.equal(findRecordCallCount, 1, 'We made a single request');
        });
      });
    });

    test(`store.peekAll() will not return partial records`, function (assert) {
      let { store } = this;

      run(() => {
        // push a base type
        store.push({
          data: {
            id: '1',
            type: BOOK_CLASS_PATH,
            attributes: {
              title: 'Hello World',
            },
          },
        });

        // push a correspnding projection to ensure it does not change
        // the state of a pre-existing base model
        store.push({
          data: {
            id: '1',
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {
              title: 'Hello World',
            },
          },
        });

        // push the projection with non-existing base
        store.push({
          data: {
            id: '2',
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {
              title: 'Goodnight Moon',
            },
          },
        });
      });

      let recordArray = store.peekAll(BOOK_CLASS_PATH);

      assert.equal(get(recordArray, 'length'), 1, 'We only find one record');
      assert.equal(get(recordArray.objectAt(0), 'id'), '1', 'We find the expected record');
    });

    test('Projections proxy whitelisted attributes to a base-record', function (assert) {
      let { store } = this;
      const BOOK_ID = 'isbn:9780439708181';
      const BOOK_TITLE = 'Adventures in Wonderland';
      const BOOK_AUTHOR = 'Lewis Carroll';
      const BOOK_DESCRIPTION = `Don't get rabbit holed!`;

      let baseRecord;
      let projectedRecord;

      run(() => {
        // intentionally missing 'title'
        baseRecord = store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_CLASS_PATH,
            attributes: {
              author: BOOK_AUTHOR,
              description: BOOK_DESCRIPTION, // description is not whitelisted
            },
          },
        });

        // intentionally missing 'author'
        projectedRecord = store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {
              title: BOOK_TITLE,
            },
          },
        });
      });

      assert.equal(get(baseRecord, 'id'), BOOK_ID, 'base-record has the proper id');
      assert.equal(get(baseRecord, 'author'), BOOK_AUTHOR, 'base-record has author');
      assert.equal(get(baseRecord, 'title'), BOOK_TITLE, 'base-record has title');
      assert.equal(get(baseRecord, 'description'), BOOK_DESCRIPTION, 'base-record has description');

      assert.equal(get(projectedRecord, 'id'), BOOK_ID, 'projected-record has the proper id');
      assert.equal(get(projectedRecord, 'author'), BOOK_AUTHOR, 'projected-record has author');
      assert.equal(get(projectedRecord, 'title'), BOOK_TITLE, 'projected-record has title');
      assert.equal(
        get(projectedRecord, 'description'),
        undefined,
        'projected-record has no description as it is not whitelisted'
      );
    });
  });
}
