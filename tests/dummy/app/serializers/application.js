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

  serialize(snapshot) {
    let result = {};
    snapshot.eachAttribute((k) => {
      let value = snapshot.record.get(k);
      if (value && typeof value.serialize === 'function') {
        value = value.serialize();
      }
      result[k] = value;
    });
    return result;
  }

  static create(createArgs) {
    return new this(createArgs);
  }
}
