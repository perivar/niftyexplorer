/* eslint-disable react-hooks/exhaustive-deps */

import React, { useState } from 'react';
import Paragraph from 'antd/lib/typography/Paragraph';
import { notification } from 'antd';
import Big from 'big.js';
import { getWallet, createWallet } from './createWallet';
import useAsyncTimeout from './useAsyncTimeout';
import usePrevious from './usePrevious';

const update = async ({ wallet, setWalletState }: any) => {
  try {
    if (!wallet) {
      return;
    }
    const newState = {
      balances: {},
      tokens: [],
      slpBalancesAndUtxos: []
    };

    // newState.tokens = tokens;

    setWalletState(newState);
  } catch (error) {
    console.log(error);
  }
};

export const useWallet = () => {
  const [wallet, setWallet] = useState(getWallet());
  const [walletState, setWalletState] = useState<any>({
    balances: {},
    tokens: [],
    slpBalancesAndUtxos: []
  });
  const [loading, setLoading] = useState(true);
  const { balances, tokens, slpBalancesAndUtxos } = walletState;
  const previousBalances: any = usePrevious(balances);

  if (
    previousBalances &&
    balances &&
    'totalBalance' in previousBalances &&
    'totalBalance' in balances &&
    new Big(balances.totalBalance).minus(previousBalances.totalBalance).gt(0)
  ) {
    notification.success({
      message: 'NFY',
      description: (
        <Paragraph>
          You received {Number(balances.totalBalance - previousBalances.totalBalance).toFixed(8)} NFY!
        </Paragraph>
      ),
      duration: 2
    });
  }

  useAsyncTimeout(() => {
    const wallet = getWallet();
    update({
      wallet,
      setWalletState
    }).finally(() => {
      setLoading(false);
    });
  }, 5000);

  return {
    wallet,
    slpBalancesAndUtxos,
    balances,
    tokens,
    loading,
    update: () =>
      update({
        wallet: getWallet(),

        setLoading,
        setWalletState
      }),
    createWallet: (importMnemonic: string) => {
      setLoading(true);
      const newWallet = createWallet(importMnemonic);
      setWallet(newWallet);
      update({
        wallet: newWallet,
        setWalletState
      }).finally(() => setLoading(false));
    }
  };
};
