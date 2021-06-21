import Route from '@ember/routing/route';

export default Route.extend({
  model() {
    performance.mark('start-loading');
    performance.mark('stop-loading');
    return {};
  },
});