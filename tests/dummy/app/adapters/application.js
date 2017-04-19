import DS from 'ember-data';

export default DS.JSONAPIAdapter.extend({
  // TODO: remove this adapter
  queryRecord(/* store, type, query */) {
    return this.ajax('/new-api-jsonapi.json');
  }
});
