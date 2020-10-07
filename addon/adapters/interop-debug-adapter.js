import M3DebugAdapter from './m3-debug-adapter';
import { defineProperty } from '@ember/object';
import { inject } from '@ember/service';
import { default as MegamorphicModel } from '../model';
import require from 'require';
import { run } from '@ember/runloop';
import DataAdapter from '@ember/debug/data-adapter';
import { HAS_DEBUG_PACKAGE, HAS_EMBER_DATA_PACKAGE } from 'ember-m3/-infra/packages';

let DebugAdapter;
if (HAS_DEBUG_PACKAGE) {
  DebugAdapter = require('@ember-data/debug').default;
} else if (HAS_EMBER_DATA_PACKAGE) {
  DebugAdapter = require('ember-data/-private').DebugAdapter;
} else {
  DebugAdapter = DataAdapter;
}

/*
  Extend Ember Data's `DebugAdapter` to handle both m3 and @ember-data/model model types

  @class InteropDebugAdapter
  @extends DebugAdapter
  @private
*/

export default class InteropDebugAdapter extends DebugAdapter {
  init() {
    super.init(...arguments);
    const store = this.store;
    const schema = this.schema;
    this._m3DebugAdapter = M3DebugAdapter.create({
      store,
      schema,
    });
  }

  /**
    Function to call m3's debug adapter addedType method
    This is only needed for m3 records that have been dynamically added after
    watchModelTypes has been called
    @private
    @method addedType
    @param {String} type Model type
  */
  addedType(type) {
    this._m3DebugAdapter.addedType(type);
  }

  /**
    Calls the getRecordColumnValues function from either m3's debug adapter
    or Ember Data's debug adapter depending on the record type
    @public
    @method getRecordColumnValues
    @param {MegamorphicModel|Model} record to get values from
    @return {Object} Keys should match column names defined by the model type
  */
  getRecordColumnValues(record) {
    if (record instanceof MegamorphicModel) {
      return this._m3DebugAdapter.getRecordColumnValues(record);
    }
    return super.getRecordColumnValues(record);
  }

  /**
    Calls both the m3 and Ember Data watchModelTypes functions
    @public
    @method watchModelTypes
    @param {Function} typesAdded Callback to call to add types
    Takes an array of objects containing wrapped types
    @param {Function} typesUpdated Callback to call when a type has changed
    Takes an array of objects containing wrapped types
    @return {Function} Method to call to remove all observers from m3 and @ember-data/model model types
  */
  watchModelTypes(typesAdded, typesUpdated) {
    const schema = this.schema;
    let releaseM3 = this._m3DebugAdapter.watchModelTypes(typesAdded, typesUpdated);
    let releaseSuper = super.watchModelTypes(
      interceptDataTypes(schema, typesAdded),
      interceptDataTypes(schema, typesUpdated)
    );

    return () => {
      releaseSuper();
      releaseM3();
    };
  }

  destroy() {
    run(this._m3DebugAdapter, 'destroy');
    super.destroy(...arguments);
  }
}

function interceptDataTypes(schema, method) {
  return (types) => {
    const dataTypes = types.filter((type) => !schema.includesModel(type.name));
    if (dataTypes.length) {
      method(dataTypes);
    }
  };
}

defineProperty(InteropDebugAdapter.prototype, 'schema', inject('m3-schema'));
defineProperty(InteropDebugAdapter.prototype, 'store', inject('store'));
