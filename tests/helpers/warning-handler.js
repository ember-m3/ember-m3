import { registerWarnHandler } from '@ember/debug';

let errorOnInternalWarnings = true;
export let capturedWarnings = null;

export function captureWarnings() {
  capturedWarnings = [];
  errorOnInternalWarnings = false;
}

export function resetWarnings() {
  capturedWarnings = null;
  errorOnInternalWarnings = true;
}

registerWarnHandler(function (message, options, next) {
  if (options.id.includes('ember-m3')) {
    if (errorOnInternalWarnings) {
      throw new Error(`Unhandled Warning: ${message}`);
    }

    // gather warnings for later assertion
    capturedWarnings.push([message, options]);
  } else {
    next(message, options);
  }
});
