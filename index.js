/* eslint-env node */
'use strict';

function debugMacros(features) {
  let plugins = [
    [
      require.resolve('babel-plugin-debug-macros'),
      {
        flags: [
          {
            source: 'ember-m3/feature-flags',
            flags: features,
          },
        ],
      },
      '@ember-data/canary-features-stripping',
    ],
  ];

  return plugins;
}

module.exports = {
  name: 'ember-m3',

  init() {
    this._super.init.apply(this, arguments);

    let features;
    try {
      features = this.project.require('@ember-data/private-build-infra/src/features');
    } catch (e) {
      features = { CUSTOM_MODEL_CLASS: false };
    }

    this.options = this.options || {};
    this.options.babel = this.options.babel || {};

    let plugins = this.options.babel.plugins || [];
    // this ensures that the same `@ember-data/canary-features` processing that the various
    // ember-data addons do is done in the dummy app
    this.options.babel.plugins = [...plugins, ...debugMacros(features)];

    this.options.babel.loose = true;
  },
};
