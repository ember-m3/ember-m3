import Route from '@ember/routing/route';

export default Route.extend({
  model() {
    return this.store.queryURL('/api1.json');
  },
});
