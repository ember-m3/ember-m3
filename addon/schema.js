export class Schema {
  constructor() {
    this._matcher = () => false;

    this._typeMatcher = () => false;
    this._idMatcher = () => false;
    this._nestedModelMatcher = () => false;
    this._schema = Object.create(null);
  }

  isAttributeIncluded(modelName, attrName) {
    let whitelist = this._schema[modelName] && this._schema[modelName].attributes;
    return !whitelist || whitelist.includes(attrName);
  }

  transformValue(modelName, attrName, value) {
    let transform =
      this._schema[modelName] &&
      this._schema[modelName].transforms &&
      this._schema[modelName].transforms[attrName];

    return transform ? transform(value) : value;
  }

  registerSchema(globalSchema) {
    let matchers = globalSchema.matchers || {};

    this._typeMatcher = matchers.type || this._typeMatcher;
    this._idMatcher = matchers.id || this._idMatcher;
    this._nestedModelMatcher = matchers.nestedModel || this._nestedModelMatcher;

    this._schema = globalSchema.schema || this._schema;
  }
}

export default new Schema();
