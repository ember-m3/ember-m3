import '../mixins/store';
import InteropDebugAdapter from '../adapters/interop-debug-adapter';

/*
 Configures a registry with injections on Ember applications
 for the m3 store. Accepts an optional namespace argument.

 @method initializeDebugAdapter
 @param {Ember.Registry} registry
 */
function initializeDebugAdapter(registry) {
  registry.register('data-adapter:main', InteropDebugAdapter);
}

export function initialize(application) {
  initializeDebugAdapter(application);
}

export default {
  name: 'm3-store',
  initialize,
};
