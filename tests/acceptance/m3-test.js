import { test } from 'qunit';
import moduleForAcceptance from '../../tests/helpers/module-for-acceptance';
import IndexPage from '../pages/index';

moduleForAcceptance('acceptance/m3');

test('payloads can be rendered as m3 models', function(assert) {
  const page = new IndexPage();

  page.visit();

  andThen(() => {
    assert.equal(currentURL(), '/', 'navigated to right page');

    assert.deepEqual(
      page.books().map(x => x.id()),
      [
        'isbn:9780760768570',
        'isbn:9780760768587',
        'isbn:9780760768594',
        'isbn:9780297609568',
      ],
      'top-level collection ids rendered'
    );

    assert.deepEqual(
      page.books().map(x => x.authorName()),
      [
        'Winston Churchill',
        'Winston Churchill',
        'Winston Churchill',
        'Winston Churchill',
      ],
      'able to read nested attributes from top-level referenced collection items'
    );

    assert.deepEqual(
      page.books().map(x => x.comments().map(x => x.body())),
      [['This book is great', 'I agree'], [], ['', 'Yup'], []],
      'able to read attributes through reference arrays'
    );

    assert.deepEqual(
      page.books().map(x => x.comments().map(x => x.parts())),
      [[[], []], [], [['Really enjoyed this book', 'A lot'], []], []],
      'able to read embedded arrays through reference arrays'
    );
  });
});

test('m3 models can be updated', function(assert) {
  const page = new IndexPage();

  page.visit();

  andThen(() => {
    assert.equal(currentURL(), '/', 'navigated to right page');

    assert.equal(page.books()[0].name(), 'The Birth of Britain');
  });

  click('button.update-data');

  andThen(() => {
    assert.equal(page.books()[0].name(), 'Vol I. The Birth of Britain');
  });
});
