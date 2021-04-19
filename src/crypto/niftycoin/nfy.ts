// https://github.com/niftycoin-project/niftycoin/blob/0.17/src/chainparams.cpp

const common = {
  name: 'NiftyCoin',
  unit: 'NFY'
};

export const main = {
  hashGenesisBlock: '1bff4bbd83f4cb3fc8341cf2b258da0777b38a1f567ca2dd56367e84d2402d9d',
  port: 3333,
  protocol: {
    magic: 0xe5c1edaa
  },
  bech32: 'nfy',
  seedsDns: ['dnsseed.niftycoin.org'],
  versions: {
    bip32: {
      private: 0x4e49ade4,
      public: 0x4e49b21e
    },
    bip44: 2, // litecoin
    private: 0x35, // 0x35 (dec 53) for niftycoin, 0x80 (dec 128) for bitcoin, 0xb0 (176) for litecoin
    public: 0x35, // 0x35 (dec 53) for niftycoin, 0x00 for bitcoin, 0x30 (dec 48) for litecoin
    scripthash: 0x32, // note that scripthash and scripthash2 are switched and version 2 is default. 0x32 = (dec 50) for niftycoin, ? for bitcoin, 0x32 (dec 50) for litecoin
    scripthash2: 0x05 // 0x05 = (dec 5) for niftycoin, 0x05 for bitcoin, 0x05 for litecoin
  }
};

export const test = {
  hashGenesisBlock: 'dbf473f411a498ddaeaf95aa8ca475ac56a7e91ca91c61dabbdb72eadc7e7e4d',
  port: 13335,
  protocol: {
    magic: 0xe6c2eebb
  },
  bech32: 'tnfy',
  versions: {
    bip32: {
      private: 0x04358394,
      public: 0x043587cf
    },
    bip44: 1, // testnet all coins
    private: 0xef, // 0xef (dec 239) for for niftycoin, = (dec ? for bitcoin, 0xef (dec 239) for litecoin
    public: 0x6f, // 0x6f (dec 111) for niftycoin, ? for bitcoin, 0x6f (dec 111) for litecoin
    scripthash: 0x3a, // note that scripthash and scripthash2 are switched and version 2 is default. 0x3a (dec 58) for niftycoin, ? for bitcoin, 0x3a (dec 58) for litecoin
    scripthash2: 0xc4 // 0xc4 (dec 196) for niftycoin, ? for bitcoin, 0xc4 (dec 196) for litecoin
  }
};

export const toBitcoinJS = (isTest = false) => {
  const frmt = isTest ? test : main;

  const params = {
    messagePrefix: `\x19${common.name} Signed Message:\n`,
    bech32: frmt.bech32,
    bip32: {
      public: frmt.versions.bip32.public,
      private: frmt.versions.bip32.private
    },
    pubKeyHash: frmt.versions.public,
    scriptHash: frmt.versions.scripthash,
    wif: frmt.versions.private
  };

  return params;
};
