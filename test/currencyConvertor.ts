import { ethers, waffle } from 'hardhat'
import chai from "chai";
import { solidity } from "ethereum-waffle";
import CurrencyConvertorArtifact from '../artifacts/contracts/CurrencyConvertorArtifact.sol/CurrencyConvertor.json';
import { CurrencyConvertor } from '../src/types/CurrencyConvertor';

const { deployContract } = waffle


chai.use(solidity);
const { expect } = chai;
describe("CurrencyConvertor", () => {
  let currencyConvertor: CurrencyConvertor;
  beforeEach(async () => {
    const signers = await ethers.getSigners();
    const currencyConvertorFactory = await ethers.getContractFactory(
      "CurrencyConvertor",
      signers[0]
    );
    currencyConvertor = (await deployContract(signers[0], CurrencyConvertorArtifact)) as CurrencyConvertor
    await currencyConvertor.deployed();
    expect(currencyConvertor.address).to.properAddress;
  });
  // 4
  describe("deposit", async () => {
    it("deposit USDT to USDC", async () => {
      await currencyConvertor.deposit();
    });
  });
  // describe("count down", async () => {
  //   // 5
  //   it("should fail", async () => {
  //     // this test will fail
  //     await counter.countDown();
  //   });
  //   it("should count down", async () => {
  //     await counter.countUp();
  //   await counter.countDown();
  //     const count = await counter.getCount();
  //     expect(count).to.eq(0);
  //   });
  // });
});
