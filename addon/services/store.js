import require from 'require';
import StoreMixin from '../mixins/store';
import { HAS_EMBER_DATA_PACKAGE } from 'ember-m3/-infra/packages';

let Store;
let ExportedStore;

if (!HAS_EMBER_DATA_PACKAGE) {
  Store = require('@ember-data/store').default;
  ExportedStore = Store.extend(StoreMixin);
} else {
  // the re-open in the initializer will handle configuration
  // in this case
  ExportedStore = require('ember-data/store').default;
}

export default ExportedStore;
