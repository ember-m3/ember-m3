import Ember from 'ember';
import DS from 'ember-data';
import { InternalModel } from 'ember-data/-private';

import MegamorphicModel from '../model';
import MegamorphicModelFactory from '../factory';
import SchemaManager from '../schema-manager';
import QueryCache from '../query-cache';

const { assign, isEqual } = Ember;

// TODO: this is a stopgap.  We want to replace this with a public
// DS.Model/Schema API

export function extendStore(Store) {
  Store.reopen({
    init() {
      this._super(...arguments);
      this._queryCache = new QueryCache({ store: this });
    },

    _hasModelFor(modelName) {
      return SchemaManager.includesModel(modelName) || this._super(modelName);
    },

    _internalModelsFor(modelName) {
      if (SchemaManager.includesModel(modelName)) {
        // Here we could allow schemas to have multiple id-spaces
        return this._super('-ember-m3');
      }
      return this._super(modelName);
    },

    modelFactoryFor(modelName) {
      if (SchemaManager.includesModel(modelName)) {
        return MegamorphicModelFactory;
      }
      return this._super(modelName);
    },

    adapterFor(modelName) {
      if (SchemaManager.includesModel(modelName)) {
        return this._super('-ember-m3');
      }
      return this._super(modelName);
    },

    serializerFor(modelName) {
      if (SchemaManager.includesModel(modelName)) {
        return this._super('-ember-m3');
      }
      return this._super(modelName);
    },

    queryURL(url, options) {
      return this._queryCache.queryURL(url, options);
    },

    unloadURL(cacheKey) {
      return this._queryCache.unloadURL(cacheKey);
    },

    containsURL(cacheKey) {
      return this._queryCache.contains(cacheKey);
    },

    _pushInternalModel(jsonAPIResource) {
      let internalModel = this._super(jsonAPIResource);
      if (SchemaManager.includesModel(jsonAPIResource.type)) {
        this._globalM3Cache[internalModel.id] = internalModel;
      }
      return internalModel;
    },

    _internalModelDestroyed(internalModel) {
      delete this._globalM3Cache[internalModel.id];
      return this._super(internalModel);
    },
  })
}

export function extendDataAdapter(DataAdapter) {
  DataAdapter.reopen({
    getModelTypes() {
      return this._super(...arguments).concat({
        klass: MegamorphicModel,
        name: '-ember-m3'
      });
    },

    _nameToClass(modelName) {
      if (SchemaManager.includesModel(modelName)) {
        return MegamorphicModel;
      }
      return this._super(...arguments);
    }
  });
}

export function extendInternalModel() {
  // Apply https://github.com/emberjs/data/pull/5133

  InternalModel.prototype.setupData = function monkeyPatchedSetupData(data) {
    this.store._internalModelDidReceiveRelationshipData(this.modelName, this.id, data.relationships);

    let changedKeys;

    if (this.hasRecord) {
      changedKeys = this._changedKeys(data.attributes);
    }

    this._assignAttributes(data.attributes);

    this.pushedData();

    if (this.hasRecord) {
      this._record._notifyProperties(changedKeys);
    }
  }

  InternalModel.prototype._changedKeys = function monkeyPatchedChangedKeys(updates) {
    if (this.hasRecord && typeof this._record._changedKeys === 'function') {
      return this._record._changedKeys(updates);
    }

    let changedKeys = [];

    if (updates) {
      let original, i, value, key;
      let keys = Object.keys(updates);
      let length = keys.length;
      let hasAttrs = this.hasChangedAttributes();
      let attrs;
      if (hasAttrs) {
        attrs= this._attributes;
      }

      original = assign(Object.create(null), this._data);
      original = assign(original, this._inFlightAttributes);

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

    return changedKeys;
  }

  InternalModel.prototype.adapterDidCommit = function monkeyPatchedAdapterDidCommit(data) {
    if (data) {
      this.store._internalModelDidReceiveRelationshipData(this.modelName, this.id, data.relationships);

      data = data.attributes;
    }

    this.didCleanError();
    let changedKeys = this._changedKeys(data);

    this._assignAttributes(this._inFlightAttributes);
    if (data) {
      this._assignAttributes(data);
    }

    this._inFlightAttributes = null;

    this.send('didCommit');
    this.updateRecordArrays();

    if (!data) { return; }

    this._record._notifyProperties(changedKeys);
  }
  InternalModel.prototype._assignAttributes = function monkeyPatched_assignAttributes(attributes) {
    if (this.hasRecord && typeof this._record._assignAttributes === 'function') {
      return this._record._assignAttributes(attributes);
    }
    assign(this._data, attributes);
  }
}

export function initialize() {
  extendStore(DS.Store);
  extendDataAdapter(Ember.DataAdapter);
  extendInternalModel();
}

export default {
  name: 'm3-store',
  initialize,
  after: 'm3-schema-initializer',
};
