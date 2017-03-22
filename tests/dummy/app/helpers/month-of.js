import Ember from 'ember';

export function monthOf(params/*, hash*/) {
  let [ date ] = params;
  return date && date.getMonth() + 1;
}

export default Ember.Helper.helper(monthOf);
