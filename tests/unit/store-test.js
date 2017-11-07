import Ember from 'ember';
import DS from 'ember-data'
import { test } from 'qunit';
import { default as moduleFor }  from 'ember-qunit/module-for';
import sinon from 'sinon';

import SchemaManager from 'ember-m3/schema-manager';
import { initialize as initializeStore } from 'ember-m3/initializers/m3-store';

const { A, run } = Ember;

moduleFor('m3:model', 'unit/model', {
  integration: true,

  beforeEach() {
    this.sinon = sinon.sandbox.create();
    initializeStore(this);

    this.Author = DS.Model.extend({
      name: DS.attr('string'),
    });
    this.Author.toString = () => 'Author';
    this.register('model:author', this.Author);

    SchemaManager.registerSchema({
      includesModel(modelName) {
        return /^com.example.bookstore\./i.test(modelName);
      },
    });
  },

  afterEach() {
    this.sinon.restore();
  },

  store: function() {
    return this.container.lookup('service:store');
  },
});

test('records are added to, and unloaded from, the global m3 cache', function(assert) {
  run(() => this.store().push({
      data: [{
        id: 'isbn:9780439708180',
        type: 'com.example.bookstore.Book',
      }, {
        id: 'isbn:9780439708180/chapter/1',
        type: 'com.example.bookstore.Chapter',
      }, {
        id: 'isbn:9780439064873',
        type: 'com.example.bookstore.Book',
      }, {
        id: 'isbn:9780439708180/chapter/2',
        type: 'com.example.bookstore.Chapter',
      }, {
        id: 'author:1',
        type: 'author',
        attributes: {
          name: 'JK Rowling',
        }
      }]
  }));

  assert.deepEqual(Object.keys(this.store()._identityMap._map).sort(), [
    'author',
    'com.example.bookstore.book',
    'com.example.bookstore.chapter',
  ], 'Identity map contains expected types');

  let bookIds = A(this.store()._internalModelsFor('com.example.bookstore.book')._models).mapBy('id');

  assert.deepEqual(bookIds, [
    'isbn:9780439708180',
    'isbn:9780439064873',
  ], 'Identity map contains expected models - book');

  let chapterIds = A(this.store()._internalModelsFor('com.example.bookstore.chapter')._models).mapBy('id');

  assert.deepEqual(chapterIds, [
    'isbn:9780439708180/chapter/1',
    'isbn:9780439708180/chapter/2',
  ], 'Identity map contains expected models - chapter');

  assert.equal(this.store().hasRecordForId('author', 'author:1'), true);

  assert.deepEqual(Object.keys(this.store()._globalM3Cache).sort(), [
    'isbn:9780439064873',
    'isbn:9780439708180',
    'isbn:9780439708180/chapter/1',
    'isbn:9780439708180/chapter/2',
  ], 'global cache contains all m3 models, but no ds models');

  run(() => this.store().peekRecord('com.example.bookstore.Book', 'isbn:9780439708180').unloadRecord());

  assert.deepEqual(Object.keys(this.store()._globalM3Cache).sort(), [
    'isbn:9780439064873',
    'isbn:9780439708180/chapter/1',
    'isbn:9780439708180/chapter/2',
  ], 'global cache can unload records');

  run(() => this.store().unloadAll());

  assert.deepEqual(Object.keys(this.store()._globalM3Cache), [], 'global cache can unload all records');
});
