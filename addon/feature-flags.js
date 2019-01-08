import require from 'require';

export let CUSTOM_MODEL_CLASS = false;

if (require.has('@ember-data/canary-features')) {
  CUSTOM_MODEL_CLASS = require('@ember-data/canary-features').CUSTOM_MODEL_CLASS;
}
