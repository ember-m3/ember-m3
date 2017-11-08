import { module, test, skip } from 'qunit';
import { setupTest }  from 'ember-qunit';
import Ember from 'ember';
import MegamorphicModel from 'ember-m3/model';
import SchemaManager from 'ember-m3/schema-manager';
import { initialize as initializeStore } from 'ember-m3/initializers/m3-store';
import { watchProperty} from '../helpers/watch-property';

const {
  get,
  set,
  run,
  RSVP: { Promise },
} = Ember;

// TODO: this is annoying but name normalization means we get the wrong
//  for modelName in snapshots. Should fix this upstream by dropping name
//  normalization.  See #11
const BOOK_CLASS_PATH = 'com.example.bookstore.Book';
const NORM_BOOK_CLASS_PATH = 'com.example.bookstore.book';
const BOOK_EXCERPT_PROJECTION_CLASS_PATH = 'com.example.bookstore.projection.BookExcerpt';
const NORM_BOOK_EXCERPT_PROJECTION_CLASS_PATH = 'com.example.bookstore.projection.book-excerpt';
const BOOK_PREVIEW_PROJECTION_CLASS_PATH = 'com.example.bookstore.projection.BookPreview';
// const NORM_BOOK_PREVIEW_PROJECTION_CLASS_PATH = 'com.example.bookstore.projection.book-preview';

module('unit/projection', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function(assert) {
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

      computeAttributeReference(key, value) {
        if (/^isbn:/.test(value)) {
          return {
            id: value,
            type: BOOK_CLASS_PATH,
          }
        } else if (/^urn:(\w+):(.*)/.test(value)) {
          let parts = /^urn:(\w+):(.*)/.exec(value);
          return {
            type: parts[1],
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
        if (modelSchema && modelSchema.attributesTypes && modelSchema.attributesTypes[key]) {
          valueType = modelSchema.attributesTypes[key];
        }
        return {
          type: valueType,
          id: value.id,
          attributes: value,
        }
      },

      models: {
        [BOOK_CLASS_PATH]: {
          aliases: {
            title: 'name',
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
            publisher(value) {
              return `${value}, of course`;
            },
            pubDate(value) {
              return new Date(Date.parse(value));
            }
          }
        },
        [BOOK_EXCERPT_PROJECTION_CLASS_PATH]: {
          projects: BOOK_CLASS_PATH,
          attributes: ['title', 'author', 'chapter-1'],
        },
        [BOOK_PREVIEW_PROJECTION_CLASS_PATH]: {
          projects: BOOK_CLASS_PATH,
          attributes: ['title', 'author', 'foreword', 'chapter-1'],
        },
      }
    });
  });

  test(`store.peekRecord() will only return a projection or base-record if it has been fetched`, function(assert) {
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
          }
        }
      });
      store.push({
        data: {
          type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
          id: FETCHED_PROJECTION_ID,
          attributes: {
            title: `Mr. Popper's Penguins`
          }
        }
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

  test(`store.findRecord() will only fetch a projection or base-model if it has not been fetched previously`, function(assert) {
    assert.expect(5);

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
          }
        }
      });
      store.push({
        data: {
          type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
          id: FETCHED_PROJECTION_ID,
          attributes: {
            title: `Mr. Popper's Penguins`
          }
        }
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
          }
        }
      });

      // intentionally missing 'author'
      projectedRecord = store.push({
        data: {
          id: BOOK_ID,
          type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
          attributes: {
            title: BOOK_TITLE
          }
        }
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

  module('property notifications', function(hooks) {
    // properties for use for initial state
    const BOOK_ID = 'isbn:9780439708181';
    const BOOK_TITLE = 'Adventures in Wonderland';
    const BOOK_AUTHOR = 'Lewis Carroll';
    const BOOK_DESCRIPTION = `Don't get rabbit holed!`;

    // properties for use post-patch
    const NEW_CHAPTER_TEXT = 'So we began again.';
    const NEW_TITLE = 'Through the Looking Glass';
    const NEW_DESCRIPTION = 'Crazy Town';

    hooks.beforeEach((assert) => {
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
              author: BOOK_AUTHOR,
              description: BOOK_DESCRIPTION // description is not whitelisted
            }
          }
        });

        projectedExcerpt = store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {}
          }
        });

        projectedPreview = store.push({
          data: {
            id: BOOK_ID,
            type: BOOK_PREVIEW_PROJECTION_CLASS_PATH,
            attributes: {}
          }
        });
      });

      this.records = {
        baseRecord,
        projectedExcerpt,
        projectedPreview,
      };

      let baseRecordTitle = watchProperty(baseRecord, 'title');
      let baseRecordDescription = watchProperty(baseRecord, 'description');
      let baseRecordChapter = watchProperty(baseRecord, 'chapter-1');
      let baseRecordAuthor = watchProperty(baseRecord, 'author');

      let excerptTitle = watchProperty(projectedExcerpt, 'title');
      let excerptDescription = watchProperty(projectedExcerpt, 'description');
      let excerptChapter = watchProperty(projectedExcerpt, 'chapter-1');
      let excerptAuthor = watchProperty(projectedExcerpt, 'author');

      let previewTitle = watchProperty(projectedPreview, 'title');
      let previewDescription = watchProperty(projectedPreview, 'description');
      let previewChapter = watchProperty(projectedPreview, 'chapter-1');
      let previewAuthor = watchProperty(projectedPreview, 'author');

      this.watchers = {
        baseRecordTitle,
        baseRecordDescription,
        baseRecordChapter,
        baseRecordAuthor,
        excerptTitle,
        excerptDescription,
        excerptChapter,
        excerptAuthor,
        previewTitle,
        previewDescription,
        previewChapter,
        previewAuthor,
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

      // a whitelisted but unset property
      assert.equal(get(baseRecord, 'author'), undefined, 'base-record has the correct author');
      assert.equal(get(projectedExcerpt, 'author'), undefined, 'excerpt has the correct author');
      assert.equal(get(projectedPreview, 'author'), undefined, 'preview has the correct author');

      assert.watchedPropertyCount(baseRecordTitle, 0, 'Initially we have not dirtied baseRecord.title');
      assert.watchedPropertyCount(baseRecordDescription, 0, 'Initially we have not dirtied baseRecord.description');
      assert.watchedPropertyCount(baseRecordChapter, 0, 'Initially we have not dirtied baseRecord.chapter');
      assert.watchedPropertyCount(baseRecordAuthor, 0, 'Initially we have not dirtied baseRecord.author');

      assert.watchedPropertyCount(excerptTitle, 0, 'Initially we have not dirtied excerpt.title');
      assert.watchedPropertyCount(excerptDescription, 0, 'Initially we have not dirtied excerpt.description');
      assert.watchedPropertyCount(excerptChapter, 0, 'Initially we have not dirtied excerpt.chapter');
      assert.watchedPropertyCount(excerptAuthor, 0, 'Initially we have not dirtied excerpt.author');

      assert.watchedPropertyCount(previewTitle, 0, 'Initially we have not dirtied preview.title');
      assert.watchedPropertyCount(previewDescription, 0, 'Initially we have not dirtied preview.description');
      assert.watchedPropertyCount(previewChapter, 0, 'Initially we have not dirtied preview.chapter');
      assert.watchedPropertyCount(previewAuthor, 0, 'Initially we have not dirtied preview.author');
    });

    hooks.afterEach((assert) => {
      let {
        baseRecordTitle,
        baseRecordDescription,
        baseRecordChapter,
        baseRecordAuthor,
        excerptTitle,
        excerptDescription,
        excerptChapter,
        excerptAuthor,
        previewTitle,
        previewDescription,
        previewChapter,
        previewAuthor,
      } = this.watchers;

      let {
        baseRecord,
        projectedExcerpt,
        projectedPreview,
      } = this.records;

      assert.watchedPropertyCount(baseRecordTitle, 1, 'Afterwards we have dirtied baseRecord.title');
      assert.watchedPropertyCount(baseRecordChapter, 1, 'Afterwards we have dirtied baseRecord.chapter');
      assert.watchedPropertyCount(baseRecordAuthor, 0, 'Afterwards we have not dirtied baseRecord.author');

      assert.watchedPropertyCount(excerptTitle, 1, 'Afterwards we have dirtied excerpt.title');
      assert.watchedPropertyCount(excerptDescription, 0, 'Afterwards we have not dirtied excerpt.description');
      assert.watchedPropertyCount(excerptChapter, 1, 'Afterwards we have dirtied excerpt.chapter');
      assert.watchedPropertyCount(excerptAuthor, 0, 'Afterwards we have not dirtied excerpt.author');

      assert.watchedPropertyCount(previewTitle, 1, 'Afterwards we have dirtied preview.title');
      assert.watchedPropertyCount(previewDescription, 0, 'Afterwards we have not dirtied preview.description');
      assert.watchedPropertyCount(previewChapter, 1, 'Afterwards we have dirtied preview.chapter');
      assert.watchedPropertyCount(previewAuthor, 0, 'Afterwards we have not dirtied preview.author');

      baseRecordTitle.unwatch();
      baseRecordDescription.unwatch();
      baseRecordChapter.unwatch();
      baseRecordAuthor.unwatch();

      excerptTitle.unwatch();
      excerptDescription.unwatch();
      excerptChapter.unwatch();
      excerptAuthor.unwatch();

      previewTitle.unwatch();
      previewDescription.unwatch();
      previewChapter.unwatch();
      previewAuthor.unwatch();

      // set to an existing property
      assert.equal(get(baseRecord, 'title'), NEW_TITLE, 'base-record has the correct title');
      assert.equal(get(projectedExcerpt, 'title'), NEW_TITLE, 'excerpt has the correct title');
      assert.equal(get(projectedPreview, 'title'), NEW_TITLE, 'preview has the correct title');

      // set to a previously absent property
      assert.equal(get(baseRecord, 'chapter-1'), NEW_CHAPTER_TEXT, 'base-record has the correct chapter-1');
      assert.equal(get(projectedExcerpt, 'chapter-1'), NEW_CHAPTER_TEXT, 'excerpt has the correct chapter-1');
      assert.equal(get(projectedPreview, 'chapter-1'), NEW_CHAPTER_TEXT, 'preview has the correct chapter-1');

      // a whitelisted non-updated property
      assert.equal(get(baseRecord, 'author'), BOOK_AUTHOR, 'base-record has the correct author');
      assert.equal(get(projectedExcerpt, 'author'), BOOK_AUTHOR, 'excerpt has the correct author');
      assert.equal(get(projectedPreview, 'author'), BOOK_AUTHOR, 'preview has the correct author');

      // a non-whitelisted property
      assert.equal(get(projectedExcerpt, 'description'), undefined, 'excerpt has no description since it is not whitelisted');
      assert.equal(get(projectedPreview, 'description'), undefined, 'preview has no description since it is not whitelisted');

      this.watchers = null;
      this.records = null;
    });

    test('Setting on the base-record updates projections', function(assert) {
      let record = this.records.baseRecord;

      run(() => {
        set(record, 'chapter-1', NEW_CHAPTER_TEXT);
        set(record, 'title', NEW_TITLE);
        set(record, 'description', NEW_DESCRIPTION);
      });

      assert.watchedPropertyCount(this.watchers.baseRecordDescription, 1, 'Afterwards we have dirtied baseRecord.description');
      assert.equal(get(record, 'description'), NEW_DESCRIPTION, 'base-record has the correct description');
    });

    test('Updating the base-record updates projections', function(assert) {
      let record = this.records.baseRecord;
      let store = this.store();

      run(() => {
        store.push({
          data: {
            id: get(record, 'id'),
            type: BOOK_CLASS_PATH,
            attributes: {
              title: NEW_TITLE,
              'chapter-1': NEW_CHAPTER_TEXT,
              description: NEW_DESCRIPTION
            }
          }
        });
      });

      assert.watchedPropertyCount(this.watchers.baseRecordDescription, 1, 'Afterwards we have dirtied baseRecord.description');
      assert.equal(get(record, 'description'), NEW_DESCRIPTION, 'base-record has the correct description');
    });

    test('Setting a projection updates the base-record and other projections', function(assert) {
      let excerpt = this.records.projectedExcerpt;
      let baseRecord = this.records.baseRecord;

      run(() => {
        set(excerpt, 'chapter-1', NEW_CHAPTER_TEXT);
        set(excerpt, 'title', NEW_TITLE);
      });

      assert.throws(() => {
        run(() => { set(excerpt, 'description', NEW_DESCRIPTION); });
      }, /whitelist/gi, 'Setting a non-whitelisted property throws an error');
      assert.watchedPropertyCount(this.watchers.baseRecordDescription, 0, 'Afterwards we have not dirtied baseRecord.description');
      assert.equal(get(baseRecord, 'description'), BOOK_DESCRIPTION, 'base-record has the correct description');
    });

    test('Updating a projection updates the base-record and other projections', function(assert) {
      let excerpt = this.records.projectedExcerpt;
      let baseRecord = this.records.baseRecord;
      let store = this.store();

      run(() => {
        store.push({
          data: {
            id: get(excerpt, 'id'),
            type: BOOK_EXCERPT_PROJECTION_CLASS_PATH,
            attributes: {
              title: NEW_TITLE,
              'chapter-1': NEW_CHAPTER_TEXT,
              /*
                The below update is invalid because in the real world the schema was are given is also used
                to create the payload the API gives us, so we could not have properties from the API that don't
                exist in the whitelist.
               */
              // description: NEW_DESCRIPTION
            }
          }
        });
      });

      assert.watchedPropertyCount(this.watchers.baseRecordDescription, 0, 'Afterwards we have not dirtied baseRecord.description');
      assert.equal(get(baseRecord, 'description'), BOOK_DESCRIPTION, 'base-record has the correct description');
    });
  });

  skip(`Updates to a projection's non-whitelisted attributes do not cause a projection to be dirtied`, function() {});

  skip(`Unloading a projection does not unload the base-record`, function() {});

  skip(`Unloading the base-record does not unload the projection`, function() {});

  skip(`Destroying the base-record does not unload/destroy the projection`, function() {});

  skip(`Destroying the projection does not unload/destroy the base-record`, function() {});

  skip(`Creating a projection with an unloaded schema`, function() {});

  skip(`Finding a projection with an unloaded schema`, function() {});
});
