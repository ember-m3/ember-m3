import { module, test } from 'qunit';
import { visit, currentURL, findAll } from '@ember/test-helpers';
import { setupApplicationTest } from 'ember-qunit';

module('Acceptance | rendering', function(hooks) {
  setupApplicationTest(hooks);

  test('visiting /rendering', async function(assert) {
    await visit('/rendering');

    assert.equal(currentURL(), '/rendering');
    let results = findAll('.result');
    assert.equal(results.length, 100, 'Rendered 100 copies of the sample payload');
    results.forEach((result, i) => {
      let books = result.querySelectorAll('.book');
      assert.equal(books.length, 4, 'Have four books')
      assert.equal(books[0].querySelector('.id').textContent, `${i}-isbn:9780760768570`, 'book id is correct');
      assert.equal(books[1].querySelector('.id').textContent, `${i}-isbn:9780760768587`, 'book id is correct');
      assert.equal(books[2].querySelector('.id').textContent, `${i}-isbn:9780760768594`, 'book id is correct');
      assert.equal(books[3].querySelector('.id').textContent, `${i}-isbn:9780297609568`, 'book id is correct');
      assert.dom('.name', books[0]).hasText('The Birth of Britain');
      assert.dom('.author', books[0]).hasText('Winston Churchill');
      assert.dom('.comments li:first-child .comment-body', books[0]).hasText('This book is great');
      assert.dom('.comments li:last-child .comment-body', books[0]).hasText('I agree');
      assert.dom('.name', books[1]).hasText('The New World');
      assert.dom('.author', books[1]).hasText('Winston Churchill');
      assert.dom('.name', books[2]).hasText('The Age of Revolution');
      assert.dom('.author', books[2]).hasText('Winston Churchill');
      assert.dom('.name', books[3]).hasText('The Great Democracies');
      assert.dom('.author', books[3]).hasText('Winston Churchill');
    });
  });
});
