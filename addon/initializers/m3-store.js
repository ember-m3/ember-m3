import '../mixins/store';
import { HAS_EMBER_DATA_PACKAGE } from 'ember-m3/-infra/packages';
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
  if (!HAS_EMBER_DATA_PACKAGE) {
    application.inject('route', 'store', 'service:store');
    application.inject('controller', 'store', 'service:store');
  }
  initializeDebugAdapter(application);
}

export default {
  name: 'm3-store',
  initialize,
};
