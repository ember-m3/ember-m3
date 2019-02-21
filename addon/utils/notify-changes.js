import Ember from 'ember';
import { notifyPropertyChange as _notifyPropertyChange } from '@ember/object';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

const { changeProperties } = Ember;

const { propertyDidChange } = Ember;
export let notifyPropertyChange;

const HasNotifyPropertyChange = _notifyPropertyChange !== undefined;
if (HasNotifyPropertyChange) {
  notifyPropertyChange = _notifyPropertyChange;
} else {
  notifyPropertyChange = propertyDidChange;
}

const StoreToChanges = new WeakMap();

function beginChanges(store) {
  StoreToChanges.set(store, []);
}

export function deferPropertyChange(store, obj, key) {
  if (!StoreToChanges.has(store)) {
    beginChanges(store);
  }
  let changes = StoreToChanges.get(store);
  changes.push(obj, key);
}

export function flushChanges(store) {
  let changes = StoreToChanges.get(store) || [];
  changeProperties(() => {
    for (let i = 0; i < changes.length; i += 2) {
      let obj = changes[i];
      let key = changes[i + 1];
      notifyPropertyChange(obj, key);
    }
  });
  StoreToChanges.set(store, []);
}

export function assertNoChanges(store) {
  if (DEBUG) {
    let changes = StoreToChanges.get(store) || [];
    let changedProps = changes.filter((o, i) => i % 2 === 1);
    assert(
      `There should be no queued changes, but we have: ${changedProps.join(', ')} `,
      changes.length === 0
    );
  }
}
