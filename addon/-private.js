export function recordDataFor(recordOrInternalModel) {
  let internalModel = recordOrInternalModel._internalModel || recordOrInternalModel;

  return internalModel._recordData || internalModel._modelData;
}
