import { ethers, waffle } from 'hardhat'


import chai from "chai";
import { solidity } from "ethereum-waffle";
import CurrencyConvertorArtifact from '../artifacts/contracts/proxies/CurrencyConvertor.sol/CurrencyConvertor.json';
import StarkwareArtifact from '../artifacts/contracts/exchange-wrappers/Starkware.sol/MockStarkware.json';
import ZeroExExchangeWrapperArtifact from '../artifacts/contracts/exchange-wrappers/ZeroExExchangeWrapper.sol/ZeroExExchangeWrapper.json';
import fakeUSDCContractArtifact from '../artifacts/contracts/tokens/mockUsdcContract.sol/MockUsdcContract.json';
import { createUser, generateQueryPath } from './helpers';
import { axiosRequest, RequestMethod } from '@dydxprotocol/v3-client/build/src/lib/axios';

const { deployContract } = waffle

chai.use(solidity);
const { expect } = chai;

describe("CurrencyConvertor", () => {
  let currencyConvertor: any;
  let zeroExExchangeWrapper: any;
  let starkware: any;
  let fakeUSDC: any;
  let user: any;
  beforeEach(async () => {
    const signers = await ethers.getSigners();

    zeroExExchangeWrapper = await deployContract(
      signers[0],
      ZeroExExchangeWrapperArtifact,
    );
    fakeUSDC = await deployContract(
      signers[0],
      fakeUSDCContractArtifact,
    )

    starkware = await deployContract(
      signers[0],
      StarkwareArtifact,
      [fakeUSDC.address],
    );
    currencyConvertor = await deployContract(
      signers[0],
      CurrencyConvertorArtifact,
      [
        starkware.address, // '0x014F738EAd8Ec6C50BCD456a971F8B84Cd693BBe',
        fakeUSDC.address,
        '1',
      ],
    );
    await currencyConvertor.approveMaximumOnL2();

    await fakeUSDC.mint(
      currencyConvertor.address,
      1000e6,
    )
    await fakeUSDC.mint(
      signers[0].address,
      1000e6,
    )

    await fakeUSDC.approve(currencyConvertor.address, 1e10);

    user = await createUser();
  });

  describe("deposit", async () => {
    it("deposit USDT to fakeUSDC", async () => {
      const zeroExTransaction: any = await axiosRequest({
        method: RequestMethod.GET,
        url: generateQueryPath(
          'https://api.0x.org/swap/v1/quote',
          {
            sellToken: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
            buyToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
            sellAmount: '10000000',
          },
        ),
      });

      await currencyConvertor.deposit(
        fakeUSDC.address,
        100,
        zeroExTransaction.to,
        `0x${user.account.starkKey.slice(1)}`,
        user.account.positionId,
        zeroExTransaction.data,
      );
    });
  });
});
