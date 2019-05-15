import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import M3QueryArray from 'ember-m3/query-array';

module('unit/query-array', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.store = this.owner.lookup('service:store');
    this.queryCache = new (class MockQueryCache {
      queryURL() {
        return new Promise((resolve, reject) => {
          this.resolve = resolve;
          this.reject = reject;
        });
      }
    })();

    this.createRecordArray = function(options = {}) {
      return M3QueryArray.create(
        Object.assign(
          {
            store: this.store,
            queryCache: this.queryCache,
            query: 'query',
          },
          options
        )
      );
    };
  });

  test('flags', async function(assert) {
    let recordArray = this.createRecordArray();
    assert.equal(recordArray.get('isLoaded'), true, 'isLoaded initially true');
    assert.equal(recordArray.get('isUpdating'), false, 'isUpdating initially false');

    let updatePromise = recordArray.update();
    assert.equal(recordArray.get('isLoaded'), false, 'isLoaded false while loading');
    assert.equal(recordArray.get('isUpdating'), true, 'isUpdating true while loading');

    this.queryCache.resolve();
    await updatePromise;
    assert.equal(recordArray.get('isLoaded'), true, 'isLoaded true after loading resolved');
    assert.equal(recordArray.get('isUpdating'), false, 'isUpdating false after loading resolved');

    updatePromise = recordArray.update();
    assert.equal(recordArray.get('isLoaded'), false, 'isLoaded false while loading again');
    assert.equal(recordArray.get('isUpdating'), true, 'isUpdating true while loading again');

    this.queryCache.reject('reasons');
    try {
      await updatePromise;
      assert.ok(false, 'promise rejects');
    } catch (e) {
      assert.equal(e, 'reasons', 'promise rejected for what we can only presume to be reasons');
    }
    assert.equal(recordArray.get('isLoaded'), true, 'isLoaded true after loading rejected');
    assert.equal(recordArray.get('isUpdating'), false, 'isUpdating false after loading rejected');
  });

  test('QueryArray requires a query', function(assert) {
    let queryArray = M3QueryArray.create();

    assert.throws(() => {
      queryArray.update();
    }, /QueryArray requires a query property/);
  });
});
