import { conversationSteps, getNextStep, getStepById } from '../conversation';

describe('conversation engine', () => {
  it('starts with the welcome step', () => {
    const first = conversationSteps[0];
    expect(first.id).toBe('welcome');
  });

  it('ends with the lock_in step', () => {
    const last = conversationSteps[conversationSteps.length - 1];
    expect(last.id).toBe('lock_in');
  });

  it('getStepById returns the correct step', () => {
    const step = getStepById('age');
    expect(step).toBeDefined();
    expect(step!.id).toBe('age');
    expect(step!.inputType).toBe('number');
  });

  it('getNextStep progresses from welcome to for_whom', () => {
    const next = getNextStep('welcome', {}, 'yes');
    expect(next).toBe('for_whom');
  });

  it('income step exists with 5 options after coverage', () => {
    const coverageStep = getStepById('coverage');
    expect(coverageStep).toBeDefined();
    expect(coverageStep!.next).toBe('income');

    const incomeStep = getStepById('income');
    expect(incomeStep).toBeDefined();
    expect(incomeStep!.inputType).toBe('options');
    const options = incomeStep!.options as { label: string; value: string }[];
    expect(options).toHaveLength(5);
    expect(options.map(o => o.value)).toEqual([
      'under_30k', '30k_50k', '50k_75k', '75k_100k', 'over_100k',
    ]);
  });

  it('income step flows to timing', () => {
    const next = getNextStep('income', {}, 'over_100k');
    expect(next).toBe('timing');
  });

  it('all steps have valid next references', () => {
    const stepIds = new Set(conversationSteps.map((s) => s.id));
    stepIds.add('done');

    for (const step of conversationSteps) {
      if (typeof step.next === 'string') {
        expect(stepIds.has(step.next)).toBe(true);
      }
    }
  });
});
