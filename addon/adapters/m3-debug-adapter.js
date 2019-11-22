import { A, isArray } from '@ember/array';
import DataAdapter from '@ember/debug/data-adapter';
import { get, defineProperty } from '@ember/object';
import { inject } from '@ember/service';
import seenTypesPerStore from '../utils/seen-types-per-store';
import { default as MegamorphicModel } from '../model';

/*
  Extend `Ember.DataAdapter` with m3 specific code

  @class M3DebugAdapter
  @extends Ember.DataAdapter
  @private
*/

// TODO: implement getFilters/getRecordColor/getRecordFilterValues (for record state in the cache)
// and getRecordKeywords (for search)
export default class M3DebugAdapter extends DataAdapter {
  init(options = {}) {
    super.init(options);
    // This keeps track of all model types the debug adapter has seen already (so we don't watch for changes twice)
    this.seenTypesInAdapter = new Set();
    // This is the same attribute limit value that is set in Ember Inspector
    this.attributeLimit = 100;
  }

  /**
    Iterates through objects and if there is a nested object or array, stringifies the value
    This is needed because Ember Inspector does not support data structures more than two levels deep
    @private
    @method _stringifyNestedValues
    @param nestedJSON Nested objects from the record
    @return Object with stringified values as needed
  */
  _stringifyNestedValues(nestedJSON) {
    for (let key in nestedJSON) {
      const nestedJSONValue = nestedJSON[key];
      if (nestedJSONValue instanceof Object) {
        nestedJSON[key] = JSON.stringify(nestedJSONValue);
      }
    }
    return nestedJSON;
  }

  /**
    Get the values from a record and converts them as needed to be displayed as column values
    Depending on the type of data it may need to be transformed into JSON or can just be returned as a string
    @private
    @method _getRecordValues
    @param attributeValue Nested record data that needs to be processed
    @return Data to be rendered in the column values
  */
  _getRecordValues(attributeValue) {
    if (attributeValue instanceof MegamorphicModel) {
      const objectJSON = attributeValue.debugJSON();

      return this._stringifyNestedValues(objectJSON);
    } else if (isArray(attributeValue) && get(attributeValue, 'length')) {
      return attributeValue.map(nestedAttributeValue =>
        this._getRecordValues(nestedAttributeValue)
      );
    } else if (isArray(attributeValue) && !get(attributeValue, 'length')) {
      return [];
    } else if (attributeValue instanceof Object) {
      const objectJSON = JSON.parse(JSON.stringify(attributeValue));

      return this._stringifyNestedValues(objectJSON);
    }
    return attributeValue;
  }

  /**
    Acts more like name to name but is used in `watchRecords`
    in Ember's generic data adapter
    @private
    @method _nameToClass
    @param {String} type Model type
    @return {String} Model type
  */
  _nameToClass(type) {
    return type;
  }

  /**
    Fetches all Megamorphic model types
    @private
    @method getModelTypes
    @return {Array} Array of model types
  */
  getModelTypes() {
    let modelTypes = [];
    let allModelNames = seenTypesPerStore.get(this.store);

    allModelNames.forEach(name => {
      // we need to keep klass even though it is not technically needed/correct
      // because both Ember Inspector and Ember's generic debug adapter expect this data structure
      // and use klass to generate objectIds and such
      modelTypes.push({ klass: name, name });
    });

    return A(modelTypes);
  }

  /**
    Wraps a given model type and observes changes to it
    @private
    @method wrapModelType
    @param {String} name Name of the model type
    @return {Object} Contains the wrapped type
    Format:
      type: {Object} The wrapped type
        The wrapped type has the following format:
          name: {String} The name of the type
          count: {Integer} The number of records available
          columns: {Columns} An array of columns to describe the record
          object: {String} The name of the model type
  */
  wrapModelType(name) {
    const records = this.getRecords(name);

    return {
      name,
      count: get(records, 'length'),
      columns: this.columnsForType(records),
      // We pass in model name into the field object, even though it is a misnomer
      // because Ember Inspector will use this value to generate a guid
      object: name,
    };
  }

  /**
    Get the columns for a given model type
    Since the attributes can vary between records of the same type,
    we need to iterate through them and create a master list of attributes
    @public
    @method columnsForType
    @param {MegamorphicModel} records
    @return {Array} An array of columns of the following format:
     name: {String} The name of the column
     desc: {String} Name of column to render in the column header
  */
  columnsForType(records) {
    let count = 0;
    let columnsMap = {
      id: {
        name: 'id',
        desc: 'id',
      },
    };
    let columns = [];

    if (!get(records, 'length')) {
      for (let key in columnsMap) {
        columns.push(columnsMap[key]);
      }

      return columns;
    }

    records.forEach(record =>
      record.eachAttribute(name => {
        if (count++ > this.attributeLimit) {
          return false;
        }

        if (!columnsMap[name]) {
          columnsMap[name] = { name, desc: name };
        }
      })
    );

    for (let key in columnsMap) {
      columns.push(columnsMap[key]);
    }

    return columns;
  }

  /**
    Fetches all loaded records for a given type
    @public
    @method getRecords
    @param {String} type Model type
    @return {Array} An array of Megamorphic records
     This array will be observed for changes,
     so it should update when new records are added/removed
  */
  getRecords(type) {
    return this.get('store').peekAll(type);
  }

  /**
    Gets the values for each column
    This is the attribute values for a given record
    @public
    @method getRecordColumnValues
    @param {MegamorphicModel} record to get values from
    @return {Object} Keys should match column names defined by the model type
  */
  getRecordColumnValues(record) {
    let count = 0;
    let columnValues = { id: get(record, 'id') };

    record.eachAttribute(key => {
      if (count++ > this.attributeLimit) {
        return false;
      }

      const keyValue = get(record, key);
      columnValues[key] = this._getRecordValues(keyValue);
    });

    return columnValues;
  }

  /**
    Function to add additional model types that need to be observed
    There is no static place to grab all the model types (unlike in Ember Data)
    and new model types can be added at any time, so we need this function to be called
    whenever a new model type is added to the m3 schema service
    @private
    @method addedType
    @param {String} type Model type
  */
  addedType(type) {
    // TODO: Store columns in seenType and do a deep equal check to see if they need to be updated
    // If a new model type is added, we need to notify Ember Inspector of it
    if (!this.seenTypesInAdapter.has(type)) {
      this.seenTypesInAdapter.add(type);

      let wrappedType = this.processAddedType(type);
      // This is where we let Ember Inspect know a new model type has been added
      this.typesAddedCallback([wrappedType]);
    }
  }

  /**
    Takes a model type and wraps it with additional model information
    It then gets watched for changes and pushed to an array to remove observers
    @private
    @method processAddedType
    @param {String} type Model type
    Takes an array of objects containing wrapped types
    @return {Object} Wrapped model type
  */
  processAddedType(type) {
    let wrapped = this.wrapModelType(type);
    this.localReleaseMethods.push(this.observeModelType(type, this.typesUpdatedCallback));
    return wrapped;
  }

  /**
    Fetch the model types and observe them for changes
    Also keeps track of what model types have been handled by the adapter
    @public
    @method watchModelTypes
    @param {Function} typesAdded Callback to call to add types
    Takes an array of objects containing wrapped types (returned from `processAddedTypes`)
    @param {Function} typesUpdated Callback to call when a type has changed
    Takes an array of objects containing wrapped types
    @return {Function} Method to call to remove all observers
  */
  watchModelTypes(typesAdded, typesUpdated) {
    let modelTypes = this.getModelTypes();

    // We set watchModelTypes to true so that the m3 schema service knows when we are in debug mode
    // and needs to notify the debug adapter of new model types added
    this.schema.watchModelTypes = true;

    this.typesAddedCallback = typesAdded;
    this.typesUpdatedCallback = typesUpdated;
    this.localReleaseMethods = A();

    modelTypes.forEach(type => this.seenTypesInAdapter.add(type.name));
    let typesToSend = modelTypes.map(type => this.processAddedType(type.name));
    typesAdded(typesToSend);

    let release = () => {
      this.localReleaseMethods.forEach(fn => fn());
      this.releaseMethods.removeObject(release);
    };
    this.releaseMethods.pushObject(release);
    return release;
  }
}

defineProperty(M3DebugAdapter.prototype, 'store', inject('store'));
