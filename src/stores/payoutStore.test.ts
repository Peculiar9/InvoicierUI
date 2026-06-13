import { beforeEach, describe, expect, it } from 'vitest';
import { usePayoutStore } from './payoutStore';

describe('payoutStore', () => {
  beforeEach(() => {
    usePayoutStore.setState({
      methods: [],
      defaultMethodId: null,
      schedule: 'manual',
      withdrawals: [],
    });
  });

  it('adds a method and makes the first one the default', () => {
    const id = usePayoutStore.getState().addMethod({
      type: 'bank',
      label: 'Main',
      bankName: 'Chase',
      accountName: 'Ada',
      accountNumber: '12345678',
    });
    const { methods, defaultMethodId } = usePayoutStore.getState();
    expect(methods).toHaveLength(1);
    expect(methods[0]).toMatchObject({ id, type: 'bank', bankName: 'Chase' });
    expect(defaultMethodId).toBe(id);
  });

  it('keeps the existing default when adding more, and can switch it', () => {
    const a = usePayoutStore
      .getState()
      .addMethod({ type: 'bank', label: 'A', accountNumber: '11112222' });
    const b = usePayoutStore
      .getState()
      .addMethod({ type: 'paypal', label: 'B', email: 'b@x.com' });
    expect(usePayoutStore.getState().defaultMethodId).toBe(a);
    usePayoutStore.getState().setDefaultMethod(b);
    expect(usePayoutStore.getState().defaultMethodId).toBe(b);
  });

  it('reassigns the default when the default method is removed', () => {
    const a = usePayoutStore
      .getState()
      .addMethod({ type: 'bank', label: 'A', accountNumber: '11112222' });
    const b = usePayoutStore
      .getState()
      .addMethod({ type: 'bank', label: 'B', accountNumber: '33334444' });
    usePayoutStore.getState().removeMethod(a);
    const { methods, defaultMethodId } = usePayoutStore.getState();
    expect(methods).toHaveLength(1);
    expect(defaultMethodId).toBe(b);
  });

  it('records a withdrawal (with its destination) at the front of the list', () => {
    usePayoutStore.getState().addWithdrawal(250, '2026-06-13T00:00:00.000Z', 'pm_1', 'Main');
    usePayoutStore.getState().addWithdrawal(100, '2026-06-14T00:00:00.000Z', 'pm_2', 'PayPal');
    const { withdrawals } = usePayoutStore.getState();
    expect(withdrawals).toHaveLength(2);
    expect(withdrawals[0]).toMatchObject({ amount: 100, methodLabel: 'PayPal' });
    expect(withdrawals[1]).toMatchObject({ amount: 250, methodLabel: 'Main' });
  });
});
