import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import sinon from 'sinon';
import DefaultSchema from 'ember-m3/services/m3-schema';
import { addObserver } from '@ember/object/observers';
import { resolve } from 'rsvp';
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

module('unit/store (interop with @ember-data/model)', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.sinon = sinon.createSandbox();

    this.Author = Model.extend({
      name: attr('string'),
    });
    this.Author.toString = () => 'Author';
    this.owner.register('model:author', this.Author);

    this.owner.register(
      'service:m3-schema',
      class TestSchema extends DefaultSchema {
        includesModel(modelName) {
          return /^com.example.bookstore\./i.test(modelName);
        }
      }
    );
    this.store = this.owner.lookup('service:store');
  });

  hooks.afterEach(function() {
    this.sinon.restore();
  });

  test('pushPayload batches change notifications', function(assert) {
    this.store.pushPayload('com.example.bookstore.Book', {
      data: {
        id: 'book:1',
        type: 'com.example.bookstore.Book',
        attributes: {
          title: 'Marlborough: his life and times',
          volume: 1,
        },
      },
    });

    let book = this.store.peekRecord('com.example.bookstore.Book', 'book:1');
    addObserver(book, 'volume', () => {
      // This assert relies on ember data pushing `data` after all `included`
      // resources during `pushPayload`
      assert.equal(
        this.store.hasRecordForId('com.example.bookstore.SyntheticEnd', 'end:1'),
        true,
        'observer is not called until entire payload is pushed'
      );
    });
    book.get('volume');

    this.store.pushPayload('com.example.bookstore.Book', {
      data: {
        id: 'end:1',
        type: 'com.example.bookstore.SyntheticEnd',
        attributes: {},
      },
      included: [
        {
          id: 'book:1',
          type: 'com.example.bookstore.Book',
          attributes: {
            title: 'Marlborough: his life and times',
            volume: 2,
          },
        },
      ],
    });
  });

  test('didSaveRecord with included resources effectively batches change notifications', async function(assert) {
    assert.expect(2);

    this.owner.register(
      'adapter:application',
      class TestAdapter {
        static create(props) {
          return new TestAdapter(props);
        }

        updateRecord() {
          return resolve({
            data: {
              id: 'book:1',
              type: 'com.example.bookstore.Book',
              attributes: {
                title: 'Marlborough: his life and times',
                volume: 2,
              },
            },
            included: [
              {
                id: 'end:1',
                type: 'com.example.bookstore.SyntheticEnd',
                attributes: {
                  saved: true,
                },
              },
            ],
          });
        }
      }
    );

    this.store.pushPayload('com.example.bookstore.Book', {
      data: {
        id: 'book:1',
        type: 'com.example.bookstore.Book',
        attributes: {
          title: 'Marlborough: his life and times',
          volume: 1,
        },
      },
      included: [
        {
          id: 'end:1',
          type: 'com.example.bookstore.SyntheticEnd',
          attributes: {},
        },
      ],
    });

    let book = this.store.peekRecord('com.example.bookstore.Book', 'book:1');
    addObserver(book, 'volume', () => {
      // in the didSaveRecordCase, data is pushed before included
      let synthEnd = this.store.peekRecord('com.example.bookstore.SyntheticEnd', 'end:1');
      assert.equal(
        synthEnd.get('saved'),
        true,
        'observer is not called until entire payload is pushed'
      );
    });
    book.get('volume');

    book.set('author', 'Winston Churchill');
    assert.equal(book.get('isDirty'), true, 'book now dirty');

    await book.save();
  });

  test('didSave with no included resources flushes changed notifications', async function(assert) {
    assert.expect(2);

    this.owner.register(
      'adapter:application',
      class TestAdapter {
        static create(props) {
          return new TestAdapter(props);
        }

        updateRecord() {
          return resolve({
            data: {
              id: 'book:1',
              type: 'com.example.bookstore.Book',
              attributes: {
                title: 'Marlborough: his life and times',
                volume: 2,
              },
            },
          });
        }
      }
    );

    this.store.pushPayload('com.example.bookstore.Book', {
      data: {
        id: 'book:1',
        type: 'com.example.bookstore.Book',
        attributes: {
          title: 'Marlborough: his life and times',
          volume: 1,
        },
      },
    });

    let book = this.store.peekRecord('com.example.bookstore.Book', 'book:1');
    addObserver(book, 'volume', () => {
      assert.ok(true, 'changes flushed');
    });
    book.get('volume');

    book.set('author', 'Winston Churchill');
    assert.equal(book.get('isDirty'), true, 'book now dirty');

    await book.save();
  });
});
