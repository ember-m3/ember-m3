import { module, test, skip } from 'qunit';
import { settled } from 'ember-test-helpers';
import EmberObject, { get, set } from '@ember/object';
import { run } from '@ember/runloop';
import {
  setupTestPerSchema,
  BOOK_CLASS_PATH,
  BOOK_EXCERPT_PROJECTION_CLASS_PATH,
  BOOK_PREVIEW_PROJECTION_CLASS_PATH,
  NORM_BOOK_PREVIEW_PROJECTION_CLASS_PATH,
  PUBLISHER_CLASS,
  PROJECTED_PUBLISHER_CLASS,
} from './common';

for (let { name, setupTest } of setupTestPerSchema()) {
  module(`unit/projections/writing: ${name}`, function (hooks) {
    setupTest(hooks);

    const BOOK_ID = 'isbn:123';
    const BOOK_TITLE_1 = 'Alice in Wonderland';
    const BOOK_TITLE_2 = 'Alice Through the Looking Glass';
    const BOOK_CHAPTER_1 = 'Down the Rabbit-Hole';
    const BOOK_CHAPTER_2 = 'Looking-Glass House';
    const BOOK_AUTHOR_NAME_1 = 'Lewis Carol';
    const BOOK_AUTHOR_NAME_2 = 'J.K. Rowling';

    test('independently created projections of the same base-type but no ID do not share their data', function (assert) {
      let projectedPreview = run(() =>
        this.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
          title: BOOK_TITLE_1,
        })
      );
      let projectedExcerpt = run(() =>
        this.store.createRecord(BOOK_EXCERPT_PROJECTION_CLASS_PATH, {
          title: BOOK_TITLE_2,
        })
      );

      assert.equal(
        get(projectedPreview, 'title'),
        BOOK_TITLE_1,
        'Expected title of preview projection to be correct'
      );
      assert.equal(
        get(projectedExcerpt, 'title'),
        BOOK_TITLE_2,
        'Expected title of excerpt projection to be correct'
      );
    });

    test('independently created projections of the same projection-type but no ID do not share their data', function (assert) {
      let projectedPreview1 = run(() =>
        this.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
          title: BOOK_TITLE_1,
        })
      );
      let projectedPreview2 = run(() =>
        this.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
          title: BOOK_TITLE_2,
        })
      );

      assert.equal(
        get(projectedPreview1, 'title'),
        BOOK_TITLE_1,
        'Expected title of preview projection to be correct'
      );
      assert.equal(
        get(projectedPreview2, 'title'),
        BOOK_TITLE_2,
        'Expected title of the second preview projection to be correct'
      );
    });

    test('independently created projections of the same base-type and ID share their data', function (assert) {
      let projectedPreview = run(() =>
        this.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
          id: BOOK_ID,
          title: BOOK_TITLE_1,
        })
      );
      let projectedExcerpt = run(() =>
        this.store.createRecord(BOOK_EXCERPT_PROJECTION_CLASS_PATH, {
          id: BOOK_ID,
          title: BOOK_TITLE_2,
        })
      );

      assert.equal(
        get(projectedPreview, 'title'),
        BOOK_TITLE_2,
        'Expected title of preview projection to be correct'
      );
      assert.equal(
        get(projectedExcerpt, 'title'),
        BOOK_TITLE_2,
        'Expected title of excerpt projection to be correct'
      );

      run(() => {
        set(projectedExcerpt, 'title', BOOK_TITLE_1);
      });

      assert.equal(
        get(projectedPreview, 'title'),
        BOOK_TITLE_1,
        'Expected title of preview projection to be updated'
      );
      assert.equal(
        get(projectedExcerpt, 'title'),
        BOOK_TITLE_1,
        'Expected title of excerpt projection to be updated'
      );
    });

    test('independently creating projections of the same projection-type and ID is not allowed', function (assert) {
      run(() => {
        this.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
          id: BOOK_ID,
        });
        assert.expectAssertion(
          () => {
            this.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
              id: BOOK_ID,
            });
          },
          /has already been used/,
          'Expected create record for same projection and ID to throw an error'
        );
      });
    });

    test('can create and save a projection', async function (assert) {
      let createRecordCalls = 0;

      this.owner.register(
        'adapter:-ember-m3',
        EmberObject.extend({
          createRecord(store, type, snapshot) {
            createRecordCalls++;
            // some assertions
            assert.equal(
              get(snapshot, 'modelName'),
              NORM_BOOK_PREVIEW_PROJECTION_CLASS_PATH,
              'Expected createRecord to be called for the projection type'
            );

            return Promise.resolve({
              data: {
                id: BOOK_ID,
                type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
                attributes: {},
              },
            });
          },
        })
      );

      let projectedPreview = this.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
        title: BOOK_TITLE_1,
      });

      await projectedPreview.save();

      assert.equal(
        get(projectedPreview, 'isNew'),
        false,
        'Expected the projection to be marked as saved'
      );
      assert.equal(
        get(projectedPreview, 'id'),
        BOOK_ID,
        'Expected the new record to have picked up the returned ID'
      );
      assert.equal(
        createRecordCalls,
        1,
        'Expected `createRecord` to have been called exactly once.'
      );
    });

    test('new projections are correctly cached after save', async function (assert) {
      this.owner.register(
        'adapter:-ember-m3',
        EmberObject.extend({
          createRecord() {
            return Promise.resolve({
              data: {
                id: BOOK_ID,
                type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
                attributes: {},
              },
            });
          },
        })
      );

      let projectedPreview = this.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
        title: BOOK_TITLE_1,
      });
      await projectedPreview.save();

      let peekedPreview = run(() => {
        return this.store.peekRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, BOOK_ID);
      });

      assert.equal(
        get(peekedPreview, 'title'),
        BOOK_TITLE_1,
        'Empty attributes in the save response preserved our in-flight attributes'
      );
      assert.ok(
        projectedPreview === peekedPreview,
        'Expected the new preview projection to be in the cache after save'
      );
    });

    test('newly created and saved projections can receive updates', async function (assert) {
      this.owner.register(
        'adapter:-ember-m3',
        EmberObject.extend({
          createRecord() {
            return Promise.resolve({
              data: {
                id: BOOK_ID,
                type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
                attributes: {},
              },
            });
          },
        })
      );

      let projectedPreview = this.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
        title: BOOK_TITLE_1,
        author: {
          name: BOOK_AUTHOR_NAME_1,
        },
      });

      // reify the nested model
      get(projectedPreview, 'author.name');

      await projectedPreview.save();

      // instead of involving adapter, just push the data and check things were correctly updated
      run(() => {
        this.store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {
              title: BOOK_TITLE_2,
              author: {
                name: BOOK_AUTHOR_NAME_2,
              },
            },
          },
        });
      });

      assert.equal(
        get(projectedPreview, 'title'),
        BOOK_TITLE_2,
        'Expected preview projection to have received updated title'
      );
      assert.equal(
        get(projectedPreview, 'author.name'),
        BOOK_AUTHOR_NAME_2,
        'Expected preview projection to have received updated author.name'
      );
    });

    skip('we cannot create a new projection when existing recordData exists', function (assert) {
      // pre-populate the store with a different projection and base-data for the ID we will attempt to create.
      run(() => {
        this.store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {
              title: BOOK_TITLE_2,
            },
          },
        });
      });

      // we want to test this but we may tweak the error thrown once we actually implement.
      assert.throws(
        () => {
          this.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
            id: BOOK_ID,
            title: BOOK_TITLE_1,
          });
        },
        /You cannot create a new projection for a pre-existing record/,
        '[TODO UPDATE THIS ASSERT] We throw the right assertion.'
      );
    });

    test('.changedAttributes on a projection returns all changed properties', function (assert) {
      let projectedExcerpt = run(() => {
        return this.store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {
              title: BOOK_TITLE_1,
              author: {
                name: BOOK_AUTHOR_NAME_1,
              },
            },
          },
        });
      });
      let projectedPreview = run(() => {
        return this.store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
            attributes: {},
          },
        });
      });

      run(() => {
        set(projectedPreview, 'title', BOOK_TITLE_2);
        set(projectedPreview, 'author.name', BOOK_AUTHOR_NAME_2);
      });

      assert.deepEqual(
        projectedExcerpt.changedAttributes(),
        {
          title: [BOOK_TITLE_1, BOOK_TITLE_2],
          author: {
            name: [BOOK_AUTHOR_NAME_1, BOOK_AUTHOR_NAME_2],
          },
        },
        'Expected changed attributes to be correctly returned'
      );
    });

    test('.rollbackAttributes on a projection sets the model attributes back to its original state', function (assert) {
      let projectedExcerpt = run(() => {
        return this.store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {
              title: BOOK_TITLE_1,
              author: {
                name: BOOK_AUTHOR_NAME_1,
              },
            },
          },
        });
      });
      run(() => {
        this.store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_CLASS_PATH,
            attributes: {
              title: BOOK_TITLE_1,
            },
          },
        });
      });

      assert.notOk(
        projectedExcerpt.get('isDirty'),
        'The projection should not be dirty on its initial state'
      );
      assert.deepEqual(
        projectedExcerpt.changedAttributes(),
        {},
        'The projection should not have changed attributes on its initial state'
      );
      run(() => {
        set(projectedExcerpt, 'title', BOOK_TITLE_2);
      });
      assert.ok(
        projectedExcerpt.get('isDirty'),
        'The projection should be dirty after mutating its state'
      );
      assert.deepEqual(
        projectedExcerpt.changedAttributes(),
        {
          title: [BOOK_TITLE_1, BOOK_TITLE_2],
        },
        'The projection title was registered as a changed attribute after it was mutated'
      );

      projectedExcerpt.rollbackAttributes();
      assert.notOk(
        projectedExcerpt.get('isDirty'),
        'The projection should not be dirty after rolling back its attributes'
      );
      assert.deepEqual(
        projectedExcerpt.changedAttributes(),
        {},
        'The projection attributes went back to their original state after calling rollbackAttributes'
      );
    });

    test('.isDirty on a projection is true after updating its state', function (assert) {
      let projectedExcerpt = run(() => {
        return this.store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {
              title: BOOK_TITLE_1,
              author: {
                name: BOOK_AUTHOR_NAME_1,
              },
            },
          },
        });
      });
      // Base record
      run(() => {
        this.store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_CLASS_PATH,
            attributes: {
              title: BOOK_TITLE_1,
            },
          },
        });
      });

      assert.notOk(
        projectedExcerpt.get('isDirty'),
        'The projection should not be dirty on its initial state'
      );
      run(() => {
        set(projectedExcerpt, 'title', BOOK_TITLE_2);
      });
      assert.ok(
        projectedExcerpt.get('isDirty'),
        'The projection should be dirty after mutating its state'
      );
    });

    test('.debugJSON returns expected JSON for projections', function (assert) {
      const expectedJSON = {
        title: 'Alice in Wonderland',
        author: {
          name: 'Lewis Carol',
        },
      };

      run(() => {
        this.store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {
              title: BOOK_TITLE_1,
              author: {
                name: BOOK_AUTHOR_NAME_1,
              },
            },
          },
        });
      });
      const bookRecord = this.store.peekRecord(BOOK_EXCERPT_PROJECTION_CLASS_PATH, BOOK_ID);

      assert.deepEqual(bookRecord.debugJSON(), expectedJSON, 'The JSON returned is correct');
    });

    skip('update and save of a projection does not touch non-whitelisted properties', function (assert) {
      let updateRecordCalls = 0;
      this.owner.register(
        'adapter:-ember-m3',
        EmberObject.extend({
          updateRecord(store, type, snapshot) {
            updateRecordCalls++;

            assert.equal(
              get(snapshot, 'modelName'),
              BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              'Expected update request to be made for the projection'
            );

            return Promise.resolve();
          },
        })
      );

      let baseModel = run(() => {
        return this.store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_CLASS_PATH,
            attributes: {
              title: BOOK_TITLE_1,
              chapter: BOOK_CHAPTER_1,
            },
          },
        });
      });
      let projectedExcerpt = run(() => {
        return this.store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {},
          },
        });
      });

      run(() => {
        set(baseModel, 'title', BOOK_TITLE_2);
        set(baseModel, 'chapter-1', BOOK_CHAPTER_2);
      });

      assert.equal(
        get(projectedExcerpt, '_internalModel.currentState.isDirty'),
        true,
        'Expected projection to be made dirty'
      );
      assert.equal(
        get(baseModel, '_internalModel.currentState.isDirty'),
        true,
        'Expected base model to be made dirty'
      );

      run(() => {
        projectedExcerpt.save();
      });

      assert.equal(updateRecordCalls, 1, 'Expected one updateRecord call to be made');
      assert.equal(
        get(projectedExcerpt, '_internalModel.currentState.isDirty'),
        false,
        'The projection should have been saved'
      );
      assert.equal(
        get(baseModel, '_internalModel.currentState.isDirty'),
        true,
        'The base model should still be dirty'
      );
    });

    test('projected nested models do not produce false notifications', async function (assert) {
      // TODO: force a nested resolve to go thorugh `getServerAttr` -. nestdrecorddata.pushdata as in addon/resolve-attribute-util
      // TODO: we need 2 levels of nesting to trigger the bug
      // only need projection at the top i think
      // add a property (projection or otherwise) to author
      // TODO: then try to create a record or write and have it fail due to unflushed batch notifications

      let projectionBook = this.store.push({
        data: {
          id: BOOK_ID,
          type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
          attributes: {},
        },
        included: [
          {
            id: BOOK_ID,
            type: BOOK_CLASS_PATH,
            attributes: {
              author: {
                name: 'Winston Churchill',
                type: 'author',
                bestBook: {
                  title: 'not sure',
                },
              },
            },
          },
        ],
      });
      await settled();

      let book = this.store.peekRecord(BOOK_CLASS_PATH, BOOK_ID);
      debugger;
      book.get('author.bestBook.title');

      this.store.push({
        data: {
          id: BOOK_ID,
          type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
          attributes: {},
        },
        included: [
          {
            id: BOOK_ID,
            type: BOOK_CLASS_PATH,
            attributes: {
              author: {
                bestBook: {
                  title: 'A History of the English Speaking Peoples',
                },
              },
            },
          },
        ],
      });
      debugger;
      projectionBook.get('author.bestBook.title');

      // trigger no changes assertion
      projectionBook.set('author.name', 'Sir Winston Churchill');
      await settled();

      assert.ok(true);
    });

    test('Updating an embedded object property to null can still be updated again', function (assert) {
      const BOOK_ID = 'isbn:9780439708181';
      const AUTHOR_NAME = 'Lewis Carroll';
      const NEW_AUTHOR_NAME = 'J.K. Rowling';

      let { store } = this;

      let baseRecord;
      let projectedExcerpt;

      run(() => {
        baseRecord = store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_CLASS_PATH,
            attributes: {
              author: {
                name: AUTHOR_NAME,
              },
            },
          },
        });

        projectedExcerpt = store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {},
          },
        });
      });

      // force nested model to be created
      projectedExcerpt.get('author');

      // reset author to null
      run(() => {
        store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {
              author: null,
            },
          },
        });
      });

      // update author again
      run(() => {
        store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {
              author: {
                name: NEW_AUTHOR_NAME,
              },
            },
          },
        });
      });

      assert.equal(
        get(baseRecord, 'author.name'),
        NEW_AUTHOR_NAME,
        'base-record has the correct author.name'
      );
      assert.equal(
        get(projectedExcerpt, 'author.name'),
        NEW_AUTHOR_NAME,
        'excerpt has the correct author.name'
      );
    });

    test('Updating an embedded object property to null can still be updated again', function (assert) {
      const BOOK_ID = 'isbn:9780439708181';
      const AUTHOR_NAME = 'Lewis Carroll';
      const NEW_AUTHOR_NAME = 'J.K. Rowling';

      let { store } = this;

      let projectedBook;

      run(() => {
        store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_CLASS_PATH,
            attributes: {
              author: {
                name: AUTHOR_NAME,
              },
              similarAuthors: [{ type: 'someType', name: NEW_AUTHOR_NAME }],
            },
          },
        });

        projectedBook = store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
            attributes: {},
          },
        });
      });

      let similarAuthors = projectedBook.get('similarAuthors');
      assert.equal(
        similarAuthors.objectAt(0).get('name'),
        NEW_AUTHOR_NAME,
        'Starts off with correct author name'
      );
      similarAuthors.removeAt(0);
      similarAuthors.pushObject({
        type: 'someType',
        location: 'San Francisco',
      });
      let newAuthor = projectedBook.get('similarAuthors').objectAt(0);
      assert.equal(newAuthor.get('location'), 'San Francisco', 'Has the correct new property');
      assert.equal(newAuthor.get('name'), null, 'Does not have the old data');
    });

    module('Update projection property with resolved value', function (hooks) {
      // properties for use for initial state
      const BOOK_ID = 'isbn:9780439708181';
      const PUBLISHER_ID = 'publisher-abc123';
      const PUBLISHER_ID_NEW = 'publisher-abc123_new';
      const PUBLISHER_URN = `urn:${PUBLISHER_CLASS}:${PUBLISHER_ID}`;

      // intial old values
      const PUBLISHER_NAME = 'MACMILLAN';
      const PUBLISHER_LOCATION = 'Isle of Arran, Scotland';
      const PUBLISHER_OWNER = 'Daniel and Alexander Macmillan';

      // properties for use post-patch
      const NEW_PUBLISHER_NAME = 'MACMILLAN NEW';
      const NEW_PUBLISHER_LOCATION = 'London, England';
      const NEW_PUBLISHER_OWNER = 'Holtzbrinck Publishing Group';
      const NEW_PUBLISHER_URN = `urn:${PUBLISHER_CLASS}:${PUBLISHER_ID_NEW}`;

      hooks.beforeEach(function () {
        //Adding .setAttribute hook in schema
        this.schemaManager.get('schema').setAttribute = function (
          modelName,
          attr,
          value,
          schemaInterface
        ) {
          const baseModelName = this.computeBaseModelName(modelName);
          if (
            baseModelName &&
            attr === 'publisher' &&
            value &&
            value.constructor &&
            value.constructor.isModel
          ) {
            schemaInterface.setAttr(attr, NEW_PUBLISHER_URN);
            return;
          }

          schemaInterface.setAttr(attr, value);
        };

        let { store } = this;

        let baseRecord;
        let projectedExcerpt;
        let projectedPreview;

        run(() => {
          baseRecord = store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_CLASS_PATH,
              attributes: {
                publisher: PUBLISHER_URN,
              },
            },
            included: [
              {
                id: PUBLISHER_ID,
                type: PUBLISHER_CLASS,
                attributes: {
                  name: PUBLISHER_NAME,
                  location: PUBLISHER_LOCATION,
                  owner: PUBLISHER_OWNER,
                },
              },
              {
                id: PUBLISHER_ID,
                type: PROJECTED_PUBLISHER_CLASS,
                attributes: {},
              },
            ],
          });

          projectedExcerpt = store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              attributes: {},
            },
          });

          projectedPreview = store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
              attributes: {},
            },
          });
        });

        this.records = {
          baseRecord,
          projectedExcerpt,
          projectedPreview,
        };
      });

      test('Updating property to another resolved value updates the base-record, other projections with new URN information using schema hook .setAttribute', function (assert) {
        let { store } = this;
        let { baseRecord, projectedExcerpt, projectedPreview } = this.records;

        run(() => {
          store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
              attributes: {
                publisher: PUBLISHER_URN,
              },
            },
            included: [
              {
                id: PUBLISHER_ID,
                type: PROJECTED_PUBLISHER_CLASS,
                attributes: {
                  location: PUBLISHER_LOCATION,
                },
              },
            ],
          });

          store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
              attributes: {
                publisher: PUBLISHER_URN,
              },
            },
            included: [
              {
                id: PUBLISHER_ID,
                type: PROJECTED_PUBLISHER_CLASS,
                attributes: {
                  name: PUBLISHER_NAME,
                  loaction: PUBLISHER_LOCATION,
                },
              },
            ],
          });

          // New publisher record
          store.push({
            data: {
              id: PUBLISHER_ID_NEW,
              type: PUBLISHER_CLASS,
              attributes: {
                name: NEW_PUBLISHER_NAME,
                location: NEW_PUBLISHER_LOCATION,
                owner: NEW_PUBLISHER_OWNER,
              },
            },
          });
        });

        let newProjectedPublisherRecord = run(() =>
          store.push({
            data: {
              id: PUBLISHER_ID_NEW,
              type: PROJECTED_PUBLISHER_CLASS,
              attributes: {
                location: NEW_PUBLISHER_LOCATION,
              },
            },
          })
        );

        // Value not changed in projection before setting new resolved value
        assert.equal(
          projectedPreview.get('publisher.id'),
          PUBLISHER_ID,
          'publisher.id is not updated'
        );

        assert.equal(
          projectedPreview.get('publisher.location'),
          PUBLISHER_LOCATION,
          'publisher location is not updated'
        );

        assert.equal(
          projectedPreview.get('publisher.name'),
          PUBLISHER_NAME,
          'publisher Name is not updated'
        );

        // Value not changed in base record before setting new resolved value
        assert.equal(baseRecord.get('publisher.id'), PUBLISHER_ID, 'publisher.id is not updated');

        assert.equal(
          baseRecord.get('publisher.location'),
          PUBLISHER_LOCATION,
          'publisher location is not updated'
        );

        assert.equal(
          baseRecord.get('publisher.owner'),
          PUBLISHER_OWNER,
          'publisher Owner is not updated'
        );

        assert.equal(
          baseRecord.get('publisher.name'),
          PUBLISHER_NAME,
          'publisher Name is not updated'
        );

        // Set Resolved value
        run(() => {
          set(projectedExcerpt, 'publisher', newProjectedPublisherRecord);
        });

        // Value changed in projection after setting to new resolved value
        assert.equal(
          projectedPreview.get('publisher.id'),
          PUBLISHER_ID_NEW,
          'publisher.id is updated'
        );

        assert.equal(
          projectedPreview.get('publisher.location'),
          NEW_PUBLISHER_LOCATION,
          'publisher location is updated'
        );

        assert.equal(
          projectedPreview.get('publisher.name'),
          NEW_PUBLISHER_NAME,
          'publisher Name is updated'
        );

        // Value changed in base record after setting to new resolved value
        assert.equal(baseRecord.get('publisher.id'), PUBLISHER_ID_NEW, 'publisher.id is updated');

        assert.equal(
          baseRecord.get('publisher.location'),
          NEW_PUBLISHER_LOCATION,
          'publisher location is updated'
        );

        assert.equal(
          baseRecord.get('publisher.owner'),
          NEW_PUBLISHER_OWNER,
          'publisher Owner is updated'
        );

        assert.equal(
          baseRecord.get('publisher.name'),
          NEW_PUBLISHER_NAME,
          'publisher Name is updated'
        );
      });

      test('Updating a reference array will update the array in the projection and the base record', function (assert) {
        let { store } = this;
        let OTHER_BOOK_ID = 'isbn:8888';
        let projectedPreview;
        let otherProjectedPreview;

        run(() => {
          // Base record for projectedPreview
          store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_CLASS_PATH,
              attributes: {
                otherBooksInSeries: [],
              },
            },
          });

          // Base record for otherProjectedPreview
          store.push({
            data: {
              id: OTHER_BOOK_ID,
              type: BOOK_CLASS_PATH,
              attributes: {
                otherBooksInSeries: [],
              },
            },
          });

          projectedPreview = store.push({
            data: {
              id: BOOK_ID,
              type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
              attributes: {
                otherBooksInSeries: [],
              },
            },
          });

          otherProjectedPreview = store.push({
            data: {
              id: OTHER_BOOK_ID,
              type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
              attributes: {
                otherBooksInSeries: [],
              },
            },
          });
        });

        assert.deepEqual(
          get(projectedPreview, 'otherBooksInSeries').map((book) => get(book, 'id')),
          [],
          'Initial set of otherBookInSeries should be empty before mutating'
        );

        run(() => {
          get(projectedPreview, 'otherBooksInSeries').replace(0, 1, [otherProjectedPreview]);
        });

        assert.deepEqual(
          get(projectedPreview, 'otherBooksInSeries').map((book) => get(book, 'id')),
          [OTHER_BOOK_ID],
          'Changes to otherBooksInSeries references should be reflected after mutation'
        );
      });
    });
  });
}
