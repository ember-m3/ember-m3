import { gte } from 'ember-compatibility-helpers';

// If ember-data version is before 3.28 we want to do record.get('property')
// otherwise we want to use native property access in newer versions
export default function propGet(record, key) {
  if (gte('@ember-data/model', '3.28.0') || gte('ember-data', '3.28.0')) {
    return record[key];
  } else {
    return record.get(key);
  }
}
