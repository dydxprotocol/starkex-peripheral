import { ethers, waffle } from 'hardhat'
import hre from 'hardhat';
import '@nomiclabs/hardhat-ethers';


import chai from "chai";
import { solidity } from "ethereum-waffle";
import CurrencyConvertorArtifact from '../artifacts/contracts/proxies/CurrencyConvertor.sol/CurrencyConvertor.json';
import StarkwareArtifact from '../artifacts/contracts/mocks/Starkware.sol/MockStarkware.json';
import ZeroExExchangeArtifact from '../artifacts/contracts/exchange-wrappers/zeroExExchangeWrapper.sol/zeroExExchangeWrapper.json';
import { axiosRequest, encode, generateQueryPath } from './helpers';
import { tokenAbi } from './abis';

import { CurrencyConvertor } from '../src/types';
import { MockStarkware } from '../src/types';
import { ZeroExExchangeWrapper } from '../src/types';

const { deployContract } = waffle

chai.use(solidity);

const impersonatedAccount: string = '0xf0b2e1362f2381686575265799c5215ef712162f';
const usdcAddres: string = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const uniswapAddress: string = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';

describe("CurrencyConvertor", () => {
  let currencyConvertor: CurrencyConvertor;
  let starkware: MockStarkware;
  let zeroExExchangeWrapper: ZeroExExchangeWrapper;
  beforeEach(async () => {
    // setup account
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonatedAccount],
    });
    await hre.network.provider.request({
      method: "hardhat_setBalance",
      params: [
        impersonatedAccount,
        "0x1000000000000000000",
      ],
    });
    const signer = await ethers.getSigner(impersonatedAccount);

    // deploy contracts
    starkware = await deployContract(
      signer,
      StarkwareArtifact,
      [uniswapAddress],
    ) as MockStarkware;
    currencyConvertor = await deployContract(
      signer,
      CurrencyConvertorArtifact,
      [
        starkware.address,
        uniswapAddress,
        '1',
      ],
    ) as CurrencyConvertor;
    zeroExExchangeWrapper = await deployContract(
      signer,
      ZeroExExchangeArtifact,
    ) as ZeroExExchangeWrapper;

    // get ERC20 contracts
    const usdcContract = new ethers.Contract(
    usdcAddres,
    tokenAbi,
    signer,
    );

    // approve ERC20 contracts
    await usdcContract.approve(
    currencyConvertor.address,
    1000e6,
    );
  });

  describe("deposit", async () => {
    it("deposit USDC to Uniswap", async () => {
      const zeroExTransaction: any = await axiosRequest({
        method: 'GET',
        url: generateQueryPath(
          'https://api.0x.org/swap/v1/quote',
          {
            sellToken: usdcAddres,
            buyToken: uniswapAddress,
            sellAmount: '1',
          },
        ),
      });

      await currencyConvertor.deposit(
        usdcAddres,
        '1000',
        zeroExExchangeWrapper.address,
        '10000', // starkKey
        '100000', // positionId
        encode(zeroExTransaction.to, zeroExTransaction.data),
      );
    });
  });
});
