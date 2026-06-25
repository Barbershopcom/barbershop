import { addMonths } from 'date-fns';
import { computeNextPeriodEnd, mapPreapprovalStatus } from '../src/billing/billing.service';

describe('billing state machine (puro)', () => {
  it('mapeia status do preapproval', () => {
    expect(mapPreapprovalStatus('cancelled')).toBe('cancelled');
    expect(mapPreapprovalStatus('paused')).toBe('suspended');
    expect(mapPreapprovalStatus('authorized')).toBeNull();
  });
  it('próximo período: mensal +1, anual +12', () => {
    const base = new Date('2026-06-24T00:00:00Z');
    expect(computeNextPeriodEnd('monthly', base).getTime()).toBe(addMonths(base, 1).getTime());
    expect(computeNextPeriodEnd('annual', base).getTime()).toBe(addMonths(base, 12).getTime());
  });
});
