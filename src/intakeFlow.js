export const INTAKE_CONTACT_STEP = 5;

export function nextIntakeStep(currentStep, descriptionMode) {
  if (currentStep === 3) {
    return descriptionMode === "without_description" ? INTAKE_CONTACT_STEP : 4;
  }
  return Math.min(INTAKE_CONTACT_STEP, currentStep + 1);
}

export function previousIntakeStep(currentStep, descriptionMode) {
  if (
    currentStep === INTAKE_CONTACT_STEP &&
    descriptionMode === "without_description"
  ) {
    return 3;
  }
  return Math.max(1, currentStep - 1);
}

export function visibleIntakeProgress(currentStep, descriptionMode) {
  const skipsDescription = descriptionMode !== "with_description";
  return {
    step:
      currentStep === INTAKE_CONTACT_STEP && skipsDescription
        ? 4
        : currentStep,
    total: skipsDescription ? 4 : 5,
  };
}
