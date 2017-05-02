import Ember from "ember";

export default Ember.Route.extend({
  model() {
    return this.store.queryURL('/new-api-alt-jsonapi.json');
  },
});
