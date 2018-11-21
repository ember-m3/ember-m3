function _copy(obj, seen, copies) {
  // primitive data types are immutable, just return them.
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  let ret, loc;

  // avoid cyclical loops
  // eslint-disable-next-line no-cond-assign
  if ((loc = seen.indexOf(obj)) >= 0) {
    return copies[loc];
  }
  seen.push(obj);

  if (Array.isArray(obj)) {
    ret = obj.slice();
    copies.push(ret);

    loc = ret.length;

    while (--loc >= 0) {
      ret[loc] = _copy(ret[loc], seen, copies);
    }
  } else if (obj instanceof Date) {
    ret = new Date(obj.getTime());
    copies.push(ret);
  } else if (obj.constructor !== undefined && obj.constructor !== Object) {
    // don't deep copy non-json values
    ret = obj;
    copies.push(ret);
  } else {
    ret = {};
    copies.push(ret);
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

      ret[key] = _copy(obj[key], seen, copies);
    }
  }

  return ret;
}

export function copy(obj) {
  return _copy(obj, [], []);
}
