import { module, test, skip } from 'qunit';
import EmberObject, { get } from '@ember/object';
import { CUSTOM_MODEL_CLASS } from 'ember-m3/-infra/features';
import { run } from '@ember/runloop';
import {
  setupTestPerSchema,
  BOOK_CLASS_PATH,
  NORM_BOOK_CLASS_PATH,
  BOOK_EXCERPT_PROJECTION_CLASS_PATH,
  BOOK_PREVIEW_PROJECTION_CLASS_PATH,
} from './common';

for (let { name, setupTest } of setupTestPerSchema()) {
  module(`unit/projections/unloading: ${name}`, function (hooks) {
    setupTest(hooks);
    const BOOK_ID = 'isbn:123';
    const OTHER_BOOK_ID = 'isbn:456';
    const OTHER_BOOK_URN = `urn:${NORM_BOOK_CLASS_PATH}:${OTHER_BOOK_ID}`;
    const BOOK_TITLE = 'Alice in Wonderland';

    hooks.beforeEach(function () {
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

    skip(`Deleting the base-record also deletes the projections`, function (assert) {
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

    skip(`Deleting the projection also deletes the base-record`, function (assert) {
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

    test(`Unloading a projection does not unload the base-record and other projections`, function (assert) {
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
      if (CUSTOM_MODEL_CLASS) {
        assert.equal(get(baseRecord, '_recordData.isDestroyed'), false);
      } else {
        assert.equal(get(baseRecord, '_internalModel.isDestroyed'), false);
      }
      assert.equal(get(baseRecord, 'title'), BOOK_TITLE);

      // projectedExcerpt is still arond
      assert.equal(this.store.hasRecordForId(BOOK_EXCERPT_PROJECTION_CLASS_PATH, BOOK_ID), true);
      assert.equal(get(projectedExcerpt, 'isDestroyed'), false);
      if (CUSTOM_MODEL_CLASS) {
        assert.equal(get(projectedExcerpt, '_recordData.isDestroyed'), false);
      } else {
        assert.equal(get(projectedExcerpt, '_internalModel.isDestroyed'), false);
      }
      assert.equal(get(projectedExcerpt, 'title'), BOOK_TITLE);
    });

    test(`Unloading the base-record does not unload the projection`, function (assert) {
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
      if (CUSTOM_MODEL_CLASS) {
        assert.equal(get(projectedPreview, '_recordData.isDestroyed'), false);
      } else {
        assert.equal(get(projectedPreview, '_internalModel.isDestroyed'), false);
      }
      assert.equal(get(projectedPreview, 'title'), BOOK_TITLE);
    });

    test('Unloading a record removes it from record arrays, which have reference to it', function (assert) {
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

      let { baseRecord, projectedPreview } = this.records;

      // load the record arrays
      let booksInSeriesBase = get(baseRecord, 'otherBooksInSeries');
      let booksInSeriesProjectedPreview = get(projectedPreview, 'otherBooksInSeries');
      let otherProjectedPreview = get(booksInSeriesProjectedPreview, 'firstObject');

      debugger
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
        booksInSeriesProjectedPreview.objectAt(0),
        null,
        'Expected the projected preview to have been replaced with null in the record array'
      );
      assert.notEqual(
        get(booksInSeriesBase, 'firstObject.isDestroyed'),
        true,
        'Expected record in otherBooksInSeries for base to not have been destroyed'
      );
    });

    skip('Projection list is cleaned up after all projections have been unloaded', function () {});
  });
}
