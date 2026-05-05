import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encryptSecret, decryptSecret } from '@/utils/crypto';
import { Logger } from '@/utils/logger';

const TAG = 'AccountsStore';

export interface StoredAccount {
  id: string;
  alias: string;
  region: string;
  accessKeyId: string;
  secretAccessKeyEncrypted: string;
  createdAt: number;
}

export interface AccountFormData {
  alias: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface AccountsState {
  accounts: StoredAccount[];
  addAccount: (data: AccountFormData) => string;
  updateAccount: (id: string, data: AccountFormData) => void;
  removeAccount: (id: string) => void;
  getDecryptedSecret: (id: string) => string;
}

function generateId(): string {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const useAccountsStore = create<AccountsState>()(
  persist(
    (set, get) => ({
      accounts: [],

      addAccount: (data) => {
        const id = generateId();
        const account: StoredAccount = {
          id,
          alias: data.alias.trim() || `Account ${get().accounts.length + 1}`,
          region: data.region.trim(),
          accessKeyId: data.accessKeyId.trim(),
          secretAccessKeyEncrypted: encryptSecret(data.secretAccessKey),
          createdAt: Date.now(),
        };
        Logger.info(TAG, 'Account added', { id, region: account.region, alias: account.alias });
        set({ accounts: [...get().accounts, account] });
        return id;
      },

      updateAccount: (id, data) => {
        Logger.info(TAG, 'Account updated', { id });
        set({
          accounts: get().accounts.map((a) =>
            a.id === id
              ? {
                  ...a,
                  alias: data.alias.trim() || a.alias,
                  region: data.region.trim(),
                  accessKeyId: data.accessKeyId.trim(),
                  secretAccessKeyEncrypted: data.secretAccessKey
                    ? encryptSecret(data.secretAccessKey)
                    : a.secretAccessKeyEncrypted,
                }
              : a,
          ),
        });
      },

      removeAccount: (id) => {
        Logger.info(TAG, 'Account removed', { id });
        set({ accounts: get().accounts.filter((a) => a.id !== id) });
      },

      getDecryptedSecret: (id) => {
        const account = get().accounts.find((a) => a.id === id);
        if (!account) return '';
        return decryptSecret(account.secretAccessKeyEncrypted);
      },
    }),
    {
      name: 'awsight-accounts',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accounts: state.accounts,
      }),
      onRehydrateStorage: () => {
        Logger.debug(TAG, 'Accounts store rehydrating');
        return (state, error) => {
          if (error) {
            Logger.logError(TAG, 'Accounts store rehydration failed', error);
          } else {
            Logger.info(TAG, 'Accounts store rehydrated', {
              count: state?.accounts?.length || 0,
            });
          }
        };
      },
    },
  ),
);
