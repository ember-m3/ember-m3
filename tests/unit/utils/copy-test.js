import { module, test } from 'qunit';
import { copy } from 'ember-m3/utils/copy';

module('unit/utils/copy', function() {
  test('copy deep copies', function(assert) {
    let orig = {
      a: '1',
      b: {
        c: [1, 2, 3],
      },
      d: true,
      e: false,
      f: null,
    };

    let dupe = copy(orig);

    assert.deepEqual(dupe, {
      a: '1',
      b: {
        c: [1, 2, 3],
      },
      d: true,
      e: false,
      f: null,
    });

    assert.notEqual(orig.b, dupe.b, 'objects deep copied');

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
    assert.strictEqual(acopy.b.foo, acopy.c.foo, 'graphs copied directly');
  });

  test('copy deep copies top level object', function(assert) {
    let orig = {};
    let dupe = copy(orig);

    assert.notEqual(dupe, orig, 'copied top level object');

    orig = Object.create(null);
    dupe = copy(orig);

    assert.notEqual(dupe, orig, 'copied top level object (null prototype)');
  });

  test('deep copies cycles', function(assert) {
    let orig = {
      a: { b: 'b' },
    };
    orig.a.c = orig.a;

    let dupe = copy(orig);

    assert.strictEqual(dupe.a.c, dupe.a, 'cycle copied');
    assert.notEqual(dupe.a.c, orig.a, 'cycle not a ref to original');
    assert.equal(dupe.a.b, 'b', 'value copied');
  });

  test('copy shallow copies non-json values', function(assert) {
    class SomethingOrOther {
      constructor() {
        this.x = 1;
        this.y = 2;
      }
    }

    let orig = {
      s: new SomethingOrOther(),
      a: 2,
    };

    let dupe = copy(orig);

    assert.deepEqual(
      JSON.parse(JSON.stringify(dupe)),
      {
        s: {
          x: 1,
          y: 2,
        },
        a: 2,
      },
      'deep copy with class instance value'
    );

    assert.strictEqual(orig.s, dupe.s, 'class instance not deep copied (value)');
    assert.strictEqual(
      dupe.s.constructor,
      SomethingOrOther,
      'class instance not deep copied (constructor)'
    );
  });
});
