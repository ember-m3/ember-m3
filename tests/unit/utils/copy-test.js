import { module, test } from 'qunit';
import { copy } from 'ember-m3/utils/copy';

module('unit/utils/copy', function() {
  test('copy deep copies', function(assert) {
    let orig = {
      a: '1',
      b: {
        c: [1, 2, 3],
      },
    };

    let dupe = copy(orig);

    assert.deepEqual(dupe, {
      a: '1',
      b: {
        c: [1, 2, 3],
      },
    });

    orig.b.c.push(4);
    assert.deepEqual(orig.b.c, [1, 2, 3, 4], 'orig array updated');
    assert.deepEqual(dupe.b.c, [1, 2, 3], 'dupe array not updated');

    orig.b.q = 'hai';
    assert.strictEqual(dupe.b.q, undefined, 'dupe nested object not updated');

    let a = { b: {}, c: {} };
    a.b.foo = { q: 'yes hello i am foo' };
    a.c.foo = a.b.foo;

    let acopy = copy(a);

    assert.deepEqual(
      acopy,
      {
        b: {
          foo: { q: 'yes hello i am foo' },
        },
        c: {
          foo: { q: 'yes hello i am foo' },
        },
      },
      'graphs can be copied'
    );
    assert.notStrictEqual(acopy.b.foo, acopy.c.foo, 'graphs are copied as trees');
  });
});
