import { deployContract } from 'ethereum-waffle';
import { CurrencyConvertor, ZeroExUsdcExchangeProxy } from '../../src/types';
import CurrencyConvertorArtifact from '../../artifacts/contracts/proxies/CurrencyConvertor.sol/CurrencyConvertor.json';
import ZeroExExchangeProxyArtifact from '../../artifacts/contracts/proxies/ZeroExUsdcExchangeProxy.sol/ZeroExUsdcExchangeProxy.json';
import { getHre } from '../helpers/hre';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { NetworkName } from '../helpers/types';

const DYDX_USDC_ADDRESS_ROPSTEN: string = '0x8707a5bf4c2842d46b31a405ba41b858c0f876c4';
const USDC_ADDRESS_MAINNET: string = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

const STARKWARE_MAINNET_ADDRESS: string = '0xD54f502e184B6B739d7D27a6410a67dc462D69c8';
const STARKWARE_ROPSTEN_ADDRESS: string = '0x014F738EAd8Ec6C50BCD456a971F8B84Cd693BBe';

const MAINNET_USDC_ASSET_ID: string = '0x02893294412a4c8f915f75892b395ebbf6859ec246ec365c3b1f56f47c3a0a5d';
const ROPSTEN_USDC_ASSET_ID: string = '0x02c04d8b650f44092278a7cb1e1028c82025dff622db96c934b611b84cc8de5a';

const BICONOMY_MAINNET_FORWARDER: string = '0x84a0856b038eaAd1cC7E297cF34A7e72685A8693';
const BICONOMY_ROPSTEN_FORWARDER: string = '0x3D1D6A62c588C1Ee23365AF623bdF306Eb47217A';

export async function deployProxyDeposit(
  environment: NetworkName,

): Promise<void> {
  if (![NetworkName.ropsten, NetworkName.mainnet].includes(environment)) {
    throw Error(`Invalid environment: ${environment}`);
  }

  const signers: SignerWithAddress[] = await getHre().ethers.getSigners();

  const isRopsten: boolean = environment ===NetworkName.ropsten;

  const currencyConvertor: CurrencyConvertor = await deployContract(
    signers[0],
    CurrencyConvertorArtifact,
    [
      isRopsten ? STARKWARE_ROPSTEN_ADDRESS : STARKWARE_MAINNET_ADDRESS,
      isRopsten ? DYDX_USDC_ADDRESS_ROPSTEN : USDC_ADDRESS_MAINNET,
      isRopsten ? ROPSTEN_USDC_ASSET_ID : MAINNET_USDC_ASSET_ID,
      isRopsten ? BICONOMY_ROPSTEN_FORWARDER : BICONOMY_MAINNET_FORWARDER,
    ],
  ) as CurrencyConvertor;

  const zeroExExchangeProxy: ZeroExUsdcExchangeProxy = await deployContract(
    signers[0],
    ZeroExExchangeProxyArtifact,
    [
      isRopsten ? DYDX_USDC_ADDRESS_ROPSTEN : USDC_ADDRESS_MAINNET,
    ],
  ) as ZeroExUsdcExchangeProxy;


  console.log(`currencyConvertor address: ${currencyConvertor.address}`);
  console.log(`zeroExExchangeProxy address: ${zeroExExchangeProxy.address}`);
}
