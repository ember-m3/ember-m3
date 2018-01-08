import { assign, merge } from '@ember/polyfills';
import { copy } from '@ember/object/internals';
import { get } from '@ember/object';
import { merge as mergeData } from './util';

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
    this.__data = null;
  }

  // PUBLIC API

  setupData(data) {
    let changedKeys = mergeData(this._data, data.attributes);
    // TODO Consider nested models as well
    return Object.keys(changedKeys);
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
      changedKeys = mergeData(this._data, data.attributes);
    } else {
      emberAssign(this._data, this._inFlightAttributes);
    }

    this._inFlightAttributes = null;

    // TODO Consider nested models as well
    return Object.keys(changedKeys);
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
}
