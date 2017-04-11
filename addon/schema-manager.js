const DEFAULT_MATCHER = () => false;
const DEFAULT_REFERENCE = () => null;

export class SchemaManager {
  constructor() {
    this.computeAttributeReference = DEFAULT_REFERENCE;
    this.isAttributeANestedModel = DEFAULT_MATCHER;
    this.includesModel = DEFAULT_MATCHER;
    this._models = Object.create(null);
  }

  // computeAttributeReference,
  // isAttributeANestedModel,
  // includesModel,

  isAttributeIncluded(modelName, attrName) {
    let whitelist = this._models[modelName] && this._models[modelName].attributes;
    return !whitelist || whitelist.includes(attrName);
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
    isAttributeANestedModel,
    includesModel,
    models,
  }) {
    this.computeAttributeReference = computeAttributeReference || DEFAULT_REFERENCE;
    this.isAttributeANestedModel = isAttributeANestedModel || DEFAULT_MATCHER;
    this.includesModel = includesModel || DEFAULT_MATCHER;
    this._models = models || Object.create(null);
  }
}

export default new SchemaManager();
