/* eslint-env node */
'use strict';

module.exports = {
  name: 'ember-m3',

  init() {
    this._super.init.apply(this, arguments);

    this.options = this.options || {};
    this.options.babel = this.options.babel || {};
    this.options.babel.loose = true;
  },
};
