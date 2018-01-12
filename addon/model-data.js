import Ember from 'ember';
import SchemaManager from './schema-manager';
import { dasherize } from '@ember/string';
import { isNone } from '@ember/utils';

const { isEqual } = Ember;

function setupDataAndNotify(modelData, updates) {
  let changedKeys = modelData.setupData({ attributes: updates });

  modelData._notifyRecordProperties(changedKeys);
}

function commitDataAndNotify(modelData, updates) {
  let changedKeys = modelData.adapterDidCommit({ attributes: updates });

  modelData._notifyRecordProperties(changedKeys);
}

export default class M3ModelData {
  constructor(
    modelName,
    id,
    clientId,
    storeWrapper,
    store,
    internalModel,
    baseModelData
  ) {
    this.store = store;
    this.modelName = modelName;
    this.id = id;
    this.internalModel = internalModel;
    this.storeWrapper = storeWrapper;
    this.__relationships = null;
    // TODO IGOR DAVID consider if this can be better, for now we need this because
    // non m3 model datas expect it to be here
    this.__implicitRelationships = Object.create(null);
    this.__data = null;
    this.__nestedModelsData = null;
    this._schema = SchemaManager;

    if (baseModelData) {
      // this is the case of nested model data and we are receiving the base model data directly
      this.baseModelData = baseModelData;
      this.baseModelData._registerProjection(this);
    } else {
      // TODO This should not be done for nested models, but we don't actually distinguish right now
      //  whether they are nested or not
      this.baseModelName = this._schema.computeBaseModelName(this.modelName);

      this.__projections = null;
      if (this.baseModelName && this.id) {
        // TODO we may not have ID yet?
        this._initBaseModelData(this.baseModelName, id);
      } else {
        this.baseModelData = null;
      }
    }
  }

  // PUBLIC API

  setupData(data) {
    let changedKeys = this._mergeUpdates(data.attributes, setupDataAndNotify);
    this._notifyProjectionProperties(changedKeys);

    return changedKeys;
  }

  adapterWillCommit() {}

  hasChangedAttributes() {
    return false;
  }

  // TODO, Maybe can model as destroying model data?
  resetRecord() {}

  destroy() {
    if (this.baseModelData) {
      this.baseModelData._unregisterProjection(this);
    }
  }

  /*
      Returns an object, whose keys are changed properties, and value is an
      [oldProp, newProp] array.

      @method changedAttributes
      @private
    */
  // TODO DAVID once we deal with dirtyness, need to bring back updateChangedAttributes
  changedAttributes() {
    return {};
  }

  rollbackAttributes() {
    // this is noop
  }

  adapterDidCommit(data) {
    if (data) {
      let changedKeys = this._mergeUpdates(
        data.attributes,
        commitDataAndNotify
      );
      this._notifyProjectionProperties(changedKeys);
    }

    // TODO can we avoid this useless allocation?
    return [];
  }

  getHasMany() {}

  setHasMany() {}

  saveWasRejected() {}

  getBelongsTo() {}

  setBelongsTo() {}

  getOrCreateNestedModelData(key, modelName, id, internalModel) {
    let nestedModelData = this._nestedModelDatas[key];
    if (!nestedModelData) {
      let baseNestedModelData;
      if (this.baseModelData) {
        // we have a base, ask it for a nested model data
        let baseNestedModelName = this._schema.computeBaseModelName(modelName);
        // TODO We don't have any associated internal model though, because Ember Data is not tracking these, we may have
        // to fill in the internal model when it is available
        baseNestedModelData = this.baseModelData.getOrCreateNestedModelData(
          key,
          baseNestedModelName,
          id,
          null
        );
      }
      nestedModelData = this._nestedModelDatas[
        key
      ] = this.createNestedModelData(
        modelName,
        id,
        internalModel,
        baseNestedModelData
      );
    }
    return nestedModelData;
  }

  createNestedModelData(modelName, id, internalModel, baseModelData) {
    return new M3ModelData(
      modelName,
      id,
      null,
      this.storeWrapper,
      this.store,
      internalModel,
      baseModelData
    );
  }

  destroyNestedModelData(key) {
    let nestedModelData = this._nestedModelDatas[key];
    if (nestedModelData) {
      // destroy
      delete this._nestedModelDatas[key];
    }
  }

  hasNestedModelData(key) {
    return !!this._nestedModelDatas[key];
  }

  setAttr(key, value) {
    this._data[key] = value;
    this._notifyProjectionProperties([key]);
  }

  getAttr(key) {
    return this._data[key];
  }

  hasAttr(key) {
    return key in this._data;
  }

  setId(id) {
    if (this.id === id) {
      return;
    }
    this.id = id;
    if (!this.baseModelName) {
      return;
    }
    let projectionData = this._data;
    this._initBaseModelData(this.baseModelName, this.id);
    this.baseModelData._inverseMergeUpdates(projectionData);
    // we need to reset the __data to reread it from the base
    this.__data = null;
  }

  getResourceIdentifier() {
    let { modelName, clientId, id } = this.internalModel;

    return {
      id,
      clientId,
      type: modelName,
    };
  }

  shouldDestroy() {
    return !this._projections || this._projections.length === 0;
  }

  _initBaseModelData(modelName, id) {
    this.baseModelData = this.store.modelDataFor(modelName, id);
    this.baseModelData._registerProjection(this);
  }

  _registerProjection(modelData) {
    if (!this.__projections) {
      // we ensure projections contains the base as well
      // so we have complete list of all related model datas
      this.__projections = [this];
    }
    this.__projections.push(modelData);
  }

  _unregisterProjection(modelData) {
    if (!this.__projections) {
      return;
    }
    let idx = this.__projections.indexOf(modelData);
    if (idx !== -1) {
      this.__projections.splice(idx, 1);
    }
  }

  _inverseMergeUpdates(updates) {
    // TODO Add more tests for this case
    // TODO Add support for nested objects
    if (!updates) {
      return;
    }
    let data = this._data;

    let updatedKeys = Object.keys(updates);
    for (let i = 0; i < updatedKeys.length; i++) {
      let key = updatedKeys[i];

      if (key in data) {
        continue;
      }
      data[key] = updates[key];
    }
  }

  /**
   *
   * @param updates
   * @param nestedCallback a callback for updating the data of a nested model-data instance
   * @returns {Array}
   * @private
   */
  _mergeUpdates(updates, nestedCallback) {
    let data = this._data;

    let changedKeys = [];

    if (!updates) {
      // no changes
      return changedKeys;
    }

    let updatedKeys = Object.keys(updates);

    for (let i = 0; i < updatedKeys.length; i++) {
      let key = updatedKeys[i];
      let newValue = updates[key];

      if (isEqual(data[key], newValue)) {
        // values are equal, nothing to do
        // note, updates to objects should always result in new object or there will be nothing to update
        continue;
      }

      if (this.hasNestedModelData(key)) {
        let nested = this.getOrCreateNestedModelData(key);

        // we need to compute the new nested type, hopefully it is not too slow
        let newNestedDef = this._schema.computeNestedModel(
          key,
          newValue,
          this.modelName
        );
        let newType =
          newNestedDef && newNestedDef.type && dasherize(newNestedDef.type);
        let isSameType =
          newType === nested.modelName ||
          (isNone(newType) && isNone(nested.modelName));

        let newId = newNestedDef && newNestedDef.id;
        let isSameId =
          newId === nested.id || (isNone(newId) && isNone(nested.id));

        if (newNestedDef && isSameType && isSameId) {
          nestedCallback(nested, newValue);
          continue;
        }

        // not an embedded object anymore or type changed, destroy the nested model data
        this.destroyNestedModelData(key);
      }

      changedKeys.push(key);
      data[key] = newValue;
    }

    return changedKeys;
  }

  _notifyRecordProperties(changedKeys) {
    // TODO Use the store wrapper API
    if (this.internalModel.hasRecord) {
      this.internalModel._record._notifyProperties(changedKeys);
    }
  }

  _notifyProjectionProperties(changedKeys) {
    let projections = this._projections;
    if (projections) {
      for (let i = 0; i < projections.length; i++) {
        if (projections[i] !== this) {
          projections[i]._notifyRecordProperties(changedKeys);
        }
      }
    }
  }

  get _attributes() {}

  set _attributes(v) {}

  // TODO IGOR and DAVID, shouldn't need this
  get _relationships() {
    return [];
  }

  get _data() {
    if (this.baseModelData !== null) {
      return this.baseModelData._data;
    }

    if (this.__data === null) {
      this.__data = Object.create(null);
    }

    return this.__data;
  }

  set _data(v) {
    if (this.baseModelData !== null) {
      this.baseModelData._data = v;
      return;
    }

    this.__data = v;
  }

  get _projections() {
    if (this.baseModelData !== null) {
      return this.baseModelData._projections;
    }
    return this.__projections;
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

  get _nestedModelDatas() {
    if (this.__nestedModelsData === null) {
      this.__nestedModelsData = Object.create(null);
    }
    return this.__nestedModelsData;
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
