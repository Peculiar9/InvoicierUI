import { beforeEach, describe, expect, it } from 'vitest';
import { usePayoutStore } from './payoutStore';

describe('payoutStore', () => {
  beforeEach(() => {
    usePayoutStore.setState({
      method: { bankName: '', accountName: '', accountNumber: '' },
      schedule: 'manual',
      withdrawals: [],
    });
  });

  it('saves a payout method', () => {
    usePayoutStore.getState().setMethod({ bankName: 'Chase', accountNumber: '12345' });
    expect(usePayoutStore.getState().method).toMatchObject({
      bankName: 'Chase',
      accountNumber: '12345',
    });
  });

  it('records a withdrawal at the front of the list', () => {
    usePayoutStore.getState().addWithdrawal(250, '2026-06-13T00:00:00.000Z');
    usePayoutStore.getState().addWithdrawal(100, '2026-06-14T00:00:00.000Z');
    const { withdrawals } = usePayoutStore.getState();
    expect(withdrawals).toHaveLength(2);
    expect(withdrawals[0].amount).toBe(100);
    expect(withdrawals[1].amount).toBe(250);
  });
});
