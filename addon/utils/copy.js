function _copy(obj, seen, copies) {
  // primitive data types are immutable, just return them.
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  let ret, loc;

  // avoid cyclical loops
  // eslint-disable-next-line no-cond-assign
  if ((loc = seen.indexOf(obj) >= 0)) {
    return copies[loc];
  }

  // IMPORTANT: this specific test will detect a native array only. Any other
  // object will need to implement Copyable.
  if (Array.isArray(obj)) {
    ret = obj.slice();

    loc = ret.length;

    while (--loc >= 0) {
      ret[loc] = copy(ret[loc], copies);
    }
  } else if (obj instanceof Date) {
    ret = new Date(obj.getTime());
  } else {
    ret = {};
    let key;
    for (key in obj) {
      // support Null prototype
      if (!Object.prototype.hasOwnProperty.call(obj, key)) {
        continue;
      }

      // Prevents browsers that don't respect non-enumerability from
      // copying internal Ember properties
      if (key.substring(0, 2) === '__') {
        continue;
      }

      ret[key] = copy(obj[key], seen, copies);
    }
  }

  seen.push(obj);
  copies.push(ret);

  return ret;
}

export function copy(obj) {
  return _copy(obj, [], []);
}
