/* eslint-disable react-hooks/exhaustive-deps */

import React, { useState } from 'react';
import Paragraph from 'antd/lib/typography/Paragraph';
import { notification } from 'antd';
import Big from 'big.js';
import { getWallet, createWallet } from './createWallet';
import useAsyncTimeout from './useAsyncTimeout';
import usePrevious from './usePrevious';
import getSlpBalancesAndUtxos from './getSlpBalancesAndUtxos';

const normalizeBalance = (slpBalancesAndUtxos: any) => {
  const totalBalanceInNiftoshis = slpBalancesAndUtxos.nonSlpUtxos.reduce(
    (previousBalance: any, utxo: any) => previousBalance + utxo.value,
    0
  );
  return {
    totalBalanceInNiftoshis,
    totalBalance: totalBalanceInNiftoshis / 100000000
  };
};

const update = async ({ wallet, setWalletState }: any) => {
  try {
    if (!wallet) {
      return;
    }
    const slpBalancesAndUtxos: any = await getSlpBalancesAndUtxos(wallet.legacyAddress);
    const { tokens } = slpBalancesAndUtxos;
    const newState = {
      balances: {},
      tokens: [],
      slpBalancesAndUtxos: []
    };

    newState.slpBalancesAndUtxos = slpBalancesAndUtxos;
    newState.balances = normalizeBalance(slpBalancesAndUtxos);
    newState.tokens = tokens;

    setWalletState(newState);
  } catch (error) {
    console.log(error);
  }
};

export const useWallet = () => {
  const [wallet, setWallet] = useState();
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

  useAsyncTimeout(async () => {
    const wallet = await getWallet();
    setWallet(wallet); // PIN - could not use getWallet() in the init function since it is async
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
    update: async () =>
      update({
        wallet: await getWallet(),

        setLoading,
        setWalletState
      }),
    createWallet: async (importMnemonic: string) => {
      setLoading(true);
      const newWallet = await createWallet(importMnemonic);
      setWallet(newWallet);
      update({
        wallet: newWallet,
        setWalletState
      }).finally(() => setLoading(false));
    }
  };
};
