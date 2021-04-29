'use strict';

module.exports = {
  description: 'Schema.models backwards compat',

  normalizeEntityName: function () {
    // this prevents an error when the entityName is
    // not specified (since that doesn't actually matter
    // to us)
  },

  // locals(options) {
  //   // Return custom template variables here.
  //   return {
  //     foo: options.entity.options.foo
  //   };
  // }

  // afterInstall(options) {
  //   // Perform extra work here.
  // }
};
