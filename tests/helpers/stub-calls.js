import { zip } from 'lodash';

export default function stubCalls(stub) {
  return zip(
    stub.thisValues.map((x) => x + ''),
    stub.args
  );
}
