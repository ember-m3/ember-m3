import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import IndexPage from '../pages/index';
import { click, currentURL, visit } from '@ember/test-helpers';
import require from 'require';
import { DEBUG } from '@glimmer/env';

module('acceptance/m3', function (hooks) {
  setupApplicationTest(hooks);

  test('payloads can be rendered as m3 models', async function (assert) {
    const page = new IndexPage();

    await page.visit();

    assert.equal(currentURL(), '/', 'navigated to right page');

    assert.deepEqual(
      page.books().map((x) => x.id()),
      ['isbn:9780760768570', 'isbn:9780760768587', 'isbn:9780760768594', 'isbn:9780297609568'],
      'top-level collection ids rendered'
    );

    assert.deepEqual(
      page.books().map((x) => x.authorName()),
      ['Winston Churchill', 'Winston Churchill', 'Winston Churchill', 'Winston Churchill'],
      'able to read nested attributes from top-level referenced collection items'
    );

    assert.deepEqual(
      page.books().map((x) => x.comments().map((x) => x.body())),
      [['This book is great', 'I agree'], [], ['', 'Yup'], []],
      'able to read attributes through reference arrays'
    );

    assert.deepEqual(
      page.books().map((x) => x.comments().map((x) => x.parts())),
      [[[], []], [], [['Really enjoyed this book', 'A lot'], []], []],
      'able to read embedded arrays through reference arrays'
    );
  });

  test('m3 models can be updated', async function (assert) {
    const page = new IndexPage();

    await page.visit();

    assert.equal(currentURL(), '/', 'navigated to right page');

    assert.equal(page.books()[0].name(), 'The Birth of Britain');

    await click('button.update-data');

    assert.equal(page.books()[0].name(), 'Vol I. The Birth of Britain');
  });

  if (DEBUG) {
    test('InteropDebugAdapter is registered as data-adapter:main', async function (assert) {
      let InteropDebugAdapter = require('ember-m3/adapters/interop-debug-adapter').default;
      await visit('/');

      assert.ok(this.owner.lookup('data-adapter:main') instanceof InteropDebugAdapter);
    });
  }
});
