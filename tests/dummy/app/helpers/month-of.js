import { helper } from '@ember/component/helper';

export function monthOf(params /*, hash*/) {
  let [date] = params;
  return date && date.getMonth() + 1;
}

export default helper(monthOf);
