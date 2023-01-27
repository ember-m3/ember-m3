import { module, test } from 'qunit';
import {
  deferPropertyChange,
  deferArrayPropertyChange,
  flushChanges,
} from 'ember-m3/utils/notify-changes';
import { addObserver } from '@ember/object/observers';
import { A } from '@ember/array';

module('unit/utils/notify-changes', function (hooks) {
  hooks.beforeEach(function () {
    this.store = {};
  });

  test('deferPropertyChange + flushChanges batches property changes', function (assert) {
    let a = { id: 'a' };
    let b = { id: 'b' };
    let changes = [];
    addObserver(a, 'foo', () => changes.push([a, 'foo']));
    addObserver(a, 'bar', () => changes.push([a, 'bar']));
    addObserver(b, 'foo', () => changes.push([b, 'foo']));
    addObserver(b, 'bar', () => changes.push([b, 'bar']));

    deferPropertyChange(this.store, a, 'foo');
    deferPropertyChange(this.store, a, 'bar');
    deferPropertyChange(this.store, b, 'foo');
    deferPropertyChange(this.store, b, 'bar');
    // we wrap in `changeProperties` so will suppress duplicates
    deferPropertyChange(this.store, a, 'foo');

    assert.deepEqual(changes, [], 'observers have not been triggered');
    flushChanges(this.store);
    assert.deepEqual(
      changes,
      [
        [a, 'foo'],
        [a, 'bar'],
        [b, 'foo'],
        [b, 'bar'],
      ],
      'changes triggered in order'
    );
  });

  test('deferArrayPropertyChange + flushChanges batches array property changes', function (assert) {
    let a = A();
    let b = A();
    let changes = [];

    addObserver(a, '[]', function () {
      changes.push('a');
    });
    addObserver(b, '[]', function () {
      changes.push('b');
    });

    deferArrayPropertyChange(this.store, a);
    deferArrayPropertyChange(this.store, a);
    // these are de-duplicated
    deferArrayPropertyChange(this.store, b);
    deferArrayPropertyChange(this.store, b);

    assert.deepEqual(changes, [], 'observers have not been triggered');
    flushChanges(this.store);
    assert.deepEqual(changes, ['a', 'b'], 'changes triggered in order');
  });

  test('simple and array property changes can be batched together', function (assert) {
    let a = { id: 'a' };
    let b = A();
    let changes = [];

    addObserver(b, '[]', function () {
      changes.push('b.[]');
    });
    addObserver(a, 'foo', () => changes.push('a.foo'));
    addObserver(a, 'bar', () => changes.push('a.bar'));

    deferPropertyChange(this.store, a, 'foo');
    deferArrayPropertyChange(this.store, b);
    deferPropertyChange(this.store, a, 'bar');

    assert.deepEqual(changes, [], 'observers have not been triggered');
    flushChanges(this.store);
    assert.deepEqual(
      changes,
      ['b.[]', 'a.foo', 'a.bar'],
      'changes triggered in order, but array changes happen first'
    );
  });
});
