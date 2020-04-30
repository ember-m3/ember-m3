import '../mixins/store';
import { DEBUG } from '@glimmer/env';
import require from 'require';

/*
 Configures a registry with injections on Ember applications
 for the m3 store. Accepts an optional namespace argument.

 @method initializeDebugAdapter
 @param {Ember.Registry} registry
 */
function initializeDebugAdapter(registry) {
  // TODO make this configurable
  if (DEBUG) {
    let InteropDebugAdapter = require('ember-m3/adapters/interop-debug-adapter').default;

    registry.register('data-adapter:main', InteropDebugAdapter);
  }
}

export function initialize(application) {
  // This should be unnecessary
  // it is done by the meta package
  // but it should be done by the store package
  // https://github.com/emberjs/data/issues/7158
  application.inject('route', 'store', 'service:store');
  application.inject('controller', 'store', 'service:store');

  initializeDebugAdapter(application);
}

export default {
  name: 'm3-store',
  initialize,
};
