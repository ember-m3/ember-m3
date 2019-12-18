import { IS_RECORD_DATA } from 'ember-m3/-infra/versions';
import { CUSTOM_MODEL_CLASS } from 'ember-m3/-infra/features';

export function recordDataFor(recordOrInternalModel) {
  if (CUSTOM_MODEL_CLASS) {
    return recordOrInternalModel._recordData;
  }
  let internalModel = recordOrInternalModel._internalModel || recordOrInternalModel;
  if (!IS_RECORD_DATA) {
    return internalModel._modelData;
  }

  return internalModel._recordData;
}
