import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import { run } from '@ember/runloop';
import DefaultSchema from 'ember-m3/services/m3-schema';
import sinon from 'sinon';
import { CUSTOM_MODEL_CLASS } from 'ember-m3/-infra/features';
import { HAS_MODEL_PACKAGE } from 'ember-m3/-infra/packages';
import require from 'require';

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
class TestSchema extends DefaultSchema {
  _isProjection(modelName) {
    return /-projection$/i.test(modelName);
  }

  includesModel(modelName) {
    return /^com.example.bookstore\./i.test(modelName);
  }

  computeAttribute(key, value, modelName, schemaInterface) {
    let refId = schemaInterface.getAttr(`*${key}`);
    if (refId !== undefined) {
      let type = this._isProjection(modelName) ? 'com.example.bookstore.BookProjection' : null;

      return schemaInterface.reference({
        id: refId,
        type,
      });
    }
  }

  computeBaseModelName(normalizedProjectionModelName) {
    if (this._isProjection(normalizedProjectionModelName)) {
      return normalizedProjectionModelName.substring(
        0,
        normalizedProjectionModelName.length - '-projection'.length
      );
    }
  }
}

class TestSchemaOldHooks extends DefaultSchema {
  _isProjection(modelName) {
    return /-projection$/i.test(modelName);
  }

  includesModel(modelName) {
    return /^com.example.bookstore\./i.test(modelName);
  }

  computeAttributeReference(key, value, modelName, schemaInterface) {
    let refId = schemaInterface.getAttr(`*${key}`);
    if (refId !== undefined) {
      let type = this._isProjection(modelName) ? 'com.example.bookstore.BookProjection' : null;

      return {
        id: refId,
        type,
      };
    }
  }

  computeBaseModelName(normalizedProjectionModelName) {
    if (this._isProjection(normalizedProjectionModelName)) {
      return normalizedProjectionModelName.substring(
        0,
        normalizedProjectionModelName.length - '-projection'.length
      );
    }
  }
}

for (let testRun = 0; testRun < 2; testRun++) {
  module(
    `unit/store/global-cache (interop with @ember-data/model) ${
      testRun ? 'old hooks' : 'computeAttribute'
    }`,
    function (hooks) {
      setupTest(hooks);

      hooks.beforeEach(function () {
        this.sinon = sinon.createSandbox();

        this.Author = Model.extend({
          name: attr('string'),
        });
        this.Author.toString = () => 'Author';
        this.owner.register('model:author', this.Author);
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
              {
                id: 'author:1',
                type: 'author',
                attributes: {
                  name: 'JK Rowling',
                },
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
        assert.equal(this.store.peekAll('author').length, 1, '1 author in the cache');

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

        assert.equal(this.store.hasRecordForId('author', 'author:1'), true);

        if (CUSTOM_MODEL_CLASS) {
          assert.deepEqual(
            Object.keys(this.store._globalM3RecordDataCache).sort(),
            [
              'isbn:9780439064873',
              'isbn:9780439708180',
              'isbn:9780439708180/chapter/1',
              'isbn:9780439708180/chapter/2',
            ],
            'global cache contains all m3 models, but no @ember-data/model models'
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
            'global cache contains all m3 models, but no @ember-data/model models'
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
    }
  );
}
