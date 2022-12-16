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
  initializeDebugAdapter(application);
}

export default {
  name: 'm3-store',
  initialize,
};
