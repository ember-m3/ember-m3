import Ember from 'ember';
import { isEmbeddedObject } from './util';
import SchemaManager from './schema-manager';

const { isEqual } = Ember;

function setupDataAndNotify(modelData, updates) {
  let changedKeys = modelData.setupData(
    { attributes: updates },
    modelData.internalModel.hasRecord
  );

  modelData._notifyRecordProperties(changedKeys);
}

function commitDataAndNotify(modelData, updates) {
  let changedKeys = modelData.adapterDidCommit({ attributes: updates });

  modelData._notifyRecordProperties(changedKeys);
}

export default class M3ModelData {
  constructor(modelName, id, clientId, storeWrapper, store, internalModel) {
    this.store = store;
    this.modelName = modelName;
    this.internalModel = internalModel;
    this.storeWrapper = storeWrapper;
    this.__relationships = null;
    // TODO IGOR DAVID consider if this can be better, for now we need this because
    // non m3 model datas expect it to be here
    this.__implicitRelationships = Object.create(null);
    this.__data = null;
    this.__nestedModelsData = null;
    this._schema = SchemaManager;

    let baseModelName = this._schema.computeBaseModelName(this.modelName);

    this.__projections = null;
    if (baseModelName) {
      // TODO we may not have ID yet?
      this._initBaseModelData(baseModelName, id);
    } else {
      this.baseModelData = null;
    }
  }

  // PUBLIC API

  setupData(data, calculateChanges, notify) {
    // TODO One more parameter is used to indicate we need setupData to
    // also notify records of any changes, because preload does not do
    // it, but it should
    let changedKeys = this._mergeUpdates(data.attributes, setupDataAndNotify);
    this._notifyProjectionProperties(changedKeys);

    if (notify) {
      this._notifyRecordProperties(changedKeys);
    }

    return changedKeys;
  }

  adapterWillCommit() {}

  hasChangedAttributes() {
    return false;
  }

  // TODO, Maybe can model as destroying model data?
  resetRecord() {
    if (this.baseModelData === null) {
      // only reset the data if it is not a projection
      this._data = null;
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
      nestedModelData = this._nestedModelDatas[
        key
      ] = this.createNestedModelData(modelName, id, internalModel);
    }
    return nestedModelData;
  }

  createNestedModelData(modelName, id, internalModel) {
    return new M3ModelData(
      modelName,
      id,
      null,
      this.storeWrapper,
      this.store,
      internalModel
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

  getResourceIdentifier() {
    let { modelName, clientId, id } = this.internalModel;

    return {
      id,
      clientId,
      type: modelName,
    };
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

        if (isEmbeddedObject(newValue)) {
          nestedCallback(nested, newValue);
          continue;
        }

        // not an embedded object, destroy the nested model data
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
