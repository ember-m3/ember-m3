import { test } from 'qunit';
import moduleForAcceptance from '../../tests/helpers/module-for-acceptance';

moduleForAcceptance('acceptance/m3');

test('payloads can be rendered and rerendered on updates', function(assert) {
  visit('/');

  andThen(function() {
    assert.equal(currentURL(), '/');
  });
});

test('projections can hide attributes from payloads', function(assert) {

});
