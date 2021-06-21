import Route from '@ember/routing/route';

export default Route.extend({
  model() {
    performance.mark('start-loading');
    return { message: 'hello'};
  },

  didTransition() {
      performance.mark('end-loading');
  }
});