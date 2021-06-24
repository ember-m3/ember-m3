import Route from '@ember/routing/route';
import { action } from '@ember/object';


export default Route.extend({
  model() {
    performance.mark('start-loading');
    return { message: 'hello'};
  },

  @action
  didTransition() {
    performance.mark('end-loading');
  }
});