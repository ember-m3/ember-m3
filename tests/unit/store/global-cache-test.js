import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { run } from '@ember/runloop';
import DefaultSchema from 'ember-m3/services/m3-schema';
import sinon from 'sinon';
import { CUSTOM_MODEL_CLASS } from 'ember-m3/-infra/features';

function _isProjection(modelName) {
  return /-projection$/i.test(modelName);
}

function computeAttributeReference(key, value, modelName, schemaInterface) {
  let refId = schemaInterface.getAttr(`*${key}`);
  if (refId !== undefined) {
    let type = _isProjection(modelName) ? 'com.example.bookstore.BookProjection' : null;

    return {
      id: refId,
      type,
    };
  }
}

class TestSchema extends DefaultSchema {
  includesModel(modelName) {
    return /^com.example.bookstore\./i.test(modelName);
  }
  computeAttribute(key, value, modelName, schemaInterface) {
    let reference = computeAttributeReference(key, value, modelName, schemaInterface);
    if (Array.isArray(reference)) {
      return schemaInterface.managedArray(reference.map((r) => schemaInterface.reference(r)));
    } else if (reference) {
      return schemaInterface.reference(reference);
    }
  }

  computeBaseModelName(normalizedProjectionModelName) {
    if (_isProjection(normalizedProjectionModelName)) {
      return normalizedProjectionModelName.substring(
        0,
        normalizedProjectionModelName.length - '-projection'.length
      );
    }
  }
}

class TestSchemaOldHooks extends DefaultSchema {
  includesModel(modelName) {
    return /^com.example.bookstore\./i.test(modelName);
  }

  computeAttributeReference(key, value, modelName, schemaInterface) {
    return computeAttributeReference(key, value, modelName, schemaInterface);
  }
  computeBaseModelName(normalizedProjectionModelName) {
    if (_isProjection(normalizedProjectionModelName)) {
      return normalizedProjectionModelName.substring(
        0,
        normalizedProjectionModelName.length - '-projection'.length
      );
    }
  }
}

for (let testRun = 0; testRun < 2; testRun++) {
  module(
    `unit/store/global-cache with  ${testRun === 0 ? 'old hooks' : 'with computeAttribute'}`,
    function (hooks) {
      setupTest(hooks);

      hooks.beforeEach(function () {
        this.sinon = sinon.createSandbox();
        if (testRun === 0) {
          this.owner.register('service:m3-schema', TestSchemaOldHooks);
        } else if (testRun === 1) {
          this.owner.register('service:m3-schema', TestSchema);
        }

        this.store = this.owner.lookup('service:store');
      });

      hooks.afterEach(function () {
        this.sinon.restore();
      });

      test('records are added to, and unloaded from, the global m3 cache', function (assert) {
        run(() =>
          this.store.push({
            data: [
              {
                id: 'isbn:9780439708180',
                type: 'com.example.bookstore.Book',
              },
              {
                id: 'isbn:9780439708180/chapter/1',
                type: 'com.example.bookstore.Chapter',
              },
              {
                id: 'isbn:9780439064873',
                type: 'com.example.bookstore.Book',
              },
              {
                id: 'isbn:9780439708180/chapter/2',
                type: 'com.example.bookstore.Chapter',
              },
            ],
          })
        );

        assert.equal(
          this.store.peekAll('com.example.bookstore.Book').length,
          2,
          '2 books are in the cache'
        );
        assert.equal(
          this.store.peekAll('com.example.bookstore.Chapter').length,
          2,
          '2 chapters are in the cache'
        );

        let bookIds = this.store.peekAll('com.example.bookstore.Book').map((x) => x.id);

        assert.deepEqual(
          bookIds,
          ['isbn:9780439708180', 'isbn:9780439064873'],
          'Identity map contains expected models - book'
        );

        let chapterIds = this.store.peekAll('com.example.bookstore.Chapter').map((x) => x.id);

        assert.deepEqual(
          chapterIds,
          ['isbn:9780439708180/chapter/1', 'isbn:9780439708180/chapter/2'],
          'Identity map contains expected models - chapter'
        );

        if (CUSTOM_MODEL_CLASS) {
          assert.deepEqual(
            Object.keys(this.store._globalM3RecordDataCache).sort(),
            [
              'isbn:9780439064873',
              'isbn:9780439708180',
              'isbn:9780439708180/chapter/1',
              'isbn:9780439708180/chapter/2',
            ],
            'global cache contains all m3 models'
          );
        } else {
          assert.deepEqual(
            Object.keys(this.store._globalM3Cache).sort(),
            [
              'isbn:9780439064873',
              'isbn:9780439708180',
              'isbn:9780439708180/chapter/1',
              'isbn:9780439708180/chapter/2',
            ],
            'global cache contains all m3 models'
          );
        }

        run(() =>
          this.store.peekRecord('com.example.bookstore.Book', 'isbn:9780439708180').unloadRecord()
        );

        if (CUSTOM_MODEL_CLASS) {
          assert.deepEqual(
            Object.keys(this.store._globalM3RecordDataCache).sort(),
            ['isbn:9780439064873', 'isbn:9780439708180/chapter/1', 'isbn:9780439708180/chapter/2'],
            'global cache can unload records'
          );
        } else {
          assert.deepEqual(
            Object.keys(this.store._globalM3Cache).sort(),
            ['isbn:9780439064873', 'isbn:9780439708180/chapter/1', 'isbn:9780439708180/chapter/2'],
            'global cache can unload records'
          );
        }

        run(() => this.store.unloadAll());

        if (CUSTOM_MODEL_CLASS) {
          assert.deepEqual(
            Object.keys(this.store._globalM3RecordDataCache),
            [],
            'global cache can unload all records'
          );
        } else {
          assert.deepEqual(
            Object.keys(this.store._globalM3Cache),
            [],
            'global cache can unload all records'
          );
        }
      });

      test('projections are not added to the global m3 cache', function (assert) {
        run(() =>
          this.store.push({
            data: {
              type: 'com.example.bookstore.Book',
              id: 'urn:book:1',
              attributes: {
                title: 'A History of the English Speaking Peoples',
                '*otherBook': 'urn:book:2',
              },
            },
            included: [
              {
                type: 'com.example.bookstore.Book',
                id: 'urn:book:2',
                attributes: {
                  title: 'The 30 Years War',
                },
              },
              {
                type: 'com.example.bookstore.BookProjection',
                id: 'urn:book:1',
              },
              {
                type: 'com.example.bookstore.BookProjection',
                id: 'urn:book:2',
              },
            ],
          })
        );

        let baseIds = this.store
          .peekAll('com.example.bookstore.Book')
          .map((x) => x.id)
          .sort();
        assert.deepEqual(baseIds, ['urn:book:1', 'urn:book:2'], 'base records in cache');

        let projectionIds = this.store
          .peekAll('com.example.bookstore.BookProjection')
          .map((x) => x.id)
          .sort();
        assert.deepEqual(
          projectionIds,
          ['urn:book:1', 'urn:book:2'],
          'projection records in cache'
        );

        let projectedBook = this.store.peekRecord(
          'com.example.bookstore.BookProjection',
          'urn:book:1'
        );
        assert.equal(
          projectedBook.get('title'),
          'A History of the English Speaking Peoples',
          'projected attribute'
        );
        assert.equal(
          projectedBook.get('otherBook.title'),
          'The 30 Years War',
          'projected reference attribute'
        );
        assert.equal(
          projectedBook.get('otherBook._modelName'),
          'com.example.bookstore.book-projection',
          'projected reference can be projected record'
        );

        let baseBook = this.store.peekRecord('com.example.bookstore.Book', 'urn:book:1');
        assert.equal(
          baseBook.get('title'),
          'A History of the English Speaking Peoples',
          'base attribute'
        );
        assert.equal(
          baseBook.get('otherBook.title'),
          'The 30 Years War',
          'base reference attribute'
        );
        assert.equal(
          baseBook.get('otherBook._modelName'),
          'com.example.bookstore.book',
          'base reference is a base record'
        );
      });
    }
  );
}
