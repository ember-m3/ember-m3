import { module, test } from 'qunit';
import { visit, currentURL } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

const iterations = 12000;

module('Acceptance | materializing', function (hooks) {
  setupApplicationTest(hooks);

  test('visiting /materializing', async function (assert) {
    await visit('/materializing');

    assert.equal(currentURL(), '/materializing');
    let store = this.owner.lookup('service:store');
    let searches = store.peekAll('com.example.bookstore.SearchResults');
    assert.equal(
      searches.length,
      iterations,
      `generated ${iterations} sample payloads`
    );
    searches.forEach((search, i) => {
      // Sample the array for correctness, otherwise the test generates too
      // many assertions and take too long
      if (i % 50 !== 0) {
        return;
      }
      let results = search.get('results');
      assert.equal(results.length, 4, 'there are four results');
      assert.deepEqual(
        results.map((book) => book.get('name')),
        [
          'The Birth of Britain',
          'The New World',
          'The Age of Revolution',
          'The Great Democracies',
        ],
        'correct book titles'
      );
      assert.equal(
        results.map((book) =>
          book
            .get('readerComments')
            .map((c) => c.get('body'))
            .join()
        ),
        'This book is great,I agree,,,Yup,',
        'correct reader comments'
      );
    });
  });
});
