import { addObserver, removeObserver } from '@ember/object/observers';
import QUnit from 'qunit';
/*
  Watches a property and increments a counter each time the property is invalidated.

  Returns an object with the following properties:
  - `count` - contains the number of times the property was invalidated
  - `unwatch` - a function to stop watching the property

  An example of how to use it:
  ```js
  test('that property has been invalidated', function(assert) {
    let subject = EmberObject.create();
    let watcher = watchProperty(subject, 'theProperty');
    subject.set('theProperty', 'newValue');
    assert.equal(watcher.count, 1, 'Expected `theProperty` to have been invalidated');
  });
  ```
 */
export function watchProperty(obj, propertyName) {
  let count = 0;

  function observe() {
    count++;
  }

  addObserver(obj, propertyName, observe);

  function unwatch() {
    removeObserver(obj, propertyName, observe);
  }

  return {
    get count() {
      return count;
    },
    unwatch,
  };
}

/*
  Convenient function for watching multiple properties at once. It uses the
  same mechanism as `watchProperty` and returns an object with the following properties:
  - `counts` - a map from property name to the count of how many times the property was invalidated
  - `unwatch` - a function to stop watching the properties

  An example of how to use it:

  test('that properties have been invalidated', function(assert) {
    let subject = EmberObject.create();
    let watchers = watchProperties(subject, ['property1', 'property2']);
    subject.set('property1', 'newValue');
    subject.set('property2', 'newValue');
    assert.deepEqual(
      watchers.counts,
      {
        property1: 1,
        property2: 2,
      },
      'Expected `theProperty` to have been invalidated'
    );
  });
  ```
 */
export function watchProperties(obj, propertyNames) {
  let watchers = {};

  if (!Array.isArray(propertyNames)) {
    throw new Error(
      `Must call watchProperties with an array of propertyNames to watch, received ${propertyNames}`
    );
  }

  for (let i = 0; i < propertyNames.length; i++) {
    let propertyName = propertyNames[i];

    if (watchers[propertyName] !== undefined) {
      throw new Error(`Cannot watch the same property ${propertyName} more than once`);
    }

    watchers[propertyName] = watchProperty(obj, propertyName);
  }

  function unwatch() {
    propertyNames.forEach(propertyName => {
      watchers[propertyName].unwatch();
    });
  }

  return {
    get counts() {
      return propertyNames.reduce((result, prop) => {
        result[prop] = watchers[prop].count;
        return result;
      }, {});
    },
    unwatch,
  };
}

QUnit.assert.dirties = function assertDirties(options, updateMethodCallback, label) {
  let { object: obj, property, count } = options;
  count = typeof count === 'number' ? count : 1;
  let watcher = watchProperty(obj, property);
  updateMethodCallback();
  this.pushResult({
    result: watcher.count === count,
    actual: watcher.count,
    expected: count,
    message: label,
  });
  watcher.unwatch();
};
