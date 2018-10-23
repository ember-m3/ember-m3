import { IS_RECORD_DATA } from 'ember-compatibility-helpers';

export function recordDataFor(recordOrInternalModel) {
  let internalModel = recordOrInternalModel._internalModel || recordOrInternalModel;

  if (IS_RECORD_DATA) {
    return internalModel._modelData;
  }

  return internalModel._recordData;
}
