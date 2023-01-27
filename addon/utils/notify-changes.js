import Ember from 'ember';
import { notifyPropertyChange } from '@ember/object';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

const { changeProperties } = Ember;

// WeakMap<Store, [obj, property: string]>
const StoreToPropChanges = new WeakMap();

function getPropertyChanges(store) {
  if (!StoreToPropChanges.has(store)) {
    StoreToPropChanges.set(store, []);
  }
  return StoreToPropChanges.get(store);
}

export function deferPropertyChange(store, obj, key) {
  getPropertyChanges(store).push(obj, key);
}

export function deferArrayPropertyChange(store, array) {
  deferPropertyChange(store, array, '[]');
}

function flushPropChanges(store) {
  let changes = StoreToPropChanges.get(store) || [];
  changeProperties(() => {
    for (let i = 0; i < changes.length; i += 2) {
      let [obj, change] = changes;
      notifyPropertyChange(obj, change);
    }
  });
  StoreToPropChanges.set(store, []);
}

export function flushChanges(store) {
  changeProperties(() => {
    flushPropChanges(store);
  });
}

export function assertNoChanges(store) {
  if (DEBUG) {
    let propChanges = StoreToPropChanges.get(store) || [];
    let changedProps = propChanges.filter((_o, i) => i % 2 === 1);
    assert(
      `There should be no queued changes, but we have: ${changedProps.join(', ')} `,
      changedProps.length === 0
    );
  }
}
