import { module, test, skip } from 'qunit';
import { setupTest } from 'ember-qunit';
import MegamorphicModel from 'ember-m3/model';
import SchemaManager from 'ember-m3/schema-manager';
import { initialize as initializeStore } from 'ember-m3/initializers/m3-store';
import { watchProperties } from '../helpers/watch-property';
import { get, set } from '@ember/object';
import { run } from '@ember/runloop';
import { Promise } from 'rsvp';
import EmberObject from '@ember/object';

/*
  Ember Data currently dasherizes modelNames for use within the store, in these tests
  payloads given to the store use non-normalized modelNames while schemas and
  anything which accesses a model's modelName uses the normalized (dasherized) version.
 */
const BOOK_CLASS_PATH = 'com.example.bookstore.Book';
const NORM_BOOK_CLASS_PATH = 'com.example.bookstore.book';
const BOOK_EXCERPT_PROJECTION_CLASS_PATH = 'com.example.bookstore.projection.BookExcerpt';
const NORM_BOOK_EXCERPT_PROJECTION_CLASS_PATH = 'com.example.bookstore.projection.book-excerpt';
const BOOK_PREVIEW_PROJECTION_CLASS_PATH = 'com.example.bookstore.projection.BookPreview';
const NORM_BOOK_PREVIEW_PROJECTION_CLASS_PATH = 'com.example.bookstore.projection.book-preview';
const NORM_PROJECTED_AUTHOR_CLASS = 'com.example.bookstore.projected-type.projected-author';
const PUBLISHER_CLASS = 'com.example.bookstore.publisher';
const PROJECTED_PUBLISHER_CLASS = 'com.example.bookstore.projectedType.projectedPublisher';
const NORM_PROJECTED_PUBLISHER_CLASS = 'com.example.bookstore.projected-type.projected-publisher';

module('unit/projection', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    initializeStore(this);

    this.store = this.owner.lookup('service:store');

    SchemaManager.registerSchema({
      includesModel(modelName) {
        return /^com\.example\.bookstore\./i.test(modelName);
      },

      computeAttributeReference(key, value, modelName) {
        if (/^isbn:/.test(value)) {
          return {
            id: value,
            type: BOOK_CLASS_PATH,
          };
        } else if (/^urn:([^:]+):(.*)/.test(value)) {
          let parts = /^urn:([^:]+):(.*)/.exec(value);
          let type = parts[1];
          let modelSchema = this.models[modelName];

          if (modelSchema && modelSchema.attributesTypes && modelSchema.attributesTypes[key]) {
            type = modelSchema.attributesTypes[key];
          }
          return {
            type,
            id: parts[2],
          };
        }
      },

      computeNestedModel(key, value, modelName) {
        if (!value || typeof value !== 'object' || value.constructor === Date) {
          return null;
        }
        let valueType = value.type;
        let modelSchema = this.models[modelName];
        if (modelSchema && modelSchema.attributesTypes && modelSchema.attributesTypes[key]) {
          valueType = modelSchema.attributesTypes[key];
        }
        return {
          type: valueType,
          id: value.id,
          attributes: value,
        };
      },

      computeBaseModelName(modelName) {
        let schema = this.models[modelName];

        if (schema !== undefined) {
          return schema.baseType;
        }
      },

      models: {
        [NORM_BOOK_CLASS_PATH]: {},
        [NORM_BOOK_EXCERPT_PROJECTION_CLASS_PATH]: {
          baseType: NORM_BOOK_CLASS_PATH,
          attributes: ['title', 'author', 'year', 'publisher'],
        },
        [NORM_BOOK_PREVIEW_PROJECTION_CLASS_PATH]: {
          baseType: NORM_BOOK_CLASS_PATH,
          attributesTypes: {
            publisher: NORM_PROJECTED_PUBLISHER_CLASS,
            author: NORM_PROJECTED_AUTHOR_CLASS,
            otherBooksInSeries: NORM_BOOK_PREVIEW_PROJECTION_CLASS_PATH,
          },
          // if you want to project an embedded model then it must have a type
          //  computedEmbeddedType
          attributes: ['title', 'author', 'chapter-1', 'year', 'publisher', 'otherBooksInSeries'],
        },
        [PUBLISHER_CLASS]: {},
        // this schema must come with the parent schema
        [NORM_PROJECTED_AUTHOR_CLASS]: {
          attributes: ['location', 'name'],
        },
        [NORM_PROJECTED_PUBLISHER_CLASS]: {
          baseType: PUBLISHER_CLASS,
          attributes: ['location', 'name'],
        },
      },
    });
  });

  module('cache consistency', function() {
    test(`store.peekRecord() will only return a projection or base-record if it has been fetched`, function(assert) {
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

    test(`store.findRecord() will only fetch a projection or base-model if it has not been fetched previously`, function(assert) {
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
        store.findRecord(BOOK_EXCERPT_PROJECTION_CLASS_PATH, FETCHED_PROJECTION_ID).then(model => {
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
          .then(model => {
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
        store.findRecord(BOOK_CLASS_PATH, UNFETCHED_PROJECTION_ID).then(model => {
          assert.equal(
            get(model, 'id'),
            UNFETCHED_PROJECTION_ID,
            'we retrieved the already fetched the model'
          );
          assert.equal(findRecordCallCount, 0, 'We did not re-fetch');
        });
      });

      run(() => {
        store.findRecord(BOOK_CLASS_PATH, FETCHED_PROJECTION_ID).then(model => {
          assert.equal(get(model, 'id'), FETCHED_PROJECTION_ID, 'we fetched the model');
          assert.equal(findRecordCallCount, 1, 'We made a single request');
        });
      });
    });

    test(`store.peekAll() will not return partial records`, function(assert) {
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

    test('Projections proxy whitelisted attributes to a base-record', function(assert) {
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

  test('Updating an embedded object property to null can still be updated again', function(assert) {
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

  module('property notifications on top-level attributes', function(hooks) {
    /*
      All of the tests in this module MUST implement the following:

      # TOP LEVEL ATTRIBUTES

      - updates TITLE and CHAPTER
      - DOES NOT update YEAR

      Tests may optionally update DESCRIPTION but must assert the state
      of baseRecord on their own in this case.
     */

    // properties for use for initial state
    const BOOK_ID = 'isbn:9780439708181';
    const BOOK_TITLE = 'Adventures in Wonderland';
    const BOOK_YEAR = '1865';
    const BOOK_DESCRIPTION = `Don't get rabbit holed!`;

    // properties for use post-patch
    const NEW_CHAPTER_TEXT = 'So we began again.';
    const NEW_TITLE = 'Through the Looking Glass';
    const NEW_DESCRIPTION = 'Crazy Town';

    hooks.beforeEach(function(assert) {
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
              title: BOOK_TITLE,
              year: BOOK_YEAR,
              description: BOOK_DESCRIPTION, // description is not whitelisted
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

      const watchedProperties = [
        'title',
        'description',
        'chapter-1',
        'year', // props
      ];
      let baseRecordWatcher = watchProperties(baseRecord, watchedProperties);
      let excerptWatcher = watchProperties(projectedExcerpt, watchedProperties);
      let previewWatcher = watchProperties(projectedPreview, watchedProperties);

      this.watchers = {
        baseRecordWatcher,
        excerptWatcher,
        previewWatcher,
      };

      // a whitelisted property
      assert.equal(get(baseRecord, 'title'), BOOK_TITLE, 'base-record has the correct title');
      assert.equal(get(projectedExcerpt, 'title'), BOOK_TITLE, 'excerpt has the correct title');
      assert.equal(get(projectedPreview, 'title'), BOOK_TITLE, 'preview has the correct title');

      // a non-whitelisted property
      assert.equal(
        get(baseRecord, 'description'),
        BOOK_DESCRIPTION,
        'base-record has the correct description'
      );
      assert.equal(
        get(projectedExcerpt, 'description'),
        undefined,
        'excerpt has no description since it is not whitelisted'
      );
      assert.equal(
        get(projectedPreview, 'description'),
        undefined,
        'preview has no description since it is not whitelisted'
      );

      // an absent property
      assert.equal(get(baseRecord, 'chapter-1'), undefined, 'base-record has no chapter-1');
      assert.equal(get(projectedExcerpt, 'chapter-1'), undefined, 'excerpt has no chapter-1');
      assert.equal(get(projectedPreview, 'chapter-1'), undefined, 'preview has no chapter-1');

      // a whitelisted property that won't be updated
      assert.equal(get(baseRecord, 'year'), BOOK_YEAR, 'base-record has the correct year');
      assert.equal(get(projectedExcerpt, 'year'), BOOK_YEAR, 'excerpt has the correct year');
      assert.equal(get(projectedPreview, 'year'), BOOK_YEAR, 'preview has the correct year');

      assert.deepEqual(
        baseRecordWatcher.counts,
        { title: 0, description: 0, 'chapter-1': 0, year: 0 },
        'Initial baseRecord state'
      );

      assert.deepEqual(
        excerptWatcher.counts,
        { title: 0, description: 0, 'chapter-1': 0, year: 0 },
        'Initial excerpt state'
      );

      assert.deepEqual(
        previewWatcher.counts,
        { title: 0, description: 0, 'chapter-1': 0, year: 0 },
        'Initial preview state'
      );
    });

    hooks.afterEach(function(assert) {
      let { baseRecordWatcher, excerptWatcher, previewWatcher } = this.watchers;

      let { baseRecord, projectedExcerpt, projectedPreview } = this.records;

      assert.deepEqual(
        baseRecordWatcher.counts,
        { title: 1, 'chapter-1': 1, year: 0, description: baseRecordWatcher.counts.description },
        'Final baseRecord state'
      );

      assert.deepEqual(
        excerptWatcher.counts,
        { title: 1, description: 0, 'chapter-1': 0, year: 0 },
        'Final excerpt state'
      );

      assert.deepEqual(
        previewWatcher.counts,
        { title: 1, description: 0, 'chapter-1': 1, year: 0 },
        'Final preview state'
      );

      baseRecordWatcher.unwatch();
      excerptWatcher.unwatch();
      previewWatcher.unwatch();

      // set to an existing property
      assert.equal(get(baseRecord, 'title'), NEW_TITLE, 'base-record has the correct title');
      assert.equal(get(projectedExcerpt, 'title'), NEW_TITLE, 'excerpt has the correct title');
      assert.equal(get(projectedPreview, 'title'), NEW_TITLE, 'preview has the correct title');

      // set to a previously absent property
      assert.equal(
        get(baseRecord, 'chapter-1'),
        NEW_CHAPTER_TEXT,
        'base-record has the correct chapter-1'
      );
      assert.equal(
        get(projectedExcerpt, 'chapter-1'),
        undefined,
        'excerpt has the correct chapter-1'
      );
      assert.equal(
        get(projectedPreview, 'chapter-1'),
        NEW_CHAPTER_TEXT,
        'preview has the correct chapter-1'
      );

      // a whitelisted non-updated property
      assert.equal(get(baseRecord, 'year'), BOOK_YEAR, 'base-record has the correct year');
      assert.equal(get(projectedExcerpt, 'year'), BOOK_YEAR, 'excerpt has the correct year');
      assert.equal(get(projectedPreview, 'year'), BOOK_YEAR, 'preview has the correct year');

      // a non-whitelisted property
      assert.equal(
        get(projectedExcerpt, 'description'),
        undefined,
        'excerpt has no description since it is not whitelisted'
      );
      assert.equal(
        get(projectedPreview, 'description'),
        undefined,
        'preview has no description since it is not whitelisted'
      );

      this.watchers = null;
      this.records = null;
    });

    test('Setting on the base-record updates projections', function(assert) {
      let { baseRecord } = this.records;

      run(() => {
        set(baseRecord, 'chapter-1', NEW_CHAPTER_TEXT);
        set(baseRecord, 'title', NEW_TITLE);
        set(baseRecord, 'description', NEW_DESCRIPTION);
      });

      let { baseRecordWatcher } = this.watchers;

      let baseCounts = baseRecordWatcher.counts;

      assert.equal(baseCounts.description, 1, 'Afterwards we have dirtied baseRecord.description');
      assert.equal(
        get(baseRecord, 'description'),
        NEW_DESCRIPTION,
        'base-record has the correct description'
      );
    });

    test('Updating the base-record updates projections', function(assert) {
      let { store } = this;
      let { baseRecord } = this.records;

      run(() => {
        store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_CLASS_PATH,
            attributes: {
              title: NEW_TITLE,
              'chapter-1': NEW_CHAPTER_TEXT,
              description: NEW_DESCRIPTION,
            },
          },
        });
      });

      let { baseRecordWatcher } = this.watchers;

      let baseCounts = baseRecordWatcher.counts;

      assert.equal(baseCounts.description, 1, 'Afterwards we have dirtied baseRecord.description');
      assert.equal(
        get(baseRecord, 'description'),
        NEW_DESCRIPTION,
        'base-record has the correct description'
      );
    });

    test('Setting a projection updates the base-record and other projections', function(assert) {
      let preview = this.records.projectedPreview;
      let baseRecord = this.records.baseRecord;

      run(() => {
        set(preview, 'chapter-1', NEW_CHAPTER_TEXT);
        set(preview, 'title', NEW_TITLE);
      });

      run(() => {
        assert.throws(
          () => {
            set(preview, 'description', NEW_DESCRIPTION);
          },
          /whitelist/gi,
          'Setting a non-whitelisted property throws an error'
        );
      });
      assert.equal(
        this.watchers.baseRecordWatcher.counts.description,
        0,
        'Afterwards we have not dirtied baseRecord.description'
      );
      assert.equal(
        get(baseRecord, 'description'),
        BOOK_DESCRIPTION,
        'base-record has the correct description'
      );
    });

    test('Updating a projection updates the base-record and other projections', function(assert) {
      let baseRecord = this.records.baseRecord;
      let { store } = this;

      run(() => {
        store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {
              title: NEW_TITLE,
              'chapter-1': NEW_CHAPTER_TEXT,
            },
          },
        });
      });

      assert.equal(
        this.watchers.baseRecordWatcher.counts.description,
        0,
        'Afterwards we have not dirtied baseRecord.description'
      );
      assert.equal(
        get(baseRecord, 'description'),
        BOOK_DESCRIPTION,
        'base-record has the correct description'
      );
    });
  });

  module('property notifications on embedded objects', function(hooks) {
    /*
      All of the tests in this module MUST implement the following:

      # EMBEDDED OBJECT 'author'

      - DOES NOT update NAME
      - DOES update LOCATION

      AUTHOR is embedded on EXCERPT
      LOCATION and NAME are projected on PREVIEW but AGE is not.

      Tests may optionally update AGE but must assert the state
        of watchers and values for baseRecord and excerpt on their
        own in this case.
     */

    // properties for use for initial state
    const BOOK_ID = 'isbn:9780439708181';
    const AUTHOR_NAME = 'Lewis Carroll';
    const AUTHOR_LOCATION = 'Earth';
    const AUTHOR_AGE = 'old';

    // properties for use post-patch
    const NEW_AUTHOR_LOCATION = 'Sky';
    const NEW_AUTHOR_AGE = 'wise';

    hooks.beforeEach(function(assert) {
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
              author: {
                name: AUTHOR_NAME,
                location: AUTHOR_LOCATION,
                age: AUTHOR_AGE,
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

      const watchedProperties = [
        'author',
        'author.name',
        'author.age',
        'author.location', // embedded type
      ];
      let baseRecordWatcher = watchProperties(baseRecord, watchedProperties);
      let excerptWatcher = watchProperties(projectedExcerpt, watchedProperties);
      let previewWatcher = watchProperties(projectedPreview, watchedProperties);

      this.watchers = {
        baseRecordWatcher,
        excerptWatcher,
        previewWatcher,
      };

      // an embedded whitelisted property
      assert.equal(
        get(baseRecord, 'author.location'),
        AUTHOR_LOCATION,
        'base-record has the correct author.location'
      );
      assert.equal(
        get(projectedExcerpt, 'author.location'),
        AUTHOR_LOCATION,
        'excerpt has the correct author.location'
      );
      assert.equal(
        get(projectedPreview, 'author.location'),
        AUTHOR_LOCATION,
        'preview has the correct author.location'
      );

      // an embedded non-whitelisted property
      assert.equal(
        get(baseRecord, 'author.age'),
        AUTHOR_AGE,
        'base-record has the correct author.age'
      );
      assert.equal(
        get(projectedExcerpt, 'author.age'),
        AUTHOR_AGE,
        'excerpt has the correct author.age'
      );
      assert.equal(
        get(projectedPreview, 'author.age'),
        undefined,
        'preview has the correct author.age'
      );

      // an embedded whitelisted property that won't be updated
      assert.equal(
        get(baseRecord, 'author.name'),
        AUTHOR_NAME,
        'base-record has the correct author.name'
      );
      assert.equal(
        get(projectedExcerpt, 'author.name'),
        AUTHOR_NAME,
        'excerpt has the correct author.name'
      );
      assert.equal(
        get(projectedPreview, 'author.name'),
        AUTHOR_NAME,
        'preview has the correct author.name'
      );

      assert.deepEqual(
        baseRecordWatcher.counts,
        { author: 0, 'author.name': 0, 'author.location': 0, 'author.age': 0 },
        'Initial baseRecord state'
      );

      assert.deepEqual(
        excerptWatcher.counts,
        { author: 0, 'author.name': 0, 'author.location': 0, 'author.age': 0 },
        'Initial excerpt state'
      );

      assert.deepEqual(
        previewWatcher.counts,
        { author: 0, 'author.name': 0, 'author.location': 0, 'author.age': 0 },
        'Initial preview state'
      );
    });

    hooks.afterEach(function(assert) {
      let { baseRecordWatcher, excerptWatcher, previewWatcher } = this.watchers;

      let { baseRecord, projectedExcerpt, projectedPreview } = this.records;

      assert.deepEqual(
        baseRecordWatcher.counts,
        {
          author: 0,
          'author.name': 0,
          'author.location': 1,
          'author.age': baseRecordWatcher.counts['author.age'],
        },
        'Final baseRecord state'
      );

      assert.deepEqual(
        excerptWatcher.counts,
        {
          author: 0,
          'author.name': 0,
          'author.location': 1,
          'author.age': excerptWatcher.counts['author.age'],
        },
        'Final excerpt state'
      );

      assert.deepEqual(
        previewWatcher.counts,
        { author: 0, 'author.name': 0, 'author.location': 1, 'author.age': 0 },
        'Final preview state'
      );

      baseRecordWatcher.unwatch();
      excerptWatcher.unwatch();
      previewWatcher.unwatch();

      // an embedded whitelisted property
      assert.equal(
        get(baseRecord, 'author.location'),
        NEW_AUTHOR_LOCATION,
        'base-record has the correct author.location'
      );
      assert.equal(
        get(projectedExcerpt, 'author.location'),
        NEW_AUTHOR_LOCATION,
        'excerpt has the correct author.location'
      );
      assert.equal(
        get(projectedPreview, 'author.location'),
        NEW_AUTHOR_LOCATION,
        'preview has the correct author.location'
      );

      // an embedded non-whitelisted property
      assert.equal(
        get(projectedPreview, 'author.age'),
        undefined,
        'preview has the correct author.age'
      );

      // an embedded whitelisted property that won't be updated
      assert.equal(
        get(baseRecord, 'author.name'),
        AUTHOR_NAME,
        'base-record has the correct author.name'
      );
      assert.equal(
        get(projectedExcerpt, 'author.name'),
        AUTHOR_NAME,
        'excerpt has the correct author.name'
      );
      assert.equal(
        get(projectedPreview, 'author.name'),
        AUTHOR_NAME,
        'preview has the correct author.name'
      );

      this.watchers = null;
      this.records = null;
    });

    test('Setting an embedded object property on the base-record updates the value for projections', function(assert) {
      let { baseRecord, projectedExcerpt } = this.records;

      run(() => {
        set(baseRecord, 'author.location', NEW_AUTHOR_LOCATION);
        set(baseRecord, 'author.age', NEW_AUTHOR_AGE);
      });

      let { baseRecordWatcher, excerptWatcher } = this.watchers;

      let baseCounts = baseRecordWatcher.counts;
      let excerptCounts = excerptWatcher.counts;

      assert.equal(baseCounts['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
      assert.equal(excerptCounts['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
      assert.equal(
        get(baseRecord, 'author.age'),
        NEW_AUTHOR_AGE,
        'base-record has the correct author.age'
      );
      assert.equal(
        get(projectedExcerpt, 'author.age'),
        NEW_AUTHOR_AGE,
        'excerpt has the correct author.age'
      );
    });

    test('Updating an embedded object property on the base-record updates the value for projections', function(assert) {
      let { store } = this;
      let { baseRecord, projectedExcerpt } = this.records;

      run(() => {
        store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_CLASS_PATH,
            attributes: {
              author: {
                location: NEW_AUTHOR_LOCATION,
                age: NEW_AUTHOR_AGE,
              },
            },
          },
        });
      });

      let { baseRecordWatcher, excerptWatcher } = this.watchers;

      let baseCounts = baseRecordWatcher.counts;
      let excerptCounts = excerptWatcher.counts;

      assert.equal(baseCounts['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
      assert.equal(excerptCounts['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
      assert.equal(
        get(baseRecord, 'author.age'),
        NEW_AUTHOR_AGE,
        'base-record has the correct author.age'
      );
      assert.equal(
        get(projectedExcerpt, 'author.age'),
        NEW_AUTHOR_AGE,
        'excerpt has the correct author.age'
      );
    });

    test('Setting an embedded object property on a projection updates the base-record and other projections', function(assert) {
      let { baseRecord, projectedExcerpt } = this.records;
      let { baseRecordWatcher, excerptWatcher } = this.watchers;

      run(() => {
        set(projectedExcerpt, 'author.location', NEW_AUTHOR_LOCATION);
        set(projectedExcerpt, 'author.age', NEW_AUTHOR_AGE);
      });

      let baseCounts = baseRecordWatcher.counts;
      let excerptCounts = excerptWatcher.counts;

      assert.equal(baseCounts['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
      assert.equal(excerptCounts['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
      assert.equal(
        get(baseRecord, 'author.age'),
        NEW_AUTHOR_AGE,
        'base-record has the correct author.age'
      );
      assert.equal(
        get(projectedExcerpt, 'author.age'),
        NEW_AUTHOR_AGE,
        'excerpt has the correct author.age'
      );
    });

    test('Setting an embedded object property on a nested projection updates the base-record and other projections', function(assert) {
      let { baseRecord, projectedExcerpt, projectedPreview } = this.records;

      run(() => {
        set(projectedPreview, 'author.location', NEW_AUTHOR_LOCATION);
      });

      run(() => {
        assert.throws(
          () => {
            set(projectedPreview, 'author.age', NEW_AUTHOR_AGE);
          },
          /whitelist/gi,
          'Setting a non-whitelisted property on a projection over an embedded object throws an error'
        );
      });

      let { baseRecordWatcher, excerptWatcher } = this.watchers;
      let baseCounts = baseRecordWatcher.counts;
      let excerptCounts = excerptWatcher.counts;

      assert.equal(
        baseCounts['author.age'],
        0,
        'Afterwards we have not dirtied excerpt.author.age'
      );
      assert.equal(
        excerptCounts['author.age'],
        0,
        'Afterwards we have not dirtied excerpt.author.age'
      );
      assert.equal(
        get(baseRecord, 'author.age'),
        AUTHOR_AGE,
        'base-record has the correct author.age'
      );
      assert.equal(
        get(projectedExcerpt, 'author.age'),
        AUTHOR_AGE,
        'excerpt has the correct author.age'
      );
    });

    test('Updating an embedded object property on a projection updates the base-record and other projections', function(assert) {
      let { store } = this;
      let { baseRecord, projectedExcerpt } = this.records;

      run(() => {
        store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {
              author: {
                location: NEW_AUTHOR_LOCATION,
                age: NEW_AUTHOR_AGE,
              },
            },
          },
        });
      });

      let { baseRecordWatcher, excerptWatcher } = this.watchers;
      let baseCounts = baseRecordWatcher.counts;
      let excerptCounts = excerptWatcher.counts;

      assert.equal(baseCounts['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
      assert.equal(excerptCounts['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
      assert.equal(
        get(baseRecord, 'author.age'),
        NEW_AUTHOR_AGE,
        'base-record has the correct author.age'
      );
      assert.equal(
        get(projectedExcerpt, 'author.age'),
        NEW_AUTHOR_AGE,
        'excerpt has the correct author.age'
      );
    });

    test('Updating an embedded object property on a nested projection updates the base-record and other projections', function(assert) {
      let { store } = this;
      let { baseRecord, projectedExcerpt } = this.records;

      run(() => {
        store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
            attributes: {
              author: {
                location: NEW_AUTHOR_LOCATION,
              },
            },
          },
        });
      });

      let { baseRecordWatcher, excerptWatcher } = this.watchers;
      let baseCounts = baseRecordWatcher.counts;
      let excerptCounts = excerptWatcher.counts;

      assert.equal(
        baseCounts['author.age'],
        0,
        'Afterwards we have not dirtied excerpt.author.age'
      );
      assert.equal(
        excerptCounts['author.age'],
        0,
        'Afterwards we have not dirtied excerpt.author.age'
      );
      assert.equal(
        get(baseRecord, 'author.age'),
        AUTHOR_AGE,
        'base-record has the correct author.age'
      );
      assert.equal(
        get(projectedExcerpt, 'author.age'),
        AUTHOR_AGE,
        'excerpt has the correct author.age'
      );
    });
  });

  module('property notifications on resolved objects', function(hooks) {
    /*
      All of the tests in this module MUST implement the following:

      # RESOLVED RECORD 'publisher'

      - DOES NOT update NAME
      - DOES update LOCATION

      Tests may optionally update OWNER but must assert the state
        of watchers and values for baseRecord and excerpt on their
        own in this case.
     */

    // properties for use for initial state
    const BOOK_ID = 'isbn:9780439708181';
    // TODO is this valid? we won't have a real ID yeah?
    const PUBLISHER_ID = 'publisher-abc123';
    const PUBLISHER_URN = `urn:${PUBLISHER_CLASS}:${PUBLISHER_ID}`;
    const PUBLISHER_NAME = 'MACMILLAN';
    const PUBLISHER_LOCATION = 'Isle of Arran, Scotland';
    const PUBLISHER_OWNER = 'Daniel and Alexander Macmillan';

    // properties for use post-patch
    const NEW_PUBLISHER_LOCATION = 'London, England';
    const NEW_PUBLISHER_OWNER = 'Holtzbrinck Publishing Group';

    hooks.beforeEach(function(assert) {
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

      const watchedProperties = [
        'publisher',
        'publisher.name',
        'publisher.location',
        'publisher.owner', // resolved type
      ];
      let baseRecordWatcher = watchProperties(baseRecord, watchedProperties);
      let excerptWatcher = watchProperties(projectedExcerpt, watchedProperties);
      let previewWatcher = watchProperties(projectedPreview, watchedProperties);

      this.watchers = {
        baseRecordWatcher,
        excerptWatcher,
        previewWatcher,
      };

      // a whitelisted non-updated nested model value
      assert.equal(
        get(baseRecord, 'publisher.name'),
        PUBLISHER_NAME,
        'base-record has the correct publisher.name'
      );
      assert.equal(
        get(projectedExcerpt, 'publisher.name'),
        PUBLISHER_NAME,
        'excerpt has the correct publisher.name'
      );
      assert.equal(
        get(projectedPreview, 'publisher.name'),
        PUBLISHER_NAME,
        'preview has the correct publisher.name'
      );

      // a whitelisted updated nested model value
      assert.equal(
        get(baseRecord, 'publisher.location'),
        PUBLISHER_LOCATION,
        'base-record has the correct publisher.location'
      );
      assert.equal(
        get(projectedExcerpt, 'publisher.location'),
        PUBLISHER_LOCATION,
        'excerpt has the correct publisher.location'
      );
      assert.equal(
        get(projectedPreview, 'publisher.location'),
        PUBLISHER_LOCATION,
        'preview has the correct publisher.location'
      );

      // a non-whitelisted updated nested model value
      assert.equal(
        get(baseRecord, 'publisher.owner'),
        PUBLISHER_OWNER,
        'base-record has the correct publisher.owner'
      );
      assert.equal(
        get(projectedExcerpt, 'publisher.owner'),
        PUBLISHER_OWNER,
        'excerpt has the correct publisher.owner'
      );
      assert.equal(
        get(projectedPreview, 'publisher.owner'),
        undefined,
        'preview has the correct publisher.owner'
      );

      assert.deepEqual(
        baseRecordWatcher.counts,
        { publisher: 0, 'publisher.name': 0, 'publisher.owner': 0, 'publisher.location': 0 },
        'Initial baseRecord state'
      );

      assert.deepEqual(
        excerptWatcher.counts,
        { publisher: 0, 'publisher.name': 0, 'publisher.owner': 0, 'publisher.location': 0 },
        'Initial excerpt state'
      );

      assert.deepEqual(
        previewWatcher.counts,
        { publisher: 0, 'publisher.name': 0, 'publisher.owner': 0, 'publisher.location': 0 },
        'Initial preview state'
      );
    });

    hooks.afterEach(function(assert) {
      let { baseRecordWatcher, excerptWatcher, previewWatcher } = this.watchers;

      let { baseRecord, projectedExcerpt, projectedPreview } = this.records;

      assert.deepEqual(
        baseRecordWatcher.counts,
        {
          publisher: 0,
          'publisher.name': 0,
          'publisher.location': 1,
          'publisher.owner': baseRecordWatcher.counts['publisher.owner'],
        },
        'Final baseRecord state'
      );

      assert.deepEqual(
        excerptWatcher.counts,
        {
          publisher: 0,
          'publisher.name': 0,
          'publisher.location': 1,
          'publisher.owner': excerptWatcher.counts['publisher.owner'],
        },
        'Final excerpt state'
      );

      assert.deepEqual(
        previewWatcher.counts,
        { publisher: 0, 'publisher.name': 0, 'publisher.owner': 0, 'publisher.location': 1 },
        'Final preview state'
      );

      baseRecordWatcher.unwatch();
      excerptWatcher.unwatch();
      previewWatcher.unwatch();

      // a whitelisted non-updated nested model value
      assert.equal(
        get(baseRecord, 'publisher.name'),
        PUBLISHER_NAME,
        'base-record has the correct publisher.name'
      );
      assert.equal(
        get(projectedExcerpt, 'publisher.name'),
        PUBLISHER_NAME,
        'excerpt has the correct publisher.name'
      );
      assert.equal(
        get(projectedPreview, 'publisher.name'),
        PUBLISHER_NAME,
        'preview has the correct publisher.name'
      );

      // a whitelisted updated nested model value
      assert.equal(
        get(baseRecord, 'publisher.location'),
        NEW_PUBLISHER_LOCATION,
        'base-record has the correct publisher.location'
      );
      assert.equal(
        get(projectedExcerpt, 'publisher.location'),
        NEW_PUBLISHER_LOCATION,
        'excerpt has the correct publisher.location'
      );
      assert.equal(
        get(projectedPreview, 'publisher.location'),
        NEW_PUBLISHER_LOCATION,
        'preview has the correct publisher.location'
      );

      // a non-whitelisted updated nested model value
      assert.equal(
        get(projectedPreview, 'publisher.owner'),
        undefined,
        'preview has the correct publisher.owner'
      );

      this.watchers = null;
      this.records = null;
    });

    test('Setting a resolution property via the base-record updates projections and nested projections', function(assert) {
      let { baseRecord, projectedExcerpt } = this.records;

      run(() => {
        set(baseRecord, 'publisher.location', NEW_PUBLISHER_LOCATION);
        set(baseRecord, 'publisher.owner', NEW_PUBLISHER_OWNER);
      });

      let { baseRecordWatcher, excerptWatcher } = this.watchers;

      let baseCounts = baseRecordWatcher.counts;
      let excerptCounts = excerptWatcher.counts;

      assert.equal(
        baseCounts['publisher.owner'],
        1,
        'Afterwards we have dirtied baseRecord.description'
      );
      assert.equal(
        excerptCounts['publisher.owner'],
        1,
        'Afterwards we have dirtied baseRecord.description'
      );
      assert.equal(
        get(baseRecord, 'publisher.owner'),
        NEW_PUBLISHER_OWNER,
        'base-record has the correct publisher.owner'
      );
      assert.equal(
        get(projectedExcerpt, 'publisher.owner'),
        NEW_PUBLISHER_OWNER,
        'excerpt has the correct publisher.owner'
      );
    });

    test('Updating a resolution property via the base-record updates projections and nested projections', function(assert) {
      let { store } = this;
      let { baseRecord, projectedExcerpt } = this.records;

      run(() => {
        store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_CLASS_PATH,
            attributes: {},
          },
          included: [
            {
              id: PUBLISHER_ID,
              type: PUBLISHER_CLASS,
              attributes: {
                location: NEW_PUBLISHER_LOCATION,
                owner: NEW_PUBLISHER_OWNER,
              },
            },
          ],
        });
      });

      let { baseRecordWatcher, excerptWatcher } = this.watchers;

      let baseCounts = baseRecordWatcher.counts;
      let excerptCounts = excerptWatcher.counts;

      assert.equal(
        baseCounts['publisher.owner'],
        1,
        'Afterwards we have dirtied baseRecord.description'
      );
      assert.equal(
        excerptCounts['publisher.owner'],
        1,
        'Afterwards we have dirtied baseRecord.description'
      );
      assert.equal(
        get(baseRecord, 'publisher.owner'),
        NEW_PUBLISHER_OWNER,
        'base-record has the correct publisher.owner'
      );
      assert.equal(
        get(projectedExcerpt, 'publisher.owner'),
        NEW_PUBLISHER_OWNER,
        'excerpt has the correct publisher.owner'
      );
    });

    test('Setting a resolution property via a projection updates the base-record, other projections and nested projections', function(assert) {
      let { baseRecord, projectedExcerpt } = this.records;

      run(() => {
        set(projectedExcerpt, 'publisher.location', NEW_PUBLISHER_LOCATION);
        set(projectedExcerpt, 'publisher.owner', NEW_PUBLISHER_OWNER);
      });

      let { baseRecordWatcher, excerptWatcher } = this.watchers;

      let baseCounts = baseRecordWatcher.counts;
      let excerptCounts = excerptWatcher.counts;

      assert.equal(
        baseCounts['publisher.owner'],
        1,
        'Afterwards we have dirtied baseRecord.publisher.owner'
      );
      assert.equal(
        excerptCounts['publisher.owner'],
        1,
        'Afterwards we have dirtied baseRecord.publisher.owner'
      );
      assert.equal(
        get(baseRecord, 'publisher.owner'),
        NEW_PUBLISHER_OWNER,
        'base-record has the correct publisher.owner'
      );
      assert.equal(
        get(projectedExcerpt, 'publisher.owner'),
        NEW_PUBLISHER_OWNER,
        'excerpt has the correct publisher.owner'
      );
    });

    test('Setting a resolution property via a nested projection updates the base-record and other projections', function(assert) {
      let { baseRecord, projectedExcerpt, projectedPreview } = this.records;

      run(() => {
        set(projectedPreview, 'publisher.location', NEW_PUBLISHER_LOCATION);
      });

      run(() => {
        assert.throws(
          () => {
            set(projectedPreview, 'publisher.owner', NEW_PUBLISHER_OWNER);
          },
          /whitelist/gi,
          'Setting a non-whitelisted property on a projection over a resolved record throws an error'
        );
      });

      let { baseRecordWatcher, excerptWatcher } = this.watchers;

      let baseCounts = baseRecordWatcher.counts;
      let excerptCounts = excerptWatcher.counts;

      assert.equal(
        baseCounts['publisher.owner'],
        0,
        'Afterwards we have not dirtied baseRecord.publisher.owner'
      );
      assert.equal(
        excerptCounts['publisher.owner'],
        0,
        'Afterwards we have not  dirtied baseRecord.publisher.owner'
      );
      assert.equal(
        get(baseRecord, 'publisher.owner'),
        PUBLISHER_OWNER,
        'base-record has the correct publisher.owner'
      );
      assert.equal(
        get(projectedExcerpt, 'publisher.owner'),
        PUBLISHER_OWNER,
        'excerpt has the correct publisher.owner'
      );
    });

    test('Updating a resolution property via a projection updates the base-record, other projections and nested projections', function(assert) {
      let { store } = this;

      let { baseRecord, projectedExcerpt } = this.records;

      run(() => {
        store.push({
          data: {
            id: PUBLISHER_ID,
            type: PROJECTED_PUBLISHER_CLASS,
            attributes: {
              location: NEW_PUBLISHER_LOCATION,
              owner: NEW_PUBLISHER_OWNER,
            },
          },
        });
      });

      let { baseRecordWatcher, excerptWatcher } = this.watchers;

      let baseCounts = baseRecordWatcher.counts;
      let excerptCounts = excerptWatcher.counts;

      assert.equal(
        baseCounts['publisher.owner'],
        1,
        'Afterwards we have dirtied baseRecord.description'
      );
      assert.equal(
        excerptCounts['publisher.owner'],
        1,
        'Afterwards we have dirtied baseRecord.description'
      );
      assert.equal(
        get(baseRecord, 'publisher.owner'),
        NEW_PUBLISHER_OWNER,
        'base-record has the correct publisher.owner'
      );
      assert.equal(
        get(projectedExcerpt, 'publisher.owner'),
        NEW_PUBLISHER_OWNER,
        'excerpt has the correct publisher.owner'
      );
    });

    test('Updating a resolution property via a nested projection updates the base-record, other projections', function(assert) {
      let { store } = this;
      let { baseRecord, projectedExcerpt } = this.records;

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
                location: NEW_PUBLISHER_LOCATION,
              },
            },
          ],
        });
      });

      let { baseRecordWatcher, excerptWatcher } = this.watchers;

      let baseCounts = baseRecordWatcher.counts;
      let excerptCounts = excerptWatcher.counts;

      assert.equal(
        baseCounts['publisher.owner'],
        0,
        'Afterwards we have not dirtied baseRecord.publisher.owner'
      );
      assert.equal(
        excerptCounts['publisher.owner'],
        0,
        'Afterwards we have not  dirtied baseRecord.publisher.owner'
      );
      assert.equal(
        get(baseRecord, 'publisher.owner'),
        PUBLISHER_OWNER,
        'base-record has the correct publisher.owner'
      );
      assert.equal(
        get(projectedExcerpt, 'publisher.owner'),
        PUBLISHER_OWNER,
        'excerpt has the correct publisher.owner'
      );
    });
  });

  skip(`Updates to a projection's non-whitelisted attributes do not cause a projection to be dirtied`, function() {});

  module('unloading/deleting records', function(hooks) {
    const BOOK_ID = 'isbn:123';
    const OTHER_BOOK_ID = 'isbn:456';
    const OTHER_BOOK_URN = `urn:${NORM_BOOK_CLASS_PATH}:${OTHER_BOOK_ID}`;
    const BOOK_TITLE = 'Alice in Wonderland';

    hooks.beforeEach(function() {
      let { store } = this;

      this.owner.register(
        'adapter:-ember-m3',
        EmberObject.extend({
          deleteRecord() {
            return Promise.resolve();
          },
        })
      );

      let baseRecord = run(() => {
        return store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_CLASS_PATH,
            attributes: {
              title: BOOK_TITLE,
              otherBooksInSeries: [OTHER_BOOK_URN],
            },
          },
        });
      });

      let projectedPreview = run(() => {
        return store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
            attributes: {},
          },
        });
      });

      let projectedExcerpt = run(() => {
        return store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {},
          },
        });
      });

      this.records = {
        baseRecord,
        projectedPreview,
        projectedExcerpt,
      };
    });

    skip(`Deleting the base-record also deletes the projections`, function(assert) {
      let { baseRecord, projectedPreview } = this.records;

      baseRecord.deleteRecord();

      assert.equal(
        get(projectedPreview, 'isDeleted'),
        true,
        'Expected projection record to be deleted as well'
      );
      assert.equal(
        get(projectedPreview, 'isDirty'),
        true,
        'Expected projection record to be marked as dirty as well'
      );

      run(() => {
        baseRecord.save().then(() => {
          assert.equal(
            get(projectedPreview, 'isDeleted'),
            true,
            'Expected the projection record to stay deleted'
          );
          assert.equal(
            get(projectedPreview, 'isDirty'),
            false,
            'Expected the projection record to have been committed'
          );
        });
      });
    });

    skip(`Deleting the projection also deletes the base-record`, function(assert) {
      let { baseRecord, projectedPreview, projectedExcerpt } = this.records;

      projectedPreview.deleteRecord();

      assert.equal(
        get(baseRecord, 'isDeleted'),
        true,
        'Expected the base record to be deleted as well'
      );
      assert.equal(
        get(baseRecord, 'isDirty'),
        true,
        'Expected the base record to be marked as dirty as well'
      );
      assert.equal(
        get(projectedExcerpt, 'isDeleted'),
        true,
        'Expected the other projection record to be deleted as well'
      );
      assert.equal(
        get(projectedExcerpt, 'isDirty'),
        true,
        'Expected the other projection record to be marked as dirty as well'
      );

      run(() => {
        projectedPreview.save().then(() => {
          assert.equal(
            get(baseRecord, 'isDeleted'),
            true,
            'Expected the base record to stay deleted'
          );
          assert.equal(
            get(baseRecord, 'isDirty'),
            false,
            'Expected the base record to have been committed'
          );
          assert.equal(
            get(projectedExcerpt, 'isDeleted'),
            true,
            'Expected the other projection record to stay deleted'
          );
          assert.equal(
            get(projectedExcerpt, 'isDirty'),
            false,
            'Expected the other projection record to have been committed'
          );
        });
      });
    });

    test(`Unloading a projection does not unload the base-record and other projections`, function(assert) {
      let { baseRecord, projectedPreview, projectedExcerpt } = this.records;

      run(() => {
        projectedPreview.unloadRecord();
      });

      // projectedPreview has been unloaded
      assert.equal(this.store.hasRecordForId(BOOK_PREVIEW_PROJECTION_CLASS_PATH, BOOK_ID), false);
      assert.equal(get(projectedPreview, 'isDestroyed'), true);

      // baseRecord is still around
      assert.equal(this.store.hasRecordForId(BOOK_CLASS_PATH, BOOK_ID), true);
      assert.equal(get(baseRecord, 'isDestroyed'), false);
      // TODO How can we check whether the underlying structure were not destroyed in the case of unload
      // Functionality can continue to work even in case of a bug
      assert.equal(get(baseRecord, '_internalModel.isDestroyed'), false);
      assert.equal(get(baseRecord, 'title'), BOOK_TITLE);

      // projectedExcerpt is still arond
      assert.equal(this.store.hasRecordForId(BOOK_EXCERPT_PROJECTION_CLASS_PATH, BOOK_ID), true);
      assert.equal(get(projectedExcerpt, 'isDestroyed'), false);
      assert.equal(get(projectedExcerpt, '_internalModel.isDestroyed'), false);
      assert.equal(get(projectedExcerpt, 'title'), BOOK_TITLE);
    });

    test(`Unloading the base-record does not unload the projection`, function(assert) {
      let { baseRecord, projectedPreview } = this.records;

      run(() => {
        baseRecord.unloadRecord();
      });

      // baseRecord has been unloaded
      assert.equal(this.store.hasRecordForId(BOOK_CLASS_PATH, BOOK_ID), false);
      assert.equal(get(baseRecord, 'isDestroyed'), true);

      // projectedPreview is still around
      assert.equal(this.store.hasRecordForId(BOOK_PREVIEW_PROJECTION_CLASS_PATH, BOOK_ID), true);
      assert.equal(get(projectedPreview, 'isDestroyed'), false);
      // TODO How can we check whether the underlying structure were not destroyed in the case of unload
      // Functionality can continue to work even in case of a bug
      assert.equal(get(projectedPreview, '_internalModel.isDestroyed'), false);
      assert.equal(get(projectedPreview, 'title'), BOOK_TITLE);
    });

    skip('Unloading a record removes it from record arrays, which have reference to it', function(assert) {
      // we need additional records to be able to resolve the references
      run(() => {
        this.store.push({
          data: {
            id: OTHER_BOOK_ID,
            type: BOOK_CLASS_PATH,
            attributes: {},
          },
        });
      });

      run(() => {
        this.store.push({
          data: {
            id: OTHER_BOOK_ID,
            type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
          },
        });
      });

      let { baseModel, projectedPreview } = this.records;

      // load the record arrays
      let booksInSeriesBase = get(baseModel, 'otherBooksInSeries');
      let booksInSeriesProjectedPreview = get(projectedPreview, 'otherBooksInSeries');
      let otherProjectedPreview = get(booksInSeriesProjectedPreview, 'firstObject');

      // precondition
      assert.equal(
        get(booksInSeriesBase, 'length'),
        1,
        'Expected otherBooksInSeries length to be one for base'
      );
      assert.equal(
        get(booksInSeriesProjectedPreview, 'length'),
        1,
        'Expected otherBooksInSeries length to be one for projected preview'
      );

      // unload a projection referenced in a record array
      run(() => {
        otherProjectedPreview.unloadRecord();
      });

      assert.equal(
        get(booksInSeriesBase, 'length'),
        1,
        'Expected otherBooksInSeries length to be unchanged for base'
      );
      assert.equal(
        get(booksInSeriesProjectedPreview, 'length'),
        1,
        'Expected otherBooksInSeries length to be unchanged for projected preview'
      );
      assert.equal(
        booksInSeriesProjectedPreview.getObjectAt(0),
        null,
        'Expected the projected preview to have been replaced with null in the record array'
      );
      assert.notEqual(
        get(booksInSeriesBase, 'firstObject.isDestroyed'),
        true,
        'Expected record in otherBooksInSeries for base to not have been destroyed'
      );
    });

    skip('Projection list is cleaned up after all projections have been unloaded', function() {});
  });

  module('creating/updating projections', function(/*hooks*/) {
    const BOOK_ID = 'isbn:123';
    const BOOK_TITLE_1 = 'Alice in Wonderland';
    const BOOK_TITLE_2 = 'Alice Through the Looking Glass';
    const BOOK_CHAPTER_1 = 'Down the Rabbit-Hole';
    const BOOK_CHAPTER_2 = 'Looking-Glass House';
    const BOOK_AUTHOR_NAME_1 = 'Lewis Carol';
    const BOOK_AUTHOR_NAME_2 = 'J.K. Rowling';

    test('independently created projections of the same base-type but no ID do not share their data', function(assert) {
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

    test('independently created projections of the same projection-type but no ID do not share their data', function(assert) {
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

    skip('independently created projections of the same base-type and ID share their data', function(assert) {
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

    test('independently creating projections of the same projection-type and ID is not allowed', function(assert) {
      run(() => {
        this.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
          id: BOOK_ID,
        });
        assert.throws(
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

    test('can create and save a projection', function(assert) {
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

      let projectedPreview = run(() => {
        let record = this.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
          title: BOOK_TITLE_1,
        });
        record.save();
        return record;
      });

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

    test('new projections are correctly cached after save', function(assert) {
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

      let projectedPreview = run(() => {
        let record = this.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
          title: BOOK_TITLE_1,
        });
        record.save();
        return record;
      });

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

    test('newly created and saved projections can receive updates', function(assert) {
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

      let projectedPreview = run(() => {
        let record = this.store.createRecord(BOOK_PREVIEW_PROJECTION_CLASS_PATH, {
          title: BOOK_TITLE_1,
          author: {
            name: BOOK_AUTHOR_NAME_1,
          },
        });

        // reify the nested model
        get(record, 'author.name');

        record.save();
        return record;
      });

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

    skip('we cannot create a new projection when existing model-data exists', function(assert) {
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

    skip('update and save of a projection does not touch non-whitelisted properties', function(assert) {
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
  });

  skip(`eachAttribute returns only white-listed properties`, function() {});
  skip(`Creating a projection with an unloaded schema`, function() {});
  skip(`Finding a projection with an unloaded schema`, function() {});
  skip(`fetched schemas must be complete (projected types must also be included)`, function() {});
});
