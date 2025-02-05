// Copyright 2019-2022 @subwallet/wallet-connect authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { useLocalStorage } from '../hooks/useLocalStorage';
import { windowReload } from '../../../utils/window';
import { getWalletBySource } from '../wallet-connect/src/dotsama/wallets';
import { getEvmWalletBySource } from '../wallet-connect/src/evm/evmWallets';
import { EvmWallet, Wallet, WalletAccount } from '../wallet-connect/src/types';
import React, { useCallback, useEffect, useState } from 'react';

import { OpenSelectWallet, WalletContext, WalletContextInterface } from '../contexts';

interface Props {
  children: React.ReactElement;
}

export function WalletContextProvider ({ children }: Props) {
  const [walletKey, setWalletKey] = useLocalStorage('wallet-key');
  const [walletType, setWalletType] = useLocalStorage('wallet-type', 'substrate');
  const [currentWallet, setCurrentWallet] = useState<Wallet | EvmWallet | undefined>(getWalletBySource(walletKey));
  const [isSelectWallet, setIsSelectWallet] = useState(false);
  const [isWalletSelected, setIsWalletSelected] = useState(false);

  const [accounts, setAccounts] = useState<WalletAccount[]>([]);

  const afterSelectWallet = useCallback(
    async (wallet: Wallet) => {
      const infos = await wallet.getAccounts();

      infos && setAccounts(infos);
    },
    []
  );

  const selectWallet = useCallback(
    async (wallet: Wallet) => {
      setCurrentWallet(currentWallet);

      await wallet.enable();
      setWalletKey(wallet.extensionName);
      setIsWalletSelected(true);

      await afterSelectWallet(wallet);
    },
    [afterSelectWallet, currentWallet, setWalletKey]
  );

  const afterSelectEvmWallet = useCallback(
    async (wallet: EvmWallet) => {
      await wallet?.enable(); // Quick call extension?.request({ method: 'eth_requestAccounts' });
    },
    []
  );

  const selectEvmWallet = useCallback(
    async (wallet: EvmWallet) => {
      await afterSelectEvmWallet(wallet);

      setCurrentWallet(currentWallet);

      setWalletKey(wallet.extensionName);
      setIsWalletSelected(true);

      windowReload();
    },
    [afterSelectEvmWallet, currentWallet, setWalletKey]
  );

  const walletContext = {
    wallet: getWalletBySource(walletKey),
    evmWallet: getEvmWalletBySource(walletKey),
    accounts,
    setWallet: (wallet: Wallet | EvmWallet | undefined, walletType: 'substrate' | 'evm') => {
      if (walletType === 'substrate') {
        wallet && selectWallet(wallet as Wallet);
      } else {
        wallet && selectEvmWallet(wallet as EvmWallet);
      }

      wallet && setWalletType(walletType);
    },
    walletType
  };

  const selectWalletContext = {
    isOpen: isSelectWallet,
    open: () => {
      setIsSelectWallet(true);
    },
    close: () => {
      setIsSelectWallet(false);
    }
  };

  useEffect(
    () => {
      if (walletType === 'substrate') {
        const wallet = getWalletBySource(walletKey);

        setTimeout(() => {
          if (wallet && wallet?.installed) {
            // eslint-disable-next-line no-void
            void afterSelectWallet(wallet);
          }
        }, 150);
      } else {
        const evmWallet = getEvmWalletBySource(walletKey);

        evmWallet && evmWallet?.isReady.then(() => {
          afterSelectEvmWallet(evmWallet).catch(console.error);
        });
      }
    },
    [afterSelectEvmWallet, afterSelectWallet, walletKey, walletType]
  );

  return <WalletContext.Provider value={walletContext as WalletContextInterface}>
    <OpenSelectWallet.Provider value={selectWalletContext}>
      {children}
    </OpenSelectWallet.Provider>
  </WalletContext.Provider>;
}