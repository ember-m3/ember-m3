import { test } from 'qunit';
import { default as moduleFor }  from 'ember-qunit/module-for';
import sinon from 'sinon';

import { initialize as initializeStore } from 'ember-m3/initializers/m3-store';
import QueryCache from 'ember-m3/query-cache';

const { get, run } = Ember;

moduleFor('m3:query-cache', 'unit/query-cache', {
  integration: true,

  beforeEach() {
    this.sinon = sinon.sandbox.create();
    initializeStore(this);

  },

  afterEach() {
    this.sinon.restore();
  },

  store: function() {
    return this.container.lookup('service:store');
  },
});


