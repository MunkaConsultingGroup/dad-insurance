import { conversationSteps, getNextStep, getStepById } from '../conversation';

describe('conversation engine', () => {
  it('starts with the welcome step', () => {
    const first = conversationSteps[0];
    expect(first.id).toBe('welcome');
  });

  it('has a confirmation step at the end', () => {
    const last = conversationSteps[conversationSteps.length - 1];
    expect(last.id).toBe('confirmation');
  });

  it('getStepById returns the correct step', () => {
    const step = getStepById('age');
    expect(step).toBeDefined();
    expect(step!.id).toBe('age');
    expect(step!.inputType).toBe('number');
  });

  it('getNextStep progresses from welcome to age', () => {
    const next = getNextStep('welcome', {}, 'yes');
    expect(next).toBe('age');
  });

  it('limits term options for age > 70', () => {
    const step = getStepById('term');
    expect(step).toBeDefined();
    const answers = { age: '72' };
    const options = typeof step!.options === 'function' ? step!.options(answers) : step!.options;
    const values = options!.map((o) => o.value);
    expect(values).not.toContain('25');
    expect(values).not.toContain('30');
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
