import EmberObject from '@ember/object';

export default class Adapter extends EmberObject {
  async ajax(url) {
    const result = await fetch(url);
    return result.json();
  }
  findRecord() {
    throw new Error(`findRecord is not implemented`);
  }
  findMany() {
    throw new Error(`findMany is not implemented`);
  }
  findAll() {
    throw new Error(`findAll is not implemented`);
  }
  createRecord() {
    throw new Error(`createRecord is not implemented`);
  }
  updateRecord() {
    throw new Error(`updateRecord is not implemented`);
  }
  deleteRecord() {
    throw new Error(`deleteRecord is not implemented`);
  }
  queryRecord() {
    throw new Error(`queryRecord is not implemented`);
  }
  query() {
    throw new Error(`query is not implemented`);
  }
  shouldReloadRecord() {
    throw new Error(`shouldReloadRecord is not implemented`);
  }
  shouldBackgroundReloadRecord() {
    throw new Error(`shouldBackgroundReloadRecord is not implemented`);
  }
  shouldReloadAll() {
    throw new Error(`shouldReloadAll is not implemented`);
  }
  shouldBackgroundReloadAll() {
    throw new Error(`shouldBackgroundReloadAll is not implemented`);
  }
  buildURL() {
    throw new Error(`buildURL is not implemented`);
  }
}
