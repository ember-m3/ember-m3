import { module, test } from 'qunit';
import {
  deferPropertyChange,
  deferArrayPropertyChange,
  flushChanges,
} from 'ember-m3/utils/notify-changes';
import { addObserver } from '@ember/object/observers';
import { A } from '@ember/array';

module('unit/utils/notify-changes', function(hooks) {
  hooks.beforeEach(function() {
    this.store = {};
  });

  test('deferPropertyChange + flushChanges batches property changes', function(assert) {
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
      [[a, 'foo'], [a, 'bar'], [b, 'foo'], [b, 'bar']],
      'changes triggered in order'
    );
  });

  test('deferArrayPropertyChange + flushChanges batches array property changes', function(assert) {
    let a = A();
    let b = A();
    a.id = 'a';
    b.id = 'b';
    let changes = [];

    let observers = {
      willChange(/* target, idx, deleteCount, addCount */) {
        assert.notOk(true, `array willChange is not triggered with m3's property batching`);
      },

      didChange(target, idx, deleteCount, addCount) {
        changes.push([this.id, target.id, 'didChange', idx, deleteCount, addCount]);
      },
    };
    a.addArrayObserver(a, observers);
    b.addArrayObserver(b, observers);

    deferArrayPropertyChange(this.store, a, 0, 1, 2);
    deferArrayPropertyChange(this.store, a, 1, 2, 3);
    // there's no de-duping with array changes
    deferArrayPropertyChange(this.store, b, 0, 1, 2);
    deferArrayPropertyChange(this.store, b, 0, 1, 2);

    assert.deepEqual(changes, [], 'observers have not been triggered');
    flushChanges(this.store);
    assert.deepEqual(
      changes,
      [
        ['a', 'a', 'didChange', 0, 1, 2],
        ['a', 'a', 'didChange', 1, 2, 3],
        ['b', 'b', 'didChange', 0, 1, 2],
        ['b', 'b', 'didChange', 0, 1, 2],
      ],
      'changes triggered in order'
    );
  });

  test('simple and array property changes can be batched together', function(assert) {
    let a = { id: 'a' };
    let b = A();
    b.id = 'b';
    let changes = [];

    let observers = {
      willChange(/* target, idx, deleteCount, addCount */) {
        assert.notOk(true, `array willChange is not triggered with m3's property batching`);
      },

      didChange(target, idx, deleteCount, addCount) {
        changes.push([this.id, target.id, 'didChange', idx, deleteCount, addCount]);
      },
    };
    b.addArrayObserver(b, observers);
    addObserver(a, 'foo', () => changes.push([a, 'foo']));
    addObserver(a, 'bar', () => changes.push([a, 'bar']));

    deferPropertyChange(this.store, a, 'foo');
    deferArrayPropertyChange(this.store, b, 0, 1, 2);
    deferPropertyChange(this.store, a, 'bar');
    deferArrayPropertyChange(this.store, b, 1, 2, 3);

    assert.deepEqual(changes, [], 'observers have not been triggered');
    flushChanges(this.store);
    assert.deepEqual(
      changes,
      [
        // array changes are eager, so batching within `changeProperties` has no effect here
        ['b', 'b', 'didChange', 0, 1, 2],
        ['b', 'b', 'didChange', 1, 2, 3],
        [a, 'foo'],
        [a, 'bar'],
      ],
      'changes triggered in order, but array changes happen first'
    );
  });

  test('deferArrayPropertyChange asserts if passed a non-Ember array', function(assert) {
    assert.throws(
      () => {
        deferArrayPropertyChange(this.store, {}, 1, 2, 3);
      },
      /deferArrayPropertyChange called on something other than an Ember array/,
      'assert if passed non-array'
    );

    assert.throws(
      () => {
        deferArrayPropertyChange(this.store, [], 1, 2, 3);
      },
      /deferArrayPropertyChange called on something other than an Ember array/,
      'assert if passed native array with prototype extensions off'
    );

    // does not throw
    deferArrayPropertyChange(this.store, A(), 1, 2, 3);
  });
});
