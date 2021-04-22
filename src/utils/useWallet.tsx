/* eslint-disable react-hooks/exhaustive-deps */

import React, { useState } from 'react';
import Paragraph from 'antd/lib/typography/Paragraph';
import { notification } from 'antd';
import Big from 'big.js';
import { getWallet, createWallet } from './createWallet';
import useAsyncTimeout from './useAsyncTimeout';
import usePrevious from './usePrevious';

// const normalizeSlpBalancesAndUtxos = (SLP, slpBalancesAndUtxos, wallet) => {
//   slpBalancesAndUtxos.nonSlpUtxos.forEach(utxo => {
//     const derivatedAccount = wallet.Accounts.find(account => account.cashAddress === utxo.address);
//     utxo.wif = derivatedAccount.fundingWif;
//   });

//   return slpBalancesAndUtxos;
// };

// const normalizeBalance = (SLP, slpBalancesAndUtxos) => {
//   const totalBalanceInSatohis = slpBalancesAndUtxos.nonSlpUtxos.reduce(
//     (previousBalance, utxo) => previousBalance + utxo.satoshis,
//     0
//   );
//   return {
//     totalBalanceInSatohis,
//     totalBalance: SLP.BitcoinCash.toBitcoinCash(totalBalanceInSatohis)
//   };
// };

const update = async ({ wallet, setWalletState }: any) => {
  try {
    if (!wallet) {
      return;
    }
    // const slpBalancesAndUtxos = await getSlpBanlancesAndUtxos(wallet.cashAddresses);
    // const { tokens } = slpBalancesAndUtxos;
    const newState = {
      balances: {},
      tokens: [],
      slpBalancesAndUtxos: []
    };

    // newState.slpBalancesAndUtxos = normalizeSlpBalancesAndUtxos(SLP, slpBalancesAndUtxos, wallet);
    // newState.balances = normalizeBalance(SLP, slpBalancesAndUtxos);
    // newState.tokens = tokens;

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
    setWallet(wallet); // PIN added this
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
