// eslint-disable-next-lint node/no-extraneous-require
const QUnit = require('qunit');
const { module: testModule, test } = QUnit;
const setupTest = require('../utils/setup-test');
const buildProjectHelper = require('../../src/utils/project-package-helper');

const FakeAddon1 = {
  name: 'Addon1',
  addons: [],
  addonPackages: {},
};
const FakeAddon2 = {
  name: 'Addon2',
  addons: [],
  addonPackages: {},
};
const FakeAddon3 = {
  name: 'Addon3',
  addons: [FakeAddon1],
  addonPackages: {
    Addon1: FakeAddon1,
  },
};
const FakeAddon4 = {
  name: 'Addon4',
  addons: [FakeAddon2],
  addonPackages: {
    Addon2: FakeAddon2,
  },
};
const FakeAddon5 = {
  name: 'Addon5',
  addons: [FakeAddon2, FakeAddon3],
  addonPackages: {
    Addon2: FakeAddon2,
    Addon3: FakeAddon3,
  },
};

// introduce a cycle
FakeAddon2.addons.push(FakeAddon4);
FakeAddon2.addonPackages.Addon4 = FakeAddon4;

const FakeProject = {
  name() {
    return 'MyApp';
  },
  addons: [FakeAddon5, FakeAddon4],
  addonPackages: {
    Addon5: FakeAddon5,
    Addon4: FakeAddon4,
  },
};

testModule('Package Detection', function(hooks) {
  setupTest(hooks);
  let helper;

  hooks.beforeEach(function() {
    helper = buildProjectHelper(FakeProject);
  });

  test('We Can Detect Packages', function(assert) {
    assert.equal(helper.hasAddon('MyApp'), true, 'We can detect the Primary Project');
    assert.equal(helper.hasAddon('Addon1'), true, 'We can detect Addon1');
    assert.equal(helper.hasAddon('Addon2'), true, 'We can detect Addon2');
    assert.equal(helper.hasAddon('Addon3'), true, 'We can detect Addon3');
    assert.equal(helper.hasAddon('Addon4'), true, 'We can detect Addon4');
    assert.equal(helper.hasAddon('Addon5'), true, 'We can detect Addon5');
  });

  test('We Can Retrieve Packages', function(assert) {
    assert.strictEqual(
      helper.getAddon('MyApp'),
      FakeProject,
      'We can retrieve the Primary Project'
    );
    assert.strictEqual(helper.getAddon('Addon1'), FakeAddon1, 'We can retrieve Addon1');
    assert.strictEqual(helper.getAddon('Addon2'), FakeAddon2, 'We can retrieve Addon2');
    assert.strictEqual(helper.getAddon('Addon3'), FakeAddon3, 'We can retrieve Addon3');
    assert.strictEqual(helper.getAddon('Addon4'), FakeAddon4, 'We can retrieve Addon4');
    assert.strictEqual(helper.getAddon('Addon5'), FakeAddon5, 'We can retrieve Addon5');
  });

  test('We Do not Detect non-existant Packages', function(assert) {
    assert.equal(helper.hasAddon('Addon6'), false, 'We do not detect Addon6');
  });

  test('We Do not Retrieve non-existant Packages', function(assert) {
    assert.strictEqual(helper.getAddon('Addon6'), false, 'We do not retrieve Addon6');
  });
});
