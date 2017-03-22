import Ember from 'ember';
import Resolver from './resolver';
import loadInitializers from 'ember-load-initializers';
import config from './config/environment';

let App;

Ember.MODEL_FACTORY_INJECTIONS = true;

App = Ember.Application.extend({
  modulePrefix: config.modulePrefix,
  podModulePrefix: config.podModulePrefix,
  Resolver,
  init() {
    this._super(...arguments);
    // TODO: remove console short hands
    self.container = this.__container__;
    self.store =this.__container__.lookup('service:store');
  }
});

loadInitializers(App, config.modulePrefix);


export default App;
