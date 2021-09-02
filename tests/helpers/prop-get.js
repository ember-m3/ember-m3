import { gte } from 'ember-compatibility-helpers';
import HAS_NATIVE_PROXY from 'ember-m3/utils/has-native-proxy';

// If ember-data version is before 3.28 we want to do record.get('property')
// otherwise we want to use native property access in newer versions
export default function propGet(record, key) {
  if ((gte('@ember-data/model', '3.28.0') || gte('ember-data', '3.28.0')) && HAS_NATIVE_PROXY) {
    return record[key];
  } else {
    return record.get(key);
  }
}
