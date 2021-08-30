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

// Separate array & prop changes for simplicity.  This prevents us from
// re-issuing the property changes in order, but Ember already triggers array
// changes eagerly, even within `changeProperties`

// WeakMap<Store, [obj, startIdx: number, removeCount: number, addCount: number]>
const StoreToArrayChanges = new WeakMap();
// WeakMap<Store, [obj, property: string]>
const StoreToPropChanges = new WeakMap();

function getPropertyChanges(store) {
  if (!StoreToPropChanges.has(store)) {
    StoreToPropChanges.set(store, []);
  }
  return StoreToPropChanges.get(store);
}

function getArrayChanges(store) {
  if (!StoreToArrayChanges.has(store)) {
    StoreToArrayChanges.set(store, []);
  }
  return StoreToArrayChanges.get(store);
}

export function deferPropertyChange(store, obj, key) {
  getPropertyChanges(store).push(obj, key);
}

export function deferArrayPropertyChange(store, array, start, deleteCount, addCount) {
  if (DEBUG) {
    // don't assert Ember.isArray as that will return true for native arrays
    /*
    assert(
      `deferArrayPropertyChange called on something other than an Ember array; wrap native arrays with Ember.A(array) or enable Array prototype extensions`,
      typeof array.arrayContentDidChange === 'function'
    );
    */
  }
  getArrayChanges(store).push(array, start, deleteCount, addCount);
}

function flushArrayChanges(store) {
  let changes = StoreToArrayChanges.get(store) || [];
  changeProperties(() => {
    for (let i = 0; i < changes.length; i += 4) {
      let array = changes[i];
      let startIdx = changes[i + 1];
      let removeCount = changes[i + 2];
      let addCount = changes[i + 3];
      //notifyPropertyChange(array, '[]');
     // notifyPropertyChange(array, 'length');
       array.arrayContentDidChange(startIdx, removeCount, addCount);
    }
  });
  StoreToArrayChanges.set(store, []);
}

function flushPropChanges(store) {
  let changes = StoreToPropChanges.get(store) || [];
  changeProperties(() => {
    for (let i = 0; i < changes.length; i += 2) {
      let obj = changes[i];
      let change = changes[i + 1];
      notifyPropertyChange(obj, change);
    }
  });
  StoreToPropChanges.set(store, []);
}

export function flushChanges(store) {
  changeProperties(() => {
    flushArrayChanges(store);
    flushPropChanges(store);
  });
}

export function assertNoChanges(store) {
  if (DEBUG) {
    let propChanges = StoreToPropChanges.get(store) || [];
    let changedProps = propChanges.filter((o, i) => i % 2 === 1);
    assert(
      `There should be no queued changes, but we have: ${changedProps.join(', ')} `,
      changedProps.length === 0
    );

    let arrayChanges = StoreToArrayChanges.get(store) || [];
    assert(
      `There should be no queued array changes, but we have: ${arrayChanges.length} `,
      arrayChanges.length === 0
    );
  }
}
