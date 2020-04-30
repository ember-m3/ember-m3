import { CUSTOM_MODEL_CLASS } from 'ember-m3/-infra/features';

export function recordDataFor(recordOrInternalModel) {
  if (CUSTOM_MODEL_CLASS) {
    return recordOrInternalModel._recordData;
  }
  let internalModel = recordOrInternalModel._internalModel || recordOrInternalModel;

  return internalModel._recordData;
}
