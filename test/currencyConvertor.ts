import { ethers, waffle } from 'hardhat'
import chai from "chai";
import { solidity } from "ethereum-waffle";
import CurrencyConvertorArtifact from '../artifacts/contracts/proxies/CurrencyConvertor.sol/CurrencyConvertor.json';
import ZeroExExchangeWrapperArtifact from '../artifacts/contracts/exchange-wrappers/ZeroExExchangeWrapper.sol/ZeroExExchangeWrapper.json';
import StarkwareArtifact from '../artifacts/contracts/exchange-wrappers/Starkware.sol/Starkware.json';
import UsdcContractArtifact from '../artifacts/contracts/tokens/mockUsdcContract.sol/MockUsdcContract.json';
import { formatUnits } from '@ethersproject/units';

const { deployContract } = waffle


chai.use(solidity);
const { expect } = chai;
describe("CurrencyConvertor", () => {
  let currencyConvertor: any;
  let zeroExExchangeWrapper: any;
  let starkware: any;
  let usdc: any;
  beforeEach(async () => {
    const signers = await ethers.getSigners();

    zeroExExchangeWrapper = await deployContract(
      signers[0],
      ZeroExExchangeWrapperArtifact,
    );
    starkware = await deployContract(
      signers[0],
      StarkwareArtifact,
    );
    usdc = await deployContract(
      signers[0],
      UsdcContractArtifact,
    )

    await usdc.mint(
      zeroExExchangeWrapper.address,
      formatUnits(1000, 6),
    )
    await usdc.mint(
      starkware.address,
      formatUnits(1000, 6),
    )

    currencyConvertor = await deployContract(
      signers[0],
      CurrencyConvertorArtifact,
      [
        starkware.address,
        usdc.address, // placeholder for USDC
        156,
      ],
    );

    await usdc.mint(
      currencyConvertor.address,
      formatUnits(1000, 6),
    )

    await usdc.approve(currencyConvertor.address, 100);

    expect(currencyConvertor.address).to.properAddress;
  });
  // 4
  describe("deposit", async () => {
    it("deposit USDT to USDC", async () => {
      await currencyConvertor.deposit(
        usdc.address, // placeholder for USDT
        100,
        zeroExExchangeWrapper.address,
        100,
        1,
        0x4,
      );
    });
  });
});
