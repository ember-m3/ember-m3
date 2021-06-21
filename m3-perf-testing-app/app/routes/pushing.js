import Route from '@ember/routing/route';

export default Route.extend({
  model() {
    performance.mark('start-loading');
    window.setTimeout(() => {
    performance.mark('end-loading');
    }, 100);
    return {};
  },
});