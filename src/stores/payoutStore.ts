import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface PayoutMethod {
  bankName: string;
  accountName: string;
  accountNumber: string;
}

export type PayoutSchedule = 'manual' | 'weekly' | 'monthly';

export interface Withdrawal {
  id: string;
  amount: number;
  date: string;
}

interface PayoutState {
  method: PayoutMethod;
  schedule: PayoutSchedule;
  withdrawals: Withdrawal[];
  setMethod: (updates: Partial<PayoutMethod>) => void;
  setSchedule: (schedule: PayoutSchedule) => void;
  addWithdrawal: (amount: number, date: string) => void;
}

const defaultMethod: PayoutMethod = {
  bankName: '',
  accountName: '',
  accountNumber: '',
};

export const usePayoutStore = create<PayoutState>()(
  persist(
    (set) => ({
      method: defaultMethod,
      schedule: 'manual',
      withdrawals: [],
      setMethod: (updates) => set((s) => ({ method: { ...s.method, ...updates } })),
      setSchedule: (schedule) => set({ schedule }),
      addWithdrawal: (amount, date) =>
        set((s) => ({
          withdrawals: [
            { id: `wd_${s.withdrawals.length + 1}_${Math.floor(amount)}`, amount, date },
            ...s.withdrawals,
          ],
        })),
    }),
    {
      name: 'invoicier-payouts',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
