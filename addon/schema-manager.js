export class SchemaManager {
  constructor() {
    this.schema = null;
  }

  computeAttributeReference(key, value, modelname, schemaInterface) {
    return this.schema.computeAttributeReference(key, value, modelname, schemaInterface);
  }

  computeNestedModel(key, value, modelname, schemaInterface) {
    return this.schema.computeNestedModel(key, value, modelname, schemaInterface);
  }

  includesModel(key, value, modelName) {
    return this.schema.includesModel(key, value, modelName);
  }

  computeBaseModelName(projectionModelName) {
    return this.schema.computeBaseModelName(projectionModelName);
  }

  isAttributeIncluded(modelName, attrName) {
    let whitelist = this._modelSchemaProperty(modelName, 'attributes');
    return !whitelist || whitelist.includes(attrName);
  }

  getDefaultValue(modelName, keyName) {
    let defaults = this._modelSchemaProperty(modelName, 'defaults');
    if (!defaults) {
      return;
    }

    return defaults[keyName];
  }

  getAttributeAlias(modelName, attrName) {
    let aliases = this._modelSchemaProperty(modelName, 'aliases');
    if (!aliases) {
      return;
    }

    return aliases[attrName];
  }

  computeAttributes(keys) {
    if (this.schema.computeAttributes && typeof this.schema.computeAttributes === 'function') {
      return this.schema.computeAttributes(keys);
    }

    return keys;
  }

  setAttribute(modelName, attrName, value, schemaInterface) {
    if (this.schema.setAttribute) {
      this.schema.setAttribute(modelName, attrName, value, schemaInterface);
      return;
    }

    schemaInterface.setAttr(attrName, value);
  }

  transformValue(modelName, attrName, value) {
    let transforms = this._modelSchemaProperty(modelName, 'transforms');
    let transform = transforms && transforms[attrName];

    return transform ? transform(value) : value;
  }

  registerSchema(schema) {
    this.schema = schema;
  }

  _modelSchema(modelName) {
    let models = this.schema.models;
    return models && models[modelName];
  }

  _modelSchemaProperty(modelName, property) {
    let modelSchema = this._modelSchema(modelName);
    return modelSchema && modelSchema[property];
  }
}

export default new SchemaManager();
