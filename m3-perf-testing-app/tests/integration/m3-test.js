import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

import DefaultSchema from 'ember-m3/services/m3-schema';

module('unit/model/api', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.store = this.owner.lookup('service:store');

    class TestSchema extends DefaultSchema {
      includesModel() {
        return true;
      }
    }
    this.owner.register('service:m3-schema', TestSchema);
  });

  test('changing an id is not allowed, per ember data', function (assert) {
    this.store.push({
      data: {
        id: 1,
        type: 'com.example.Book',
        attributes: {
          name: 'The Storm Before the Storm',
        },
      },
    });

    let record = this.store.peekRecord('com.example.Book', 1);
    assert.throws(() => {
      record.set('id', 24601);
    }, 'wat');
  });

  test('setting an id to itself is allowed', function (assert) {
    this.store.push({
      data: {
        id: 1,
        type: 'com.example.Book',
        attributes: {
          name: 'The Storm Before the Storm',
        },
      },
    });

    let record = this.store.peekRecord('com.example.Book', 1);
    record.set('id', '1');

    assert.equal(record.id, '1');
  });
});
