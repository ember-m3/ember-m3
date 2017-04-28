import Ember from 'ember';
import { initialize } from 'dummy/initializers/m3-store';
import { module, test } from 'qunit';
import destroyApp from '../../helpers/destroy-app';

module('unit/initializers/m3-store', {
  beforeEach() {
    Ember.run(() => {
      this.application = Ember.Application.create();
      this.application.deferReadiness();
    });
  },
  afterEach() {
    destroyApp(this.application);
  }
});

test('it adds `store.queryURL`', function(assert) {

});
