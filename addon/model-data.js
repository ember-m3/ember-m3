import { assign, merge } from '@ember/polyfills';
import { isEqual } from '@ember/utils';
import { copy } from '@ember/object/internals';
import { get } from '@ember/object';
import { setDiff } from './util';

const emberAssign = assign || merge;

export default class M3ModelData {
  constructor(modelName, id, clientId, storeWrapper, store, internalModel) {
    this.store = store;
    this.modelName = modelName;
    this.internalModel = internalModel;
    this.__relationships = null;
    // TODO IGOR DAVID consider if this can be better, for now we need this because
    // non m3 model datas expect it to be here
    this.__implicitRelationships = Object.create(null);
  }

  // PUBLIC API

  setupData(data, calculateChange) {
    let changedKeys;

    if (calculateChange) {
      changedKeys = this._changedKeys(data.attributes);
    }

    this._data = data.attributes || null;

    return changedKeys;
  }

  adapterWillCommit() {
    this._inFlightAttributes = this._attributes;
    this._attributes = null;
  }

  hasChangedAttributes() {
    return (
      this.__attributes !== null && Object.keys(this.__attributes).length > 0
    );
  }

  // TODO, Maybe can model as destroying model data?
  resetRecord() {
    this.__attributes = null;
    this.__inFlightAttributes = null;
    this._data = null;
  }

  /*
      Returns an object, whose keys are changed properties, and value is an
      [oldProp, newProp] array.
  
      @method changedAttributes
      @private
    */
  // TODO DAVID once we deal with dirtyness, need to bring back updateChangedAttributes
  changedAttributes() {
    let oldData = this._data;
    let currentData = this._attributes;
    let inFlightData = this._inFlightAttributes;
    let newData = emberAssign(copy(inFlightData), currentData);
    let diffData = Object.create(null);
    let newDataKeys = Object.keys(newData);

    for (let i = 0, length = newDataKeys.length; i < length; i++) {
      let key = newDataKeys[i];
      diffData[key] = [oldData[key], newData[key]];
    }

    return diffData;
  }

  rollbackAttributes() {
    let dirtyKeys;
    if (this.hasChangedAttributes()) {
      dirtyKeys = Object.keys(this._attributes);
      this._attributes = null;
    }

    if (get(this.internalModel, 'isError')) {
      this._inFlightAttributes = null;
      // TODO IGOR DAVID seems bad to have to go back, maybe move to internalModel?
      this.internalModel.didCleanError();
    }

    if (this.internalModel.isNew()) {
      this.removeFromInverseRelationships(true);
    }

    if (this.internalModel.isValid()) {
      this._inFlightAttributes = null;
    }

    return dirtyKeys;
  }

  adapterDidCommit(data) {
    let changedKeys = {};
    if (data) {
      // this.store._internalModelDidReceiveRelationshipData(this.modelName, this.id, data.relationships);
      data = data.attributes;
      changedKeys = this._changedKeys(data);
    }

    emberAssign(this._data, this._inFlightAttributes);
    if (data) {
      this._data = data;
    }

    this._inFlightAttributes = null;

    return changedKeys;
  }

  getHasMany() {}

  setHasMany() {}

  saveWasRejected() {
    let keys = Object.keys(this._inFlightAttributes);
    if (keys.length > 0) {
      let attrs = this._attributes;
      for (let i = 0; i < keys.length; i++) {
        if (attrs[keys[i]] === undefined) {
          attrs[keys[i]] = this._inFlightAttributes[keys[i]];
        }
      }
    }
    this._inFlightAttributes = null;
  }

  getBelongsTo() {}

  setBelongsTo() {}

  setAttr(key, value) {
    let oldValue = this.getAttr(key);
    let originalValue;

    if (value !== oldValue) {
      // Add the new value to the changed attributes hash; it will get deleted by
      // the 'didSetProperty' handler if it is no different from the original value
      this._attributes[key] = value;

      if (key in this._inFlightAttributes) {
        originalValue = this._inFlightAttributes[key];
      } else {
        originalValue = this._data[key];
      }
      // If we went back to our original value, we shouldn't keep the attribute around anymore
      if (value === originalValue) {
        delete this._attributes[key];
      }
    }
  }

  getAttr(key) {
    // TODO IGOR DAVID investigate why attributes would be null
    if (this._attributes && key in this._attributes) {
      return this._attributes[key];
    } else if (this._inFlightAttributes && key in this._inFlightAttributes) {
      return this._inFlightAttributes[key];
    } else {
      return this._data[key];
    }
  }

  hasAttr(key) {
    return (
      key in this._attributes ||
      key in this._inFlightAttributes ||
      key in this._data
    );
  }

  get _attributes() {
    if (this.__attributes === null) {
      this.__attributes = Object.create(null);
    }
    return this.__attributes;
  }

  set _attributes(v) {
    this.__attributes = v;
  }

  // TODO IGOR and DAVID, shouldn't need this
  get _relationships() {
    return [];
  }

  get _data() {
    if (this.__data === null) {
      this.__data = Object.create(null);
    }
    return this.__data;
  }

  set _data(v) {
    this.__data = v;
  }

  /*
      implicit relationships are relationship which have not been declared but the inverse side exists on
      another record somewhere
      For example if there was
  
      ```app/models/comment.js
      import DS from 'ember-data';
  
      export default DS.Model.extend({
      name: DS.attr()
      })
      ```
  
      but there is also
  
      ```app/models/post.js
      import DS from 'ember-data';
  
      export default DS.Model.extend({
      name: DS.attr(),
      comments: DS.hasMany('comment')
      })
      ```
  
      would have a implicit post relationship in order to be do things like remove ourselves from the post
      when we are deleted
    */
  get _implicitRelationships() {
    if (this.__implicitRelationships === null) {
      this.__implicitRelationships = Object.create(null);
    }
    return this.__implicitRelationships;
  }

  get _inFlightAttributes() {
    if (this.__inFlightAttributes === null) {
      this.__inFlightAttributes = Object.create(null);
    }
    return this.__inFlightAttributes;
  }

  set _inFlightAttributes(v) {
    this.__inFlightAttributes = v;
  }

  /*
  
  
      TODO IGOR AND DAVID this shouldn't be public
      This method should only be called by records in the `isNew()` state OR once the record
      has been deleted and that deletion has been persisted.
  
      It will remove this record from any associated relationships.
  
      If `isNew` is true (default false), it will also completely reset all
      relationships to an empty state as well.
  
      @method removeFromInverseRelationships
      @param {Boolean} isNew whether to unload from the `isNew` perspective
      @private
      */
  removeFromInverseRelationships() {}

  // TODO IGOR AND DAVID this shouldn't be public
  destroyRelationships() {}

  // TODO IGOR AND DAVID REFACTOR THIS
  didCreateLocally() {}

  /*
      Ember Data has 3 buckets for storing the value of an attribute on an internalModel.
  
      `_data` holds all of the attributes that have been acknowledged by
      a backend via the adapter. When rollbackAttributes is called on a model all
      attributes will revert to the record's state in `_data`.
  
      `_attributes` holds any change the user has made to an attribute
      that has not been acknowledged by the adapter. Any values in
      `_attributes` are have priority over values in `_data`.
  
      `_inFlightAttributes`. When a record is being synced with the
      backend the values in `_attributes` are copied to
      `_inFlightAttributes`. This way if the backend acknowledges the
      save but does not return the new state Ember Data can copy the
      values from `_inFlightAttributes` to `_data`. Without having to
      worry about changes made to `_attributes` while the save was
      happenign.
  
  
      Changed keys builds a list of all of the values that may have been
      changed by the backend after a successful save.
  
      It does this by iterating over each key, value pair in the payload
      returned from the server after a save. If the `key` is found in
      `_attributes` then the user has a local changed to the attribute
      that has not been synced with the server and the key is not
      included in the list of changed keys.
  
  
  
      If the value, for a key differs from the value in what Ember Data
      believes to be the truth about the backend state (A merger of the
      `_data` and `_inFlightAttributes` objects where
      `_inFlightAttributes` has priority) then that means the backend
      has updated the value and the key is added to the list of changed
      keys.
  
      @method _changedKeys
      @private
    */
  _changedKeys(updates) {
    //        let changedKeys = [];

    // TODO IGOR DAVID MAYBE REMOVE
    if (!updates) {
      return [];
    }

    return calculateChangedKeys(this._data, updates);

    /*
      if (updates) {
        let original, i, value, key;
        let keys = Object.keys(updates);
        let length = keys.length;
        let hasAttrs = this.hasChangedAttributes();
        let attrs;
        if (hasAttrs) {
          attrs= this._attributes;
        }
  
        original = emberAssign(Object.create(null), this._data);
        original = emberAssign(original, this._inFlightAttributes);
  
        for (i = 0; i < length; i++) {
          key = keys[i];
          value = updates[key];
  
          // A value in _attributes means the user has a local change to
          // this attributes. We never override this value when merging
          // updates from the backend so we should not sent a change
          // notification if the server value differs from the original.
          if (hasAttrs === true && attrs[key] !== undefined) {
            continue;
          }
  
          if (!isEqual(original[key], value)) {
            changedKeys.push(key);
          }
        }
      }
      */
  }
}
/**
  Calculate the changed keys from prior and new `data`s.  This follows similar
  semantics to `InternalModel._changedKeys`.
  The key difference is that omitted attributes and new attributes are treated
  as changes, instead of ignored.
  There is another difference, which is that there's no notion of
  `_inflightAttributes` or `_attributes`, but this will likely need to change
  when m3 composes a write story.
*/
function calculateChangedKeys(oldValue, newValue) {
  let oldKeys = Object.keys(oldValue).sort();
  let newKeys = Object.keys(newValue).sort();
  // omitted keys are treated as changes
  let result = setDiff(oldKeys, newKeys);

  for (let i = 0; i < newKeys.length; ++i) {
    let key = newKeys[i];
    if (!isEqual(oldValue[key], newValue[key])) {
      result.push(key);
    }
  }

  return result;
}
