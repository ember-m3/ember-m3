import require, { has } from 'require';
import StoreMixin from '../mixins.store';

let Store;
let ExportedStore;

const HAS_EMBER_DATA_PACKAGE = has('ember-data');

if (!HAS_EMBER_DATA_PACKAGE) {
  Store = require('@ember-data/store').default;
  ExportedStore = Store.extend(StoreMixin);
} else {
  // the re-open in the initializer will handle configuration
  // in this case
  ExportedStore = require('ember-data/store').default;
}

export default ExportedStore;
