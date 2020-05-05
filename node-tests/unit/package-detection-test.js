// eslint-disable-next-lint node/no-extraneous-require
const QUnit = require('qunit');
const { module: testModule, test } = QUnit;
const setupTest = require('../utils/setup-test');

testModule('Package Detection', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    test('a test', function(assert) {
      assert.ok(true, 'We are running');
    });
  });
});
