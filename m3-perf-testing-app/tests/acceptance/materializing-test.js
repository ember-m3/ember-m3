import { module, test } from 'qunit';
import { visit } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

module('Acceptance | materializing', function (hooks) {
  setupApplicationTest(hooks);

  test('visiting /materializing', async function (assert) {
    await visit('/materializing/50');

    let store = this.owner.lookup('service:store');
    let searches = store.peekAll('com.example.bookstore.SearchResults');
    assert.equal(searches.length, 50, `generated 50 sample payloads`);
    for (let i = 0; i < 50; i++) {
      let search = searches.objectAt(i);
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
    }
  });
});
