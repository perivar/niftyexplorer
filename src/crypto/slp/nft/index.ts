import { createNFTGroup } from './create-nft-group';
import { createNFTChild } from './create-nft-child';
import { mintNFTGroup } from './mint-nft-group';
import { sendGroupToken } from './send-group';
import { sendChildToken } from './send-child';
import { getNFT } from './get-nft';
import { prepareNFTGroup } from './prepate-nft-group';

const CryptoNFT = {
  createNFTGroup,
  createNFTChild,
  mintNFTGroup,
  sendGroupToken,
  sendChildToken,
  getNFT,
  prepareNFTGroup
};

export default CryptoNFT;
