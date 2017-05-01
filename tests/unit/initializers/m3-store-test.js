import { module, test } from 'qunit';
import sinon from 'sinon';

import Ember from 'ember';

import { initialize } from 'dummy/initializers/m3-store';
import destroyApp from '../../helpers/destroy-app';

module('unit/initializers/m3-store', {
  beforeEach() {
    this.sinon = sinon.sandbox.create();

    Ember.run(() => {
      this.application = Ember.Application.create();
      this.application.deferReadiness();
    });
  },

  afterEach() {
    destroyApp(this.application);
    this.sinon.restore();
  },

  owner() {
    return this.application.__container__;
  }
});

test('it adds `store.queryURL`', function(assert) {
  assert.expect(2);

  initialize(this.application);

  let store = this.owner().lookup('service:store');
  assert.equal(typeof store.queryURL, 'function', 'queryURL added');

  this.sinon.stub(store._queryCache, 'queryURL').callsFake((...args) => {
    assert.deepEqual(
      [...args],
      ['/some-data', { params: { a: '1' }}],
      'arguments are passed down to queryCache'
    );
  });

  store.queryURL('/some-data', { params: { a: '1' }});
});
