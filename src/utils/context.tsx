import React from 'react';
import { useWallet } from './useWallet';
export const WalletContext = React.createContext<any>(undefined);

export const WalletProvider = ({ children }: any) => {
  return <WalletContext.Provider value={useWallet()}>{children}</WalletContext.Provider>;
};
