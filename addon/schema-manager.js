const DEFAULT_MATCHER = () => false;
const DEFAULT_REFERENCE = () => null;

export class SchemaManager {
  constructor() {
    this.computeAttributeReference = DEFAULT_REFERENCE;
    this.computeNestedModel = DEFAULT_REFERENCE;
    this.includesModel = DEFAULT_MATCHER;
    this._models = Object.create(null);
  }

  isAttributeIncluded(modelName, attrName) {
    let whitelist = this._models[modelName] && this._models[modelName].attributes;
    return !whitelist || whitelist.includes(attrName);
  }

  getDefaultValue(modelName, keyName) {
    let defaults = this._models[modelName] && this._models[modelName].defaults;
    if (!defaults) { return; }

    return defaults[keyName];
  }

  getAttributeAlias(modelName, attrName) {
    let aliases = this._models[modelName] && this._models[modelName].aliases;
    if (!aliases) { return; }

    return aliases[attrName];
  }

  transformValue(modelName, attrName, value) {
    let transform =
      this._models[modelName] &&
      this._models[modelName].transforms &&
      this._models[modelName].transforms[attrName];

    return transform ? transform(value) : value;
  }

  registerSchema({
    computeAttributeReference,
    computeNestedModel,
    includesModel,
    models,
  }) {
    this.computeAttributeReference = computeAttributeReference || DEFAULT_REFERENCE;
    this.computeNestedModel = computeNestedModel || DEFAULT_REFERENCE;
    this.includesModel = includesModel || DEFAULT_MATCHER;
    this._models = models || Object.create(null);
  }
}

export default new SchemaManager();
