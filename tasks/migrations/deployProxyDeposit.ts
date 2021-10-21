import { deployContract } from 'ethereum-waffle';
import { CurrencyConvertor } from '../../src/types';
import CurrencyConvertorArtifact from '../../artifacts/contracts/proxies/CurrencyConvertor.sol/CurrencyConvertor.json';
import { ethers } from 'hardhat';

const DYDX_USDC_ADDRESS_ROPSTEN: string = '0x8707a5bf4c2842d46b31a405ba41b858c0f876c4';
const USDC_ADDRESS_MAINNET: string = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

const STARKWARE_MAINNET_ADDRESS: string = '0xD54f502e184B6B739d7D27a6410a67dc462D69c8';
const STARKWARE_ROPSTEN_ADDRESS: string = '0x014F738EAd8Ec6C50BCD456a971F8B84Cd693BBe';

const MAINNET_USDC_ASSET_ID: string = '0x02893294412a4c8f915f75892b395ebbf6859ec246ec365c3b1f56f47c3a0a5d';
const ROPSTEN_USDC_ASSET_ID: string = '0x02c04d8b650f44092278a7cb1e1028c82025dff622db96c934b611b84cc8de5a';

export async function deployProxyDeposit(environment: string): Promise<void> {
  if (!['ROPSTEN', 'MAINNET'].includes(environment as string)) {
    throw Error(`Invalid environment: ${environment}`);
  }

  const signer = await ethers.getSigners();

  const isRopsten: boolean = environment === 'ROPSTEN';
  console.log(isRopsten);
  await deployContract(
    signer[0],
    CurrencyConvertorArtifact,
    [
      isRopsten ? STARKWARE_ROPSTEN_ADDRESS : STARKWARE_MAINNET_ADDRESS,
      isRopsten ? DYDX_USDC_ADDRESS_ROPSTEN : USDC_ADDRESS_MAINNET,
      isRopsten ? ROPSTEN_USDC_ASSET_ID : MAINNET_USDC_ASSET_ID,
    ],
  ) as CurrencyConvertor;
}