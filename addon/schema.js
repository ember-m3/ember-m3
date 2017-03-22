export class Schema {
  constructor() {
    this._matcher = () => false;
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
    this._matcher = globalSchema.matcher;
    this._schema = globalSchema.schema;
  }
}

export default new Schema();
