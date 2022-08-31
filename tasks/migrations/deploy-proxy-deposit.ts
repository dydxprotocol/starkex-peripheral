import { deployContract } from 'ethereum-waffle';
import { CurrencyConvertor, UsdcExchangeProxy } from '../../src/types';
import CurrencyConvertorArtifact from '../../artifacts/contracts/proxies/CurrencyConvertor.sol/CurrencyConvertor.json';
import UsdcExchangeProxyArtifact from '../../artifacts/contracts/proxies/UsdcExchangeProxy.sol/UsdcExchangeProxy.json';
import { getHre } from '../helpers/hre';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { NetworkName } from '../helpers/types';

const config: {
  [networkName: string]: {
    USDC_ASSET_ID: string,
    USDC_ADDRESS: string,
    PERPETUAL_ADDRESS: string,
    BICONOMY_FORWARDER_ADDRESS: string,
  },
} = {
  [NetworkName.ropsten]: {
    USDC_ASSET_ID: '0x02c04d8b650f44092278a7cb1e1028c82025dff622db96c934b611b84cc8de5a',
    USDC_ADDRESS: '0x8707a5bf4c2842d46b31a405ba41b858c0f876c4',
    PERPETUAL_ADDRESS: '0x014F738EAd8Ec6C50BCD456a971F8B84Cd693BBe',
    BICONOMY_FORWARDER_ADDRESS: '0x3D1D6A62c588C1Ee23365AF623bdF306Eb47217A',
  },
  [NetworkName.goerli]: {
    USDC_ASSET_ID: '0x3bda2b4764039f2df44a00a9cf1d1569a83f95406a983ce4beb95791c376008',
    USDC_ADDRESS: '0xF7a2fa2c2025fFe64427dd40Dc190d47ecC8B36e',
    PERPETUAL_ADDRESS: '0xABceA8A75Ada923c5f327344F3aF38ea4AB872bb',
    BICONOMY_FORWARDER_ADDRESS: '0xE041608922d06a4F26C0d4c27d8bCD01daf1f792',
  },
  [NetworkName.mainnet]: {
    USDC_ASSET_ID: '0x02893294412a4c8f915f75892b395ebbf6859ec246ec365c3b1f56f47c3a0a5d',
    USDC_ADDRESS: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    PERPETUAL_ADDRESS: '0xD54f502e184B6B739d7D27a6410a67dc462D69c8',
    BICONOMY_FORWARDER_ADDRESS: '0x84a0856b038eaAd1cC7E297cF34A7e72685A8693',
  },
};

export async function deployProxyDeposit(
  environment: NetworkName,

): Promise<void> {
  if (![NetworkName.ropsten, NetworkName.goerli, NetworkName.mainnet].includes(environment)) {
    throw Error(`Invalid environment: ${environment}`);
  }

  const signers: SignerWithAddress[] = await getHre().ethers.getSigners();

  const {
    USDC_ASSET_ID,
    USDC_ADDRESS,
    PERPETUAL_ADDRESS,
    BICONOMY_FORWARDER_ADDRESS,
  } = config[environment];

  const currencyConvertor: CurrencyConvertor = await deployContract(
    signers[0],
    CurrencyConvertorArtifact,
    [
      PERPETUAL_ADDRESS,
      USDC_ADDRESS,
      USDC_ASSET_ID,
      BICONOMY_FORWARDER_ADDRESS,
    ],
  ) as CurrencyConvertor;

  const usdcExchangeProxy: UsdcExchangeProxy = await deployContract(
    signers[0],
    UsdcExchangeProxyArtifact,
    [
      USDC_ADDRESS,
    ],
  ) as UsdcExchangeProxy;


  console.log(`currencyConvertor address: ${currencyConvertor.address}`);
  console.log(`usdcExchangeProxy address: ${usdcExchangeProxy.address}`);
}
