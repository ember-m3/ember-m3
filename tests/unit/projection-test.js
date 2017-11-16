import { module, test, todo, skip } from 'qunit';
import { setupTest }  from 'ember-qunit';
import Ember from 'ember';
import MegamorphicModel from 'ember-m3/model';
import SchemaManager from 'ember-m3/schema-manager';
import { initialize as initializeStore } from 'ember-m3/initializers/m3-store';
import { watchProperties } from '../helpers/watch-property';

const {
  get,
  set,
  run,
  RSVP: { Promise },
} = Ember;

/*
  Non-normalized ClassPaths are used for the data returned by the adapter and pushed to the store
  but for everything post-entry we use the normalized version.
 */
const BOOK_CLASS_PATH = 'com.example.bookstore.Book';
const NORM_BOOK_CLASS_PATH = 'com.example.bookstore.book';
const BOOK_EXCERPT_PROJECTION_CLASS_PATH = 'com.example.bookstore.projection.BookExcerpt';
const NORM_BOOK_EXCERPT_PROJECTION_CLASS_PATH = 'com.example.bookstore.projection.book-excerpt';
const BOOK_PREVIEW_PROJECTION_CLASS_PATH = 'com.example.bookstore.projection.BookPreview';
const NORM_BOOK_PREVIEW_PROJECTION_CLASS_PATH = 'com.example.bookstore.projection.book-preview';
// never used since this is embedded
// const PROJECTED_AUTHOR_CLASS = 'com.example.bookstore.projectedType.projectedAuthor';
const NORM_PROJECTED_AUTHOR_CLASS = 'com.example.bookstore.projected-type.projected-author';
const PUBLISHER_CLASS = 'com.example.bookstore.publisher';
const PROJECTED_PUBLISHER_CLASS = 'com.example.bookstore.projectedType.projectedPublisher';
const NORM_PROJECTED_PUBLISHER_CLASS = 'com.example.bookstore.projected-type.projected-publisher';

module('unit/projection', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    initializeStore(this);

    this.store = function() {
      return this.owner.lookup('service:store');
    };

    SchemaManager.registerSchema({
      modelIsProjection(modelName) {
        return /^com\.example\.bookstore\.projection\./i.test(modelName);
      },

      includesModel(modelName) {
        return /^com\.example\.bookstore\./i.test(modelName);
      },

      computeBaseModelName(projectionModelName) {
        let modelSchema = this.models[projectionModelName];
        return modelSchema && modelSchema.projectedType;
      },

      computeAttributeReference(key, value, modelName) {
        if (/^isbn:/.test(value)) {
          return {
            id: value,
            type: BOOK_CLASS_PATH,
          }
        } else if (/^urn:([^:]+):(.*)/.test(value)) {
          let parts = /^urn:([^:]+):(.*)/.exec(value);
          let type = parts[1];
          let modelSchema = this.models[modelName];
          if (modelSchema && modelSchema.resolvedTypes && modelSchema.resolvedTypes[key]) {
            type = modelSchema.resolvedTypes[key];
          }
          return {
            type,
            id: parts[2],
          };
        }
      },

      isAttributeArrayReference(key) {
        return key === 'otherBooksInSeries';
      },

      computeNestedModel(key, value, modelName) {
        if (!value || typeof value !== 'object' || value.constructor === Date) {
          return null;
        }
        let valueType = value.type;
        let modelSchema = this.models[modelName];
        if (modelSchema && modelSchema.resolvedTypes && modelSchema.resolvedTypes[key]) {
          valueType = modelSchema.resolvedTypes[key];
        }
        return {
          type: valueType,
          id: value.id,
          attributes: value,
        }
      },

      models: {
        [NORM_BOOK_CLASS_PATH]: {
          aliases: {
            name: 'title',
            cost: 'price',
            pub: 'publisher',
            releaseDate: 'pubDate',
            pb: 'paperback',
            hb: 'hardback',
          },
          defaults: {
            publisher: 'Penguin Classics',
            hardback: true,
            paperback: true,
            publishedIn: 'US',
          },
          transforms: {
            // This interferes with the URN resolution
            // publisher(value) {
            //   return `${value}, of course`;
            // },
            pubDate(value) {
              return new Date(Date.parse(value));
            }
          }
        },
        [NORM_BOOK_EXCERPT_PROJECTION_CLASS_PATH]: {
          projectedType: NORM_BOOK_CLASS_PATH,
          attributes: ['title', 'author', 'year', 'publisher'],
        },
        [NORM_BOOK_PREVIEW_PROJECTION_CLASS_PATH]: {
          projectedType: NORM_BOOK_CLASS_PATH,
          resolvedTypes: {
            publisher: NORM_PROJECTED_PUBLISHER_CLASS,
            author: NORM_PROJECTED_AUTHOR_CLASS
          },
          // if you want to project an embedded model then it must have a type
          //  computedEmbeddedType
          attributes: ['title', 'author', 'chapter-1', 'year', 'publisher'],
        },
        [PUBLISHER_CLASS]: {},
        // this schema must come with the parent schema
        [NORM_PROJECTED_AUTHOR_CLASS]: {
          attributes: ['location', 'name']
        },
        [NORM_PROJECTED_PUBLISHER_CLASS]: {
          projectedType: PUBLISHER_CLASS,
          attributes: ['location', 'name']
        }
      }
    });
  });

  todo(`store.peekRecord() will only return a projection or base-record if it has been fetched`, function(assert) {
    assert.expect(4);

    const UNFETCHED_PROJECTION_ID = 'isbn:9780439708180';
    const FETCHED_PROJECTION_ID = 'isbn:9780439708181';
    const store = this.store();

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
            title: 'Carry On! Mr. Bowditch'
          },
        }
      });
      store.push({
        data: {
          type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
          id: FETCHED_PROJECTION_ID,
          attributes: {},
        },
        included: [
          {
            type: BOOK_CLASS_PATH,
            id: FETCHED_PROJECTION_ID,
            attributes: {
              title: `Mr. Popper's Penguins`
            },
            meta: {
              projectionTypes: [BOOK_EXCERPT_PROJECTION_CLASS_PATH]
            }
          },
        ]
      });
    });

    let projection = store.peekRecord(BOOK_EXCERPT_PROJECTION_CLASS_PATH, UNFETCHED_PROJECTION_ID);
    assert.equal(projection, undefined, 'The unfetched projection with a fetched base-record is unfound by peekRecord()');

    projection = store.peekRecord(BOOK_EXCERPT_PROJECTION_CLASS_PATH, FETCHED_PROJECTION_ID);
    assert.ok(projection instanceof MegamorphicModel, 'The fetched projection is found by peekRecord()');

    let record = store.peekRecord(BOOK_CLASS_PATH, UNFETCHED_PROJECTION_ID);
    assert.ok(record instanceof MegamorphicModel, 'The fetched base-record is found by peekRecord()');

    record = store.peekRecord(BOOK_CLASS_PATH, FETCHED_PROJECTION_ID);
    assert.equal(record, undefined, 'The unfetched base-record with a fetched projection is unfound by peekRecord()');
  });

  todo(`store.findRecord() will only fetch a projection or base-model if it has not been fetched previously`, function(assert) {
    assert.expect(12);

    const UNFETCHED_PROJECTION_ID = 'isbn:9780439708180';
    const FETCHED_PROJECTION_ID = 'isbn:9780439708181';
    const store = this.store();

    let expectedFindRecordModelName;
    let trueFindRecordModelName;
    let expectedFindRecordId;
    let findRecordCallCount = 0;

    this.owner.register('adapter:-ember-m3', Ember.Object.extend({
      findRecord(store, modelClass, id, snapshot) {
        findRecordCallCount++;
        assert.equal(snapshot.modelName, expectedFindRecordModelName, 'findRecord snapshot has the correct modelName');
        assert.equal(id, expectedFindRecordId, 'findRecord received the correct id');

        return Promise.resolve({
          data: {
            id: expectedFindRecordId,
            type: trueFindRecordModelName,
            attributes: {
              title: 'Carry on! Mr. Bowditch'
            }
          }
        });
      },

      shouldReloadRecord() {
        return false;
      },

      shouldBackgroundReloadRecord() {
        return false;
      },
    }));

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
            title: 'Carry On! Mr. Bowditch'
          },
        }
      });
      store.push({
        data: {
          type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
          id: FETCHED_PROJECTION_ID,
          attributes: {},
        },
        included: [
          {
            type: BOOK_CLASS_PATH,
            id: FETCHED_PROJECTION_ID,
            attributes: {
              title: `Mr. Popper's Penguins`
            },
            meta: {
              projectionTypes: [BOOK_EXCERPT_PROJECTION_CLASS_PATH]
            }
          },
        ]
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
      store.findRecord(BOOK_EXCERPT_PROJECTION_CLASS_PATH, FETCHED_PROJECTION_ID)
        .then(model => {
          assert.equal(get(model, 'id'), FETCHED_PROJECTION_ID, 'we retrieved the already fetched the model');
          assert.equal(findRecordCallCount, 0, 'We did not re-fetch');
        });
    });

    run(() => {
      store.findRecord(BOOK_EXCERPT_PROJECTION_CLASS_PATH, UNFETCHED_PROJECTION_ID)
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
      store.findRecord(BOOK_CLASS_PATH, UNFETCHED_PROJECTION_ID)
        .then(model => {
          assert.equal(get(model, 'id'), UNFETCHED_PROJECTION_ID, 'we retrieved the already fetched the model');
          assert.equal(findRecordCallCount, 0, 'We did not re-fetch');
        });
    });

    run(() => {
      store.findRecord(BOOK_CLASS_PATH, FETCHED_PROJECTION_ID)
        .then(model => {
          assert.equal(get(model, 'id'), FETCHED_PROJECTION_ID, 'we fetched the model');
          assert.equal(findRecordCallCount, 1, 'We made a single request');
        });
    });
  });

  test('Projections proxy whitelisted attributes to a base-record', function(assert) {
    const store = this.store();
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
            description: BOOK_DESCRIPTION // description is not whitelisted
          },
        }
      });

      // intentionally missing 'author'
      projectedRecord = store.push({
        data: {
          id: BOOK_ID,
          type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
          attributes: {},
        },
        included: [
          {
            id: BOOK_ID,
            type: BOOK_CLASS_PATH,
            meta: {
              projectionTypes: [BOOK_EXCERPT_PROJECTION_CLASS_PATH],
            },
            attributes: {
              title: BOOK_TITLE
            }
          },
        ]
      });
    });

    assert.equal(get(baseRecord, 'id'), BOOK_ID, 'base-record has the proper id');
    assert.equal(get(baseRecord, 'author'), BOOK_AUTHOR, 'base-record has author');
    assert.equal(get(baseRecord, 'title'), BOOK_TITLE, 'base-record has title');
    assert.equal(get(baseRecord, 'description'), BOOK_DESCRIPTION, 'base-record has description');

    assert.equal(get(projectedRecord, 'id'), BOOK_ID, 'projected-record has the proper id');
    assert.equal(get(projectedRecord, 'author'), BOOK_AUTHOR, 'projected-record has author');
    assert.equal(get(projectedRecord, 'title'), BOOK_TITLE, 'projected-record has title');
    assert.equal(get(projectedRecord, 'description'), undefined, 'projected-record has no description as it is not whitelisted');
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
      const store = this.store();

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
              description: BOOK_DESCRIPTION // description is not whitelisted
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
        'title', 'description', 'chapter-1', 'year', // props
      ];
      let baseRecordWatcher = watchProperties(baseRecord, watchedProperties);
      let excerptWatcher = watchProperties(projectedExcerpt, watchedProperties);
      let previewWatcher = watchProperties(projectedPreview, watchedProperties);

      this.watchers = {
        baseRecordWatcher,
        excerptWatcher,
        previewWatcher
      };

      // a whitelisted property
      assert.equal(get(baseRecord, 'title'), BOOK_TITLE, 'base-record has the correct title');
      assert.equal(get(projectedExcerpt, 'title'), BOOK_TITLE, 'excerpt has the correct title');
      assert.equal(get(projectedPreview, 'title'), BOOK_TITLE, 'preview has the correct title');

      // a non-whitelisted property
      assert.equal(get(baseRecord, 'description'), BOOK_DESCRIPTION, 'base-record has the correct description');
      assert.equal(get(projectedExcerpt, 'description'), undefined, 'excerpt has no description since it is not whitelisted');
      assert.equal(get(projectedPreview, 'description'), undefined, 'preview has no description since it is not whitelisted');

      // an absent property
      assert.equal(get(baseRecord, 'chapter-1'), undefined, 'base-record has no chapter-1');
      assert.equal(get(projectedExcerpt, 'chapter-1'), undefined, 'excerpt has no chapter-1');
      assert.equal(get(projectedPreview, 'chapter-1'), undefined, 'preview has no chapter-1');

      // a whitelisted property that won't be updated
      assert.equal(get(baseRecord, 'year'), BOOK_YEAR, 'base-record has the correct year');
      assert.equal(get(projectedExcerpt, 'year'), BOOK_YEAR, 'excerpt has the correct year');
      assert.equal(get(projectedPreview, 'year'), BOOK_YEAR, 'preview has the correct year');

      assert.watchedPropertyCounts(
        baseRecordWatcher,
        { title: 0, description: 0, 'chapter-1': 0, year: 0, },
        'Initial baseRecord state');

      assert.watchedPropertyCounts(
        excerptWatcher,
        { title: 0, description: 0, 'chapter-1': 0, year: 0, },
        'Initial excerpt state');

      assert.watchedPropertyCounts(
        previewWatcher,
        { title: 0, description: 0, 'chapter-1': 0, year: 0, },
        'Initial preview state');
    });

    hooks.afterEach(function(assert) {
      let {
        baseRecordWatcher,
        excerptWatcher,
        previewWatcher
      } = this.watchers;

      let {
        baseRecord,
        projectedExcerpt,
        projectedPreview,
      } = this.records;

      assert.watchedPropertyCounts(
        baseRecordWatcher,
        { title: 1, 'chapter-1': 1, year: 0, },
        'Final baseRecord state');

      assert.watchedPropertyCounts(
        excerptWatcher,
        { title: 1, description: 0, 'chapter-1': 0, year: 0, },
        'Final excerpt state');

      assert.watchedPropertyCounts(
        previewWatcher,
        { title: 1, description: 0, 'chapter-1': 1, year: 0, },
        'Final preview state');

      baseRecordWatcher.unwatch();
      excerptWatcher.unwatch();
      previewWatcher.unwatch();

      // set to an existing property
      assert.equal(get(baseRecord, 'title'), NEW_TITLE, 'base-record has the correct title');
      assert.equal(get(projectedExcerpt, 'title'), NEW_TITLE, 'excerpt has the correct title');
      assert.equal(get(projectedPreview, 'title'), NEW_TITLE, 'preview has the correct title');

      // set to a previously absent property
      assert.equal(get(baseRecord, 'chapter-1'), NEW_CHAPTER_TEXT, 'base-record has the correct chapter-1');
      assert.equal(get(projectedExcerpt, 'chapter-1'), undefined, 'excerpt has the correct chapter-1');
      assert.equal(get(projectedPreview, 'chapter-1'), NEW_CHAPTER_TEXT, 'preview has the correct chapter-1');

      // a whitelisted non-updated property
      assert.equal(get(baseRecord, 'year'), BOOK_YEAR, 'base-record has the correct year');
      assert.equal(get(projectedExcerpt, 'year'), BOOK_YEAR, 'excerpt has the correct year');
      assert.equal(get(projectedPreview, 'year'), BOOK_YEAR, 'preview has the correct year');

      // a non-whitelisted property
      assert.equal(get(projectedExcerpt, 'description'), undefined, 'excerpt has no description since it is not whitelisted');
      assert.equal(get(projectedPreview, 'description'), undefined, 'preview has no description since it is not whitelisted');

      this.watchers = null;
      this.records = null;
    });

    test('Setting on the base-record updates projections', function(assert) {
      let {
        baseRecord,
      } = this.records;

      run(() => {
        set(baseRecord, 'chapter-1', NEW_CHAPTER_TEXT);
        set(baseRecord, 'title', NEW_TITLE);
        set(baseRecord, 'description', NEW_DESCRIPTION);
      });

      let {
        baseRecordWatcher,
      } = this.watchers;

      let baseCounters = baseRecordWatcher.counters;

      assert.watchedPropertyCount(baseCounters.description, 1, 'Afterwards we have dirtied baseRecord.description');
      assert.equal(get(baseRecord, 'description'), NEW_DESCRIPTION, 'base-record has the correct description');
    });

    test('Updating the base-record updates projections', function(assert) {
      let store = this.store();
      let {
        baseRecord,
      } = this.records;

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
            meta: {
              projectionTypes: [BOOK_CLASS_PATH]
            }
          },
        });
      });

      let {
        baseRecordWatcher,
      } = this.watchers;

      let baseCounters = baseRecordWatcher.counters;

      assert.watchedPropertyCount(baseCounters.description, 1, 'Afterwards we have dirtied baseRecord.description');
      assert.equal(get(baseRecord, 'description'), NEW_DESCRIPTION, 'base-record has the correct description');
    });

    test('Setting a projection updates the base-record and other projections', function(assert) {
      let preview = this.records.projectedPreview;
      let baseRecord = this.records.baseRecord;

      run(() => {
        set(preview, 'chapter-1', NEW_CHAPTER_TEXT);
        set(preview, 'title', NEW_TITLE);
      });

      assert.throws(() => {
        run(() => { set(preview, 'description', NEW_DESCRIPTION); });
      }, /whitelist/gi, 'Setting a non-whitelisted property throws an error');
      assert.watchedPropertyCount(this.watchers.baseRecordWatcher.counters.description, 0, 'Afterwards we have not dirtied baseRecord.description');
      assert.equal(get(baseRecord, 'description'), BOOK_DESCRIPTION, 'base-record has the correct description');
    });

    // Skipped because we cannot really simulate an update to a projection, it is always an update to the base record
    // only fetches are something we can distinguish
    skip('Updating a projection updates sthe base-record and other projections', function(assert) {
      let baseRecord = this.records.baseRecord;
      let store = this.store();

      run(() => {
        store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_CLASS_PATH,
            meta: {
              projectionTypes: [BOOK_EXCERPT_PROJECTION_CLASS_PATH],
            },
            attributes: {
              title: NEW_TITLE,
              'chapter-1': NEW_CHAPTER_TEXT,
              /*
                The below update is invalid because in the real world the schema was are given is also used
                to create the payload the API gives us, so we could not have properties from the API that don't
                exist in the whitelist.
               */
              // description: NEW_DESCRIPTION,
            }
          },
        });
      });

      assert.watchedPropertyCount(this.watchers.baseRecordWatcher.counters.description, 0, 'Afterwards we have not dirtied baseRecord.description');
      assert.equal(get(baseRecord, 'description'), BOOK_DESCRIPTION, 'base-record has the correct description');
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
      const store = this.store();

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
        'author', 'author.name', 'author.age', 'author.location', // embedded type
      ];
      let baseRecordWatcher = watchProperties(baseRecord, watchedProperties);
      let excerptWatcher = watchProperties(projectedExcerpt, watchedProperties);
      let previewWatcher = watchProperties(projectedPreview, watchedProperties);

      this.watchers = {
        baseRecordWatcher,
        excerptWatcher,
        previewWatcher
      };

      // an embedded whitelisted property
      assert.equal(get(baseRecord, 'author.location'), AUTHOR_LOCATION, 'base-record has the correct author.location');
      assert.equal(get(projectedExcerpt, 'author.location'), AUTHOR_LOCATION, 'excerpt has the correct author.location');
      assert.equal(get(projectedPreview, 'author.location'), AUTHOR_LOCATION, 'preview has the correct author.location');

      // an embedded non-whitelisted property
      assert.equal(get(baseRecord, 'author.age'), AUTHOR_AGE, 'base-record has the correct author.age');
      assert.equal(get(projectedExcerpt, 'author.age'), AUTHOR_AGE, 'excerpt has the correct author.age');
      assert.equal(get(projectedPreview, 'author.age'), undefined, 'preview has the correct author.age');

      // an embedded whitelisted property that won't be updated
      assert.equal(get(baseRecord, 'author.name'), AUTHOR_NAME, 'base-record has the correct author.name');
      assert.equal(get(projectedExcerpt, 'author.name'), AUTHOR_NAME, 'excerpt has the correct author.name');
      assert.equal(get(projectedPreview, 'author.name'), AUTHOR_NAME, 'preview has the correct author.name');

      assert.watchedPropertyCounts(
        baseRecordWatcher,
        { author: 0, 'author.name': 0, 'author.location': 0, 'author.age': 0, },
        'Initial baseRecord state');

      assert.watchedPropertyCounts(
        excerptWatcher,
        { author: 0, 'author.name': 0, 'author.location': 0, 'author.age': 0, },
        'Initial excerpt state');

      assert.watchedPropertyCounts(
        previewWatcher,
        { author: 0, 'author.name': 0, 'author.location': 0, 'author.age': 0, },
        'Initial preview state');
    });

    hooks.afterEach(function(assert) {
      let {
        baseRecordWatcher,
        excerptWatcher,
        previewWatcher
      } = this.watchers;

      let {
        baseRecord,
        projectedExcerpt,
        projectedPreview,
      } = this.records;

      assert.watchedPropertyCounts(
        baseRecordWatcher,
        { author: 0, 'author.name': 0, 'author.location': 1, },
        'Final baseRecord state');

      assert.watchedPropertyCounts(
        excerptWatcher,
        { author: 0, 'author.name': 0, 'author.location': 1, },
        'Final excerpt state');

      assert.watchedPropertyCounts(
        previewWatcher,
        { author: 0, 'author.name': 0, 'author.location': 1, 'author.age': 0, },
        'Final preview state');

      baseRecordWatcher.unwatch();
      excerptWatcher.unwatch();
      previewWatcher.unwatch();

      // an embedded whitelisted property
      assert.equal(get(baseRecord, 'author.location'), NEW_AUTHOR_LOCATION, 'base-record has the correct author.location');
      assert.equal(get(projectedExcerpt, 'author.location'), NEW_AUTHOR_LOCATION, 'excerpt has the correct author.location');
      assert.equal(get(projectedPreview, 'author.location'), NEW_AUTHOR_LOCATION, 'preview has the correct author.location');

      // an embedded non-whitelisted property
      assert.equal(get(projectedPreview, 'author.age'), undefined, 'preview has the correct author.age');

      // an embedded whitelisted property that won't be updated
      assert.equal(get(baseRecord, 'author.name'), AUTHOR_NAME, 'base-record has the correct author.name');
      assert.equal(get(projectedExcerpt, 'author.name'), AUTHOR_NAME, 'excerpt has the correct author.name');
      assert.equal(get(projectedPreview, 'author.name'), AUTHOR_NAME, 'preview has the correct author.name');

      this.watchers = null;
      this.records = null;
    });

    test('Setting an embedded object property on the base-record updates the value for projections', function(assert) {
      let {
        baseRecord,
        projectedExcerpt,
      } = this.records;

      run(() => {
        set(baseRecord, 'author.location', NEW_AUTHOR_LOCATION);
        set(baseRecord, 'author.age', NEW_AUTHOR_AGE);
      });

      let {
        baseRecordWatcher,
        excerptWatcher
      } = this.watchers;

      let baseCounters = baseRecordWatcher.counters;
      let excerptCounters = excerptWatcher.counters;

      assert.watchedPropertyCount(baseCounters['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
      assert.watchedPropertyCount(excerptCounters['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
      assert.equal(get(baseRecord, 'author.age'), NEW_AUTHOR_AGE, 'base-record has the correct author.age');
      assert.equal(get(projectedExcerpt, 'author.age'), NEW_AUTHOR_AGE, 'excerpt has the correct author.age');

    });

    test('Updating an embedded object property on the base-record updates the value for projections', function(assert) {
      let store = this.store();
      let {
        baseRecord,
        projectedExcerpt,
      } = this.records;

      run(() => {
        store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_CLASS_PATH,
            attributes: {
              author: {
                location: NEW_AUTHOR_LOCATION,
                age: NEW_AUTHOR_AGE,
              }
            },
            meta: {
              projectionTypes: [BOOK_CLASS_PATH]
            }
          },
        });
      });

      let {
        baseRecordWatcher,
        excerptWatcher
      } = this.watchers;

      let baseCounters = baseRecordWatcher.counters;
      let excerptCounters = excerptWatcher.counters;

      assert.watchedPropertyCount(baseCounters['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
      assert.watchedPropertyCount(excerptCounters['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
      assert.equal(get(baseRecord, 'author.age'), NEW_AUTHOR_AGE, 'base-record has the correct author.age');
      assert.equal(get(projectedExcerpt, 'author.age'), NEW_AUTHOR_AGE, 'excerpt has the correct author.age');
    });

    test('Setting an embedded object property on a projection updates the base-record and other projections', function(assert) {
      let {
        baseRecord,
        projectedExcerpt,
      } = this.records;
      let {
        baseRecordWatcher,
        excerptWatcher
      } = this.watchers;
      let baseCounters = baseRecordWatcher.counters;
      let excerptCounters = excerptWatcher.counters;

      run(() => {
        set(projectedExcerpt, 'author.location', NEW_AUTHOR_LOCATION);
        set(projectedExcerpt, 'author.age', NEW_AUTHOR_AGE);
      });

      assert.watchedPropertyCount(baseCounters['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
      assert.watchedPropertyCount(excerptCounters['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
      assert.equal(get(baseRecord, 'author.age'), NEW_AUTHOR_AGE, 'base-record has the correct author.age');
      assert.equal(get(projectedExcerpt, 'author.age'), NEW_AUTHOR_AGE, 'excerpt has the correct author.age');
    });

    test('Setting an embedded object property on a nested projection updates the base-record and other projections', function(assert) {
      let {
        baseRecord,
        projectedExcerpt,
        projectedPreview,
      } = this.records;

      run(() => {
        set(projectedPreview, 'author.location', NEW_AUTHOR_LOCATION);
      });

      assert.throws(() => {
        run(() => { set(projectedPreview, 'author.age', NEW_AUTHOR_AGE); });
      }, /whitelist/gi, 'Setting a non-whitelisted property on a projection over an embedded object throws an error');

      let {
        baseRecordWatcher,
        excerptWatcher
      } = this.watchers;
      let baseCounters = baseRecordWatcher.counters;
      let excerptCounters = excerptWatcher.counters;

      assert.watchedPropertyCount(baseCounters['author.age'], 0, 'Afterwards we have not dirtied excerpt.author.age');
      assert.watchedPropertyCount(excerptCounters['author.age'], 0, 'Afterwards we have not dirtied excerpt.author.age');
      assert.equal(get(baseRecord, 'author.age'), AUTHOR_AGE, 'base-record has the correct author.age');
      assert.equal(get(projectedExcerpt, 'author.age'), AUTHOR_AGE, 'excerpt has the correct author.age');
    });

    // Skipped because we cannot really simulate an update to a projection, it is always an update to the base record
    // only fetches are something we can distinguish
    skip('Updating an embedded object property on a projection updates the base-record and other projections', function(assert) {
      let store = this.store();
      let {
        baseRecord,
        projectedExcerpt,
      } = this.records;

      run(() => {
        store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_CLASS_PATH,
            meta: {
              projectionTypes: [BOOK_EXCERPT_PROJECTION_CLASS_PATH],
            },
            attributes: {
              author: {
                location: NEW_AUTHOR_LOCATION,
                age: NEW_AUTHOR_AGE
              }
            }
          },
        });
      });

      let {
        baseRecordWatcher,
        excerptWatcher
      } = this.watchers;
      let baseCounters = baseRecordWatcher.counters;
      let excerptCounters = excerptWatcher.counters;

      run(() => {
        set(projectedExcerpt, 'author.location', NEW_AUTHOR_LOCATION);
        set(projectedExcerpt, 'author.age', NEW_AUTHOR_AGE);
      });

      assert.watchedPropertyCount(baseCounters['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
      assert.watchedPropertyCount(excerptCounters['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
      assert.equal(get(baseRecord, 'author.age'), NEW_AUTHOR_AGE, 'base-record has the correct author.age');
      assert.equal(get(projectedExcerpt, 'author.age'), NEW_AUTHOR_AGE, 'excerpt has the correct author.age');
    });

    skip('Updating an embedded object property on a nested projection updates the base-record and other projections', function(assert) {
      let store = this.store();
      let {
        baseRecord,
        projectedExcerpt,
      } = this.records;

      run(() => {
        store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_CLASS_PATH,
            meta: {
              projectionTypes: [BOOK_PREVIEW_PROJECTION_CLASS_PATH],
            },
            attributes: {
              author: {
                location: NEW_AUTHOR_LOCATION,
                /*
                  The below update is invalid because in the real world the schema was are given is also used
                  to create the payload the API gives us, so we could not have properties from the API that don't
                  exist in the whitelist.

                  However, it's lack of presence allows us to test that AUTHOR_AGE is correctly kept post-merge
                 */
                // age: NEW_AUTHOR_AGE
              }
            }
          },
        });
      });

      let {
        baseRecordWatcher,
        excerptWatcher
      } = this.watchers;
      let baseCounters = baseRecordWatcher.counters;
      let excerptCounters = excerptWatcher.counters;

      assert.watchedPropertyCount(baseCounters['author.age'], 0, 'Afterwards we have not dirtied excerpt.author.age');
      assert.watchedPropertyCount(excerptCounters['author.age'], 0, 'Afterwards we have not dirtied excerpt.author.age');
      assert.equal(get(baseRecord, 'author.age'), AUTHOR_AGE, 'base-record has the correct author.age');
      assert.equal(get(projectedExcerpt, 'author.age'), AUTHOR_AGE, 'excerpt has the correct author.age');
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
    const PUBLISHER_NAME = 'MACMILLAN';
    const PUBLISHER_LOCATION = 'Isle of Arran, Scotland';
    const PUBLISHER_OWNER = 'Daniel and Alexander Macmillan';

    // properties for use post-patch
    const NEW_PUBLISHER_LOCATION = 'London, England';
    const NEW_PUBLISHER_OWNER = 'Holtzbrinck Publishing Group';

    hooks.beforeEach(function(assert) {
      const store = this.store();

      let baseRecord;
      let projectedExcerpt;
      let projectedPreview;

      run(() => {
        baseRecord = store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_CLASS_PATH,
            attributes: {
              publisher: `urn:${PUBLISHER_CLASS}:${PUBLISHER_ID}`,
            }
          },
          included: [
            {
              id: PUBLISHER_ID,
              type: PUBLISHER_CLASS,
              attributes: {
                name: PUBLISHER_NAME,
                location: PUBLISHER_LOCATION,
                owner: PUBLISHER_OWNER,
              }
            }, {
              id: PUBLISHER_ID,
              type: NORM_PROJECTED_PUBLISHER_CLASS,
              attributes: {}
            }
          ]
        });

        projectedExcerpt = store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {}
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
        'publisher', 'publisher.name', 'publisher.location', 'publisher.owner' // resolved type
      ];
      let baseRecordWatcher = watchProperties(baseRecord, watchedProperties);
      let excerptWatcher = watchProperties(projectedExcerpt, watchedProperties);
      let previewWatcher = watchProperties(projectedPreview, watchedProperties);

      this.watchers = {
        baseRecordWatcher,
        excerptWatcher,
        previewWatcher
      };

      // a whitelisted non-updated nested model value
      assert.equal(get(baseRecord, 'publisher.name'), PUBLISHER_NAME, 'base-record has the correct publisher.name');
      assert.equal(get(projectedExcerpt, 'publisher.name'), PUBLISHER_NAME, 'excerpt has the correct publisher.name');
      assert.equal(get(projectedPreview, 'publisher.name'), PUBLISHER_NAME, 'preview has the correct publisher.name');

      // a whitelisted updated nested model value
      assert.equal(get(baseRecord, 'publisher.location'), PUBLISHER_LOCATION, 'base-record has the correct publisher.location');
      assert.equal(get(projectedExcerpt, 'publisher.location'), PUBLISHER_LOCATION, 'excerpt has the correct publisher.location');
      assert.equal(get(projectedPreview, 'publisher.location'), PUBLISHER_LOCATION, 'preview has the correct publisher.location');

      // a non-whitelisted updated nested model value
      assert.equal(get(baseRecord, 'publisher.owner'), PUBLISHER_OWNER, 'base-record has the correct publisher.owner');
      assert.equal(get(projectedExcerpt, 'publisher.owner'), PUBLISHER_OWNER, 'excerpt has the correct publisher.owner');
      assert.equal(get(projectedPreview, 'publisher.owner'), undefined, 'preview has the correct publisher.owner');

      assert.watchedPropertyCounts(
        baseRecordWatcher,
        { publisher: 0, 'publisher.name': 0, 'publisher.owner': 0, 'publisher.location': 0, },
        'Initial baseRecord state');

      assert.watchedPropertyCounts(
        excerptWatcher,
        { publisher: 0, 'publisher.name': 0, 'publisher.owner': 0, 'publisher.location': 0, },
        'Initial excerpt state');

      assert.watchedPropertyCounts(
        previewWatcher,
        { publisher: 0, 'publisher.name': 0, 'publisher.owner': 0, 'publisher.location': 0, },
        'Initial preview state');
    });

    hooks.afterEach(function(assert) {
      let {
        baseRecordWatcher,
        excerptWatcher,
        previewWatcher
      } = this.watchers;

      let {
        baseRecord,
        projectedExcerpt,
        projectedPreview,
      } = this.records;

      assert.watchedPropertyCounts(
        baseRecordWatcher,
        { publisher: 0, 'publisher.name': 0, 'publisher.location': 1, },
        'Final baseRecord state');

      assert.watchedPropertyCounts(
        excerptWatcher,
        { publisher: 0, 'publisher.name': 0, 'publisher.location': 1, },
        'Final excerpt state');

      assert.watchedPropertyCounts(
        previewWatcher,
        { publisher: 0, 'publisher.name': 0, 'publisher.owner': 0, 'publisher.location': 1,},
        'Final preview state');

      baseRecordWatcher.unwatch();
      excerptWatcher.unwatch();
      previewWatcher.unwatch();

      // a whitelisted non-updated nested model value
      assert.equal(get(baseRecord, 'publisher.name'), PUBLISHER_NAME, 'base-record has the correct publisher.name');
      assert.equal(get(projectedExcerpt, 'publisher.name'), PUBLISHER_NAME, 'excerpt has the correct publisher.name');
      assert.equal(get(projectedPreview, 'publisher.name'), PUBLISHER_NAME, 'preview has the correct publisher.name');

      // a whitelisted updated nested model value
      assert.equal(get(baseRecord, 'publisher.location'), NEW_PUBLISHER_LOCATION, 'base-record has the correct publisher.location');
      assert.equal(get(projectedExcerpt, 'publisher.location'), NEW_PUBLISHER_LOCATION, 'excerpt has the correct publisher.location');
      assert.equal(get(projectedPreview, 'publisher.location'), NEW_PUBLISHER_LOCATION, 'preview has the correct publisher.location');

      // a non-whitelisted updated nested model value
      assert.equal(get(projectedPreview, 'publisher.owner'), undefined, 'preview has the correct publisher.owner');

      this.watchers = null;
      this.records = null;
    });

    test('Setting a resolution property via the base-record updates projections and nested projections', function(assert) {
      let {
        baseRecord,
        projectedExcerpt,
      } = this.records;

      run(() => {
        set(baseRecord, 'publisher.location', NEW_PUBLISHER_LOCATION);
        set(baseRecord, 'publisher.owner', NEW_PUBLISHER_OWNER);
      });

      let {
        baseRecordWatcher,
        excerptWatcher
      } = this.watchers;

      let baseCounters = baseRecordWatcher.counters;
      let excerptCounters = excerptWatcher.counters;

      assert.watchedPropertyCount(baseCounters['publisher.owner'], 1, 'Afterwards we have dirtied baseRecord.description');
      assert.watchedPropertyCount(excerptCounters['publisher.owner'], 1, 'Afterwards we have dirtied baseRecord.description');
      assert.equal(get(baseRecord, 'publisher.owner'), NEW_PUBLISHER_OWNER, 'base-record has the correct publisher.owner');
      assert.equal(get(projectedExcerpt, 'publisher.owner'), NEW_PUBLISHER_OWNER, 'excerpt has the correct publisher.owner');
    });

    test('Updating a resolution property via the base-record updates projections and nested projections', function(assert) {
      let store = this.store();
      let {
        baseRecord,
        projectedExcerpt,
      } = this.records;

      run(() => {
        store.push({
          data: {
            id: PUBLISHER_ID,
            type: PUBLISHER_CLASS,
            attributes: {
              location: NEW_PUBLISHER_LOCATION,
              owner: NEW_PUBLISHER_OWNER
            },
          }
        });
      });

      let {
        baseRecordWatcher,
        excerptWatcher
      } = this.watchers;

      let baseCounters = baseRecordWatcher.counters;
      let excerptCounters = excerptWatcher.counters;

      assert.watchedPropertyCount(baseCounters['publisher.owner'], 1, 'Afterwards we have dirtied baseRecord.description');
      assert.watchedPropertyCount(excerptCounters['publisher.owner'], 1, 'Afterwards we have dirtied baseRecord.description');
      assert.equal(get(baseRecord, 'publisher.owner'), NEW_PUBLISHER_OWNER, 'base-record has the correct publisher.owner');
      assert.equal(get(projectedExcerpt, 'publisher.owner'), NEW_PUBLISHER_OWNER, 'excerpt has the correct publisher.owner');
    });

    test('Setting a resolution property via a projection updates the base-record, other projections and nested projections', function(assert) {
      let {
        baseRecord,
        projectedExcerpt,
      } = this.records;

      run(() => {
        set(projectedExcerpt, 'publisher.location', NEW_PUBLISHER_LOCATION);
        set(projectedExcerpt, 'publisher.owner', NEW_PUBLISHER_OWNER);
      });

      let {
        baseRecordWatcher,
        excerptWatcher
      } = this.watchers;

      let baseCounters = baseRecordWatcher.counters;
      let excerptCounters = excerptWatcher.counters;

      assert.watchedPropertyCount(baseCounters['publisher.owner'], 1, 'Afterwards we have dirtied baseRecord.publisher.owner');
      assert.watchedPropertyCount(excerptCounters['publisher.owner'], 1, 'Afterwards we have dirtied baseRecord.publisher.owner');
      assert.equal(get(baseRecord, 'publisher.owner'), NEW_PUBLISHER_OWNER, 'base-record has the correct publisher.owner');
      assert.equal(get(projectedExcerpt, 'publisher.owner'), NEW_PUBLISHER_OWNER, 'excerpt has the correct publisher.owner');
    });

    test('Setting a resolution property via a nested projection updates the base-record and other projections', function(assert) {
      let {
        baseRecord,
        projectedExcerpt,
        projectedPreview,
      } = this.records;

      run(() => {
        set(projectedPreview, 'publisher.location', NEW_PUBLISHER_LOCATION);
      });

      assert.throws(() => {
        run(() => { set(projectedPreview, 'publisher.owner', NEW_PUBLISHER_OWNER); });
      }, /whitelist/gi, 'Setting a non-whitelisted property on a projection over a resolved record throws an error');

      let {
        baseRecordWatcher,
        excerptWatcher
      } = this.watchers;

      let baseCounters = baseRecordWatcher.counters;
      let excerptCounters = excerptWatcher.counters;

      assert.watchedPropertyCount(baseCounters['publisher.owner'], 0, 'Afterwards we have not dirtied baseRecord.publisher.owner');
      assert.watchedPropertyCount(excerptCounters['publisher.owner'], 0, 'Afterwards we have not  dirtied baseRecord.publisher.owner');
      assert.equal(get(baseRecord, 'publisher.owner'), PUBLISHER_OWNER, 'base-record has the correct publisher.owner');
      assert.equal(get(projectedExcerpt, 'publisher.owner'), PUBLISHER_OWNER, 'excerpt has the correct publisher.owner');
    });

    skip('Updating a resolution property via a projection updates the base-record, other projections and nested projections', function(assert) {
      let store = this.store();

      let {
        baseRecord,
        projectedExcerpt,
      } = this.records;

      run(() => {
        store.push({
          data: {
            id: PUBLISHER_ID,
            type: PUBLISHER_CLASS,
            attributes: {
              location: NEW_PUBLISHER_LOCATION,
              owner: NEW_PUBLISHER_OWNER
            }
          }
        });
      });

      let {
        baseRecordWatcher,
        excerptWatcher
      } = this.watchers;

      let baseCounters = baseRecordWatcher.counters;
      let excerptCounters = excerptWatcher.counters;

      assert.watchedPropertyCount(baseCounters['publisher.owner'], 1, 'Afterwards we have dirtied baseRecord.description');
      assert.watchedPropertyCount(excerptCounters['publisher.owner'], 1, 'Afterwards we have dirtied baseRecord.description');
      assert.equal(get(baseRecord, 'publisher.owner'), NEW_PUBLISHER_OWNER, 'base-record has the correct publisher.owner');
      assert.equal(get(projectedExcerpt, 'publisher.owner'), NEW_PUBLISHER_OWNER, 'excerpt has the correct publisher.owner');
    });

    skip('Updating a resolution property via a nested projection updates the base-record, other projections', function(assert) {
      let store = this.store();
      let {
        baseRecord,
        projectedExcerpt,
      } = this.records;

      run(() => {
        store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_CLASS_PATH,
            meta: {
              projectionTypes: [BOOK_EXCERPT_PROJECTION_CLASS_PATH],
            },
            attributes: {}
          },
          included: [
            {
              id: PUBLISHER_ID,
              type: PUBLISHER_CLASS,
              meta: {
                projectionTypes: [PROJECTED_PUBLISHER_CLASS]
              },
              attributes: {
                location: NEW_PUBLISHER_LOCATION,
                /*
                  The below update is invalid because in the real world the schema was are given is also used
                  to create the payload the API gives us, so we could not have properties from the API that don't
                  exist in the whitelist.

                  However, it's lack of presence allows us to test that PUBLISHER_OWNER is correctly kept post-merge
                 */
                // owner: NEW_PUBLISHER_OWNER
              }
            }
          ]
        });
      });

      let {
        baseRecordWatcher,
        excerptWatcher
      } = this.watchers;

      let baseCounters = baseRecordWatcher.counters;
      let excerptCounters = excerptWatcher.counters;

      assert.watchedPropertyCount(baseCounters['publisher.owner'], 0, 'Afterwards we have not dirtied baseRecord.publisher.owner');
      assert.watchedPropertyCount(excerptCounters['publisher.owner'], 0, 'Afterwards we have not  dirtied baseRecord.publisher.owner');
      assert.equal(get(baseRecord, 'publisher.owner'), PUBLISHER_OWNER, 'base-record has the correct publisher.owner');
      assert.equal(get(projectedExcerpt, 'publisher.owner'), PUBLISHER_OWNER, 'excerpt has the correct publisher.owner');
    });
  });

  todo(`Updates to a projection's non-whitelisted attributes do not cause a projection to be dirtied`, function() {});

  todo(`Unloading a projection does not unload the base-record`, function() {});
  todo(`Unloading the base-record does not unload the projection`, function() {});
  todo(`Destroying the base-record does not unload/destroy the projection`, function() {});
  todo(`Destroying the projection does not unload/destroy the base-record`, function() {});

  // TL;DR we can only proxy something that has an ID
  todo(`Saving a newly created projection doesn't mess up the state of the base record`, function() {});

  todo(`Creating a projection with an unloaded schema`, function() {});
  todo(`Finding a projection with an unloaded schema`, function() {});
  todo(`fetched schemas must be complete (projected types must also be included)`, function() {});
});
