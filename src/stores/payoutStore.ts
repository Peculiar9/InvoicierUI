import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type PayoutType = 'bank' | 'paypal';

export interface PayoutMethod {
  id: string;
  type: PayoutType;
  label: string;
  /* bank */
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  /* paypal */
  email?: string;
}

export type PayoutSchedule = 'manual' | 'weekly' | 'monthly';

export interface Withdrawal {
  id: string;
  amount: number;
  date: string;
  methodId: string | null;
  methodLabel: string;
}

export type NewPayoutMethod = Omit<PayoutMethod, 'id'>;

interface PayoutState {
  methods: PayoutMethod[];
  defaultMethodId: string | null;
  schedule: PayoutSchedule;
  withdrawals: Withdrawal[];
  addMethod: (method: NewPayoutMethod) => string;
  updateMethod: (id: string, updates: Partial<NewPayoutMethod>) => void;
  removeMethod: (id: string) => void;
  setDefaultMethod: (id: string) => void;
  setSchedule: (schedule: PayoutSchedule) => void;
  addWithdrawal: (amount: number, date: string, methodId: string | null, methodLabel: string) => void;
}

let seq = 0;
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(seq++).toString(36)}`;

export const usePayoutStore = create<PayoutState>()(
  persist(
    (set) => ({
      methods: [],
      defaultMethodId: null,
      schedule: 'manual',
      withdrawals: [],

      addMethod: (method) => {
        const id = newId('pm');
        set((s) => ({
          methods: [...s.methods, { ...method, id }],
          // first method added becomes the default automatically
          defaultMethodId: s.defaultMethodId ?? id,
        }));
        return id;
      },

      updateMethod: (id, updates) =>
        set((s) => ({
          methods: s.methods.map((m) => (m.id === id ? { ...m, ...updates } : m)),
        })),

      removeMethod: (id) =>
        set((s) => {
          const methods = s.methods.filter((m) => m.id !== id);
          const defaultMethodId =
            s.defaultMethodId === id ? methods[0]?.id ?? null : s.defaultMethodId;
          return { methods, defaultMethodId };
        }),

      setDefaultMethod: (id) => set({ defaultMethodId: id }),
      setSchedule: (schedule) => set({ schedule }),

      addWithdrawal: (amount, date, methodId, methodLabel) =>
        set((s) => ({
          withdrawals: [
            { id: newId('wd'), amount, date, methodId, methodLabel },
            ...s.withdrawals,
          ],
        })),
    }),
    {
      name: 'invoicier-payouts',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // migrate the old single-method shape into the multi-method shape
      migrate: (persisted: unknown, version: number) => {
        const state = (persisted ?? {}) as Record<string, unknown>;
        if (version >= 1 && Array.isArray(state.methods)) {
          return state as unknown as PayoutState;
        }
        const old = state.method as
          | { bankName?: string; accountName?: string; accountNumber?: string }
          | undefined;
        const hasOld = !!old && !!old.accountNumber && old.accountNumber.trim().length > 0;
        const methods: PayoutMethod[] = hasOld
          ? [
              {
                id: 'pm_legacy',
                type: 'bank',
                label: old!.bankName || 'Bank account',
                bankName: old!.bankName,
                accountName: old!.accountName,
                accountNumber: old!.accountNumber,
              },
            ]
          : [];
        const defaultMethodId = methods[0]?.id ?? null;
        const label = methods[0]?.label ?? 'Bank account';
        const withdrawals = (Array.isArray(state.withdrawals) ? state.withdrawals : []).map(
          (w: { id?: string; amount?: number; date?: string }) => ({
            id: w.id ?? newId('wd'),
            amount: Number(w.amount) || 0,
            date: w.date ?? '',
            methodId: defaultMethodId,
            methodLabel: label,
          })
        );
        return {
          methods,
          defaultMethodId,
          schedule: (state.schedule as PayoutSchedule) ?? 'manual',
          withdrawals,
        } as unknown as PayoutState;
      },
    }
  )
);
