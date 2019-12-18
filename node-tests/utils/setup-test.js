module.exports = function setupTest(hooks) {
  let imported;
  hooks.beforeEach(function() {
    // save off require cache
    imported = Object.assign({}, require.cache);
    // give the test a clean cache
    Object.keys(require.cache).forEach(moduleName => {
      delete require.cache[moduleName];
    });
  });

  hooks.afterEach(function() {
    // clean the cache from the test
    Object.keys(require.cache).forEach(moduleName => {
      delete require.cache[moduleName];
    });
    // restore require cache
    Object.keys(imported).forEach(moduleName => {
      require.cache[moduleName] = imported[moduleName];
    });
  });
};
