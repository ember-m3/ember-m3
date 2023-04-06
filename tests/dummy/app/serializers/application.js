export default class ApplicationSerializer {
  constructor(createArgs) {
    Object.assign(this, createArgs);
  }
  normalizeResponse(store, primaryModelClass, payload /*, id, requestType */) {
    return payload;
  }

  pushPayload(store, payload) {
    return store.push(payload);
  }

  static create(createArgs) {
    return new this(createArgs);
  }
}
