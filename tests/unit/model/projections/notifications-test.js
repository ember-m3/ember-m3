import { module, test } from 'qunit';
import { get, set } from '@ember/object';
import { run } from '@ember/runloop';
import { watchProperties } from '../../helpers/watch-property';
import {
  setupTestPerSchema,
  BOOK_CLASS_PATH,
  BOOK_EXCERPT_PROJECTION_CLASS_PATH,
  BOOK_PREVIEW_PROJECTION_CLASS_PATH,
  PUBLISHER_CLASS,
  PROJECTED_PUBLISHER_CLASS,
} from './common';

for (let { name, setupTest } of setupTestPerSchema()) {
  module(`unit/projections/notifications: ${name}`, function (hooks) {
    setupTest(hooks);

    module('property notifications on top-level attributes', function (hooks) {
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

      hooks.beforeEach(function (assert) {
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

      hooks.afterEach(function (assert) {
        let { baseRecordWatcher, excerptWatcher, previewWatcher } = this.watchers;

        let { baseRecord, projectedExcerpt, projectedPreview } = this.records;

        assert.deepEqual(
          baseRecordWatcher.counts,
          {
            title: 1,
            'chapter-1': 1,
            year: 0,
            description: baseRecordWatcher.counts.description,
          },
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

      test('Setting on the base-record updates projections', function (assert) {
        let { baseRecord } = this.records;

        run(() => {
          set(baseRecord, 'chapter-1', NEW_CHAPTER_TEXT);
          set(baseRecord, 'title', NEW_TITLE);
          set(baseRecord, 'description', NEW_DESCRIPTION);
        });

        let { baseRecordWatcher } = this.watchers;

        let baseCounts = baseRecordWatcher.counts;

        assert.equal(
          baseCounts.description,
          1,
          'Afterwards we have dirtied baseRecord.description'
        );
        assert.equal(
          get(baseRecord, 'description'),
          NEW_DESCRIPTION,
          'base-record has the correct description'
        );
      });

      test('Updating the base-record updates projections', function (assert) {
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

        assert.equal(
          baseCounts.description,
          1,
          'Afterwards we have dirtied baseRecord.description'
        );
        assert.equal(
          get(baseRecord, 'description'),
          NEW_DESCRIPTION,
          'base-record has the correct description'
        );
      });

      test('Setting a projection updates the base-record and other projections', function (assert) {
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

      test('Updating a projection updates the base-record and other projections', function (assert) {
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

    module('property notifications on embedded objects', function (hooks) {
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

      hooks.beforeEach(function (assert) {
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

      hooks.afterEach(function (assert) {
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

      test('Setting an embedded object property on the base-record updates the value for projections', function (assert) {
        let { baseRecord, projectedExcerpt } = this.records;

        run(() => {
          set(baseRecord, 'author.location', NEW_AUTHOR_LOCATION);
          set(baseRecord, 'author.age', NEW_AUTHOR_AGE);
        });

        let { baseRecordWatcher, excerptWatcher } = this.watchers;

        let baseCounts = baseRecordWatcher.counts;
        let excerptCounts = excerptWatcher.counts;

        assert.equal(baseCounts['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
        assert.equal(
          excerptCounts['author.age'],
          1,
          'Afterwards we have dirtied excerpt.author.age'
        );
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

      test('Updating an embedded object property on the base-record updates the value for projections', function (assert) {
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
        assert.equal(
          excerptCounts['author.age'],
          1,
          'Afterwards we have dirtied excerpt.author.age'
        );
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

      test('Setting an embedded object property on a projection updates the base-record and other projections', function (assert) {
        let { baseRecord, projectedExcerpt } = this.records;
        let { baseRecordWatcher, excerptWatcher } = this.watchers;

        run(() => {
          set(projectedExcerpt, 'author.location', NEW_AUTHOR_LOCATION);
          set(projectedExcerpt, 'author.age', NEW_AUTHOR_AGE);
        });

        let baseCounts = baseRecordWatcher.counts;
        let excerptCounts = excerptWatcher.counts;

        assert.equal(baseCounts['author.age'], 1, 'Afterwards we have dirtied excerpt.author.age');
        assert.equal(
          excerptCounts['author.age'],
          1,
          'Afterwards we have dirtied excerpt.author.age'
        );
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

      test('Setting an embedded object property on a nested projection updates the base-record and other projections', function (assert) {
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

      test('Updating an embedded object property on a projection updates the base-record and other projections', function (assert) {
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
        assert.equal(
          excerptCounts['author.age'],
          1,
          'Afterwards we have dirtied excerpt.author.age'
        );
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

      test('Updating an embedded object property on a nested projection updates the base-record and other projections', function (assert) {
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

    module('property notifications on resolved objects', function (hooks) {
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

      hooks.beforeEach(function (assert) {
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

      hooks.afterEach(function (assert) {
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

      test('Setting a resolution property via the base-record updates projections and nested projections', function (assert) {
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

      test('Updating a resolution property via the base-record updates projections and nested projections', function (assert) {
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

      test('Setting a resolution property via a projection updates the base-record, other projections and nested projections', function (assert) {
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

      test('Setting a resolution property via a nested projection updates the base-record and other projections', function (assert) {
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

      test('Updating a resolution property via a projection updates the base-record, other projections and nested projections', function (assert) {
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

      test('Updating a resolution property via a nested projection updates the base-record, other projections', function (assert) {
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
  });
}
