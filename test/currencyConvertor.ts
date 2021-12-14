import { ethers, waffle } from 'hardhat'
import hre from 'hardhat';
import '@nomiclabs/hardhat-ethers';
import { keccak256 } from '@ethersproject/keccak256';
import chaiAsPromised from 'chai-as-promised';
import Web3 from 'web3';

import chai from "chai";
import { solidity } from "ethereum-waffle";
import CurrencyConvertorArtifact from '../artifacts/contracts/proxies/CurrencyConvertor.sol/CurrencyConvertor.json';
import ZeroExExchangeProxyArtifact from '../artifacts/contracts/proxies/ZeroExUsdcExchangeProxy.sol/ZeroExUsdcExchangeProxy.json';
import {
  axiosRequest,
  generateQueryPath,
  starkKeyToUint256,
} from './helpers';
import { erc20Abi } from './abi/erc20';

import { CurrencyConvertor, IERC20, ZeroExUsdcExchangeProxy } from '../src/types';
import _ from 'underscore';
import { at } from 'lodash';
import { BigNumber } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
  impersonatedAccount,
  starkwareContractAddress,
  usdcAddress,
  usdtTokenAddress,
  swapUrl,
  biconomyForwarder,
} from './constants';

const { deployContract } = waffle;
const { defaultAbiCoder } = ethers.utils;
const { expect } = chai;
chai.use(chaiAsPromised)

chai.use(solidity);

const web3 = new Web3();

const zeroAddress: string = '0x0000000000000000000000000000000000000000';
let currencyConvertor: CurrencyConvertor;

describe("CurrencyConvertor", () => {
  let zeroExExchangeProxy: ZeroExUsdcExchangeProxy;
  let usdcTokenContract: IERC20;
  let usdtTokenContract: IERC20;
  let signer: SignerWithAddress;

  before(async () => {
    // setup account
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [impersonatedAccount],
    });
    await hre.network.provider.request({
      method: "hardhat_setBalance",
      params: [
        impersonatedAccount,
        "0x10000000000000000000",
      ],
    });

    const usdtSlot: string = keccak256(
      defaultAbiCoder.encode(
        ['address', 'uint256'],
        [impersonatedAccount, '0x2'],
      ),
    );

    // set USDT balance
    await hre.network.provider.request({
      method: "hardhat_setStorageAt",
      params: [
        usdtTokenAddress,
        usdtSlot,
        "0x1000000000000000000000000000000000000000000000000000000000000000",
      ],
    });
    signer = await ethers.getSigner(impersonatedAccount);

    currencyConvertor = await deployContract(
      signer,
      CurrencyConvertorArtifact,
      [
        starkwareContractAddress,
        usdcAddress,
        '0x02893294412a4c8f915f75892b395ebbf6859ec246ec365c3b1f56f47c3a0a5d',
        biconomyForwarder,
      ],
    ) as CurrencyConvertor;

    zeroExExchangeProxy = await deployContract(
      signer,
      ZeroExExchangeProxyArtifact,
      [
        usdcAddress,
      ],
    ) as ZeroExUsdcExchangeProxy;

    // get ERC20 contracts
    usdtTokenContract = new ethers.Contract(
      usdtTokenAddress,
      erc20Abi,
      signer,
    ) as IERC20;
    usdcTokenContract = new ethers.Contract(
      usdcAddress,
      erc20Abi,
      signer,
    ) as IERC20;

    // approve ERC20 contracts
    await usdtTokenContract.approve(
      currencyConvertor.address,
      100000000000,
    );
    await usdcTokenContract.approve(
      currencyConvertor.address,
      100000000000,
    );
  });

  after(async () => {
    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: [impersonatedAccount],
    });
  });

  describe("auxiliary functions", async () => {
    it("verify signature collision is not occurring", () => {
      const erc20signatures: string[] = Object.keys(usdcTokenContract.functions).map((fn) => {
        return web3.eth.abi.encodeFunctionSignature(fn);
      });

      Object.keys(zeroExExchangeProxy.functions).map((fn) => {
        const signature = web3.eth.abi.encodeFunctionSignature(fn);
        expect(erc20signatures.includes(signature)).to.be.eq(false);
      });
    })

    it("versionRecipient", async () => {
      await currencyConvertor.versionRecipient();
    });

    it("directly deposit USDC", async () => {
      await currencyConvertor.deposit(
        '1',
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        Buffer.from('', 'utf8'),
      );
    });

    it("cannot directly deposit USDC while contract is paused", async () => {
      await currencyConvertor.pause();

      await expect(currencyConvertor.deposit(
        '1',
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        Buffer.from('', 'utf8'),
      )).to.be.revertedWith('Pausable: paused');

      await currencyConvertor.unpause();
    });

    it("register + directly deposit USDC", async () => {
      const zeroExTransaction = await zeroExRequestERC20('100', '1');

      await expect(currencyConvertor.deposit(
        '100000',
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        zeroExTransaction,
      )).to.be.revertedWith('STARK_KEY_UNAVAILABLE');
    });
  });

  describe("deposit ERC20", async () => {
    const minUsdcAmount: string = '1';
    const transferFromAmount: string = '100000';

    it("deposit USDT as USDC to Starkware", async () => {
      // get old balances
      const userUsdtBalance: BigNumber = await usdtTokenContract.balanceOf(signer.address);
      const starkwareUsdcBalance: BigNumber = await usdcTokenContract.balanceOf(
        starkwareContractAddress,
      )

      const exchangeProxyData: string = await zeroExRequestERC20('100', minUsdcAmount);
      const tx = await currencyConvertor.depositERC20(
        usdtTokenAddress,
        transferFromAmount,
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        zeroExExchangeProxy.address,
        exchangeProxyData,
        Buffer.from('', 'utf8'),
      );

      const blocks = await tx.wait();
      const events = _.chain(blocks.events!)
      .filter((e) => e.event === 'LogConvertedDeposit')
      .value();

      const event = events[0];
      expect(event.args?.tokenFromAmount.toString()).to.equal('100000');
      expect(event.args?.tokenFrom.toLowerCase()).to.equal(usdtTokenAddress);

      // get new balances
      const newUserUsdtBalance: BigNumber = await usdtTokenContract.balanceOf(signer.address);
      const newStarkwareUsdcBalance: BigNumber = await usdcTokenContract.balanceOf(
        starkwareContractAddress,
      );

      expect(newUserUsdtBalance.lt(userUsdtBalance)).to.be.true;
      expect(newStarkwareUsdcBalance.gt(starkwareUsdcBalance)).to.be.true;

      // deposit with approvals assumed
      const exchangeProxyData2: string = await zeroExRequestERC20(
        '100',
        minUsdcAmount,
        true,
      );

      await currencyConvertor.depositERC20(
        usdtTokenAddress,
        transferFromAmount,
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        zeroExExchangeProxy.address,
        exchangeProxyData2,
        Buffer.from('', 'utf8'),
      );
    });

    it("register + deposit USDT as USDC in one wrapped transaction", async () => {
      const exchangeProxyData: string = await zeroExRequestERC20('100', minUsdcAmount);

      await expect(currencyConvertor.depositERC20(
        usdtTokenAddress,
        transferFromAmount,
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        zeroExExchangeProxy.address,
        exchangeProxyData,
        exchangeProxyData,
      )).to.be.revertedWith('STARK_KEY_UNAVAILABLE');
    });

    it("cannot deposit USDT as USDC when contract is paused", async () => {
      const exchangeProxyData: string = await zeroExRequestERC20('100', minUsdcAmount);
      await currencyConvertor.pause();

      await expect(
        currencyConvertor.depositERC20(
          usdtTokenAddress,
          transferFromAmount,
          starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
          '22', // positionId
          zeroExExchangeProxy.address,
          exchangeProxyData,
          Buffer.from('', 'utf8'),
        ),
      ).to.be.revertedWith('Pausable: paused');

      await currencyConvertor.unpause();
    });

    it("cannot deposit USDT to USDC without enough funds", async () => {
      const exchangeProxyData: string = await zeroExRequestERC20('1000000', minUsdcAmount);

      await expect(currencyConvertor.depositERC20(
        usdtTokenAddress,
        '1',
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        zeroExExchangeProxy.address,
        exchangeProxyData,
        Buffer.from('', 'utf8'),
      )).to.be.revertedWith('');
    });

    it("cannot deposit USDT as USDC to Starkware when starkKey is invalid", async () => {
      const exchangeProxyData: string = await zeroExRequestERC20('100', minUsdcAmount);

      await expect(currencyConvertor.depositERC20(
        usdtTokenAddress,
        transferFromAmount,
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f90'),
        '22', // positionId
        zeroExExchangeProxy.address,
        exchangeProxyData,
        Buffer.from('', 'utf8'),
      )).to.be.revertedWith('INVALID_STARK_KEY');
    });

    it("cannot deposit USDT as USDC to Starkware when swap is less than limit amount", async () => {
      const exchangeProxyData: string = await zeroExRequestERC20('100', transferFromAmount);

      await expect(currencyConvertor.depositERC20(
        usdtTokenAddress,
        transferFromAmount,
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        zeroExExchangeProxy.address,
        exchangeProxyData,
        Buffer.from('', 'utf8'),
      )).to.be.revertedWith('Received USDC is less than minUsdcAmount');
    });
  });

  describe("deposit ETH", async () => {
    const minEthAmount: string = '10000000000000';

    it("deposit ETH as USDC to Starkware", async () => {
      const { exchangeProxyData, ethValue } = await zeroExRequestEth(minEthAmount, '1');

      // get old balances
      const userETHBalance: BigNumber = await signer.getBalance();
      const starkwareUsdcBalance: BigNumber = await usdcTokenContract.balanceOf(
        starkwareContractAddress,
      )

      const tx = await currencyConvertor.depositEth(
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        zeroExExchangeProxy.address,
        exchangeProxyData,
        Buffer.from('', 'utf8'),
        { value: ethValue },
      );

      const blocks = await tx.wait();
      const events = _.chain(blocks.events!)
      .filter((e) => e.event === 'LogConvertedDeposit')
      .value();

      const event = events[0];
      expect(event.args?.tokenFromAmount.toString()).to.equal(ethValue);
      expect(event.args?.tokenFrom).to.equal('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE');

      // get new balances
      const newUserETHBalance: BigNumber = await signer.getBalance();
      const newStarkwareUsdcBalance: BigNumber = await usdcTokenContract.balanceOf(
        starkwareContractAddress,
      );

      expect(newUserETHBalance.lt(userETHBalance)).to.be.true;
      expect((newStarkwareUsdcBalance.sub(1000)).gt(starkwareUsdcBalance)).to.be.true;
    });

    it("register + deposit ETH as USDC in one wrapped transaction", async () => {
      const { exchangeProxyData, ethValue } = await zeroExRequestEth(minEthAmount, '1');

      await expect(currencyConvertor.depositEth(
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        zeroExExchangeProxy.address,
        exchangeProxyData,
        exchangeProxyData,
        { value: ethValue },
      )).to.be.revertedWith('STARK_KEY_UNAVAILABLE');
    });


    it("cannot deposit ETH as USDC when contract is paused", async () => {
      const { exchangeProxyData, ethValue } = await zeroExRequestEth(minEthAmount, '1');
      await currencyConvertor.pause();

      await expect(currencyConvertor.depositEth(
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        zeroExExchangeProxy.address,
        exchangeProxyData,
        exchangeProxyData,
        { value: ethValue },
      )).to.be.revertedWith('Pausable: paused');

      await currencyConvertor.unpause();
    });

    it("cannot deposit ETH to USDC without enough funds", async () => {
      const { exchangeProxyData } = await zeroExRequestEth(minEthAmount, '1');

      await expect(currencyConvertor.depositEth(
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        zeroExExchangeProxy.address,
        exchangeProxyData,
        Buffer.from('', 'utf8'),
        { value: '1' },
      )).to.be.revertedWith('');
    });

    it("cannot deposit ETH as USDC to Starkware when swap is less than limit amount", async () => {
      const { exchangeProxyData, ethValue } = await zeroExRequestEth(minEthAmount, '10000000000000000000');

      await expect(currencyConvertor.depositEth(
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        zeroExExchangeProxy.address,
        exchangeProxyData,
        Buffer.from('', 'utf8'),
        { value: ethValue },
      )).to.be.revertedWith('Received USDC is less than minUsdcAmount');
    });
  });
});

// ============ Helper Functions ============

async function zeroExRequestERC20(
  sellAmount: string,
  minUsdcAmount: string,
  skipApproval: boolean = false,
): Promise<string> {
  const zeroExResponse = await axiosRequest({
    method: 'GET',
    url: generateQueryPath(
      swapUrl,
      {
        sellAmount,
        sellToken: usdtTokenAddress,
        buyToken: usdcAddress,
        slippagePercentage: 1.0,
      },
    ),
  }) as { to: string, data: string, allowanceTarget: string };

  return encodeZeroExExchangeData({
    tokenFrom: usdtTokenAddress,
    allowanceTarget: skipApproval ? zeroAddress : zeroExResponse.allowanceTarget,
    minUsdcAmount,
    exchange: zeroExResponse.to,
    exchangeData: zeroExResponse.data,
  });
}

async function zeroExRequestEth(
  sellAmount: string,
  minUsdcAmount: string,
  skipApproval: boolean = false,
): Promise<{
  exchangeProxyData: string,
  ethValue: number,
}> {
  const zeroExResponse = await axiosRequest({
    method: 'GET',
    url: generateQueryPath(
      swapUrl,
      {
        sellAmount,
        sellToken: 'ETH',
        buyToken: usdcAddress,
      },
    ),
  }) as { to: string, data: string, value: number, allowanceTarget: string };

  const exchangeProxyData = encodeZeroExExchangeData({
    tokenFrom: zeroAddress,
    allowanceTarget: skipApproval ? zeroAddress : zeroExResponse.allowanceTarget,
    minUsdcAmount,
    exchange: zeroExResponse.to,
    exchangeData: zeroExResponse.data,
  });

  return {
    exchangeProxyData,
    ethValue: zeroExResponse.value,
  }
}

function encodeZeroExExchangeData(
  proxyExchangeData: {
    tokenFrom: string,
    allowanceTarget: string,
    minUsdcAmount: string,
    exchange: string,
    exchangeData: string,
  }
): string {
  return defaultAbiCoder.encode(
    [
      'address',
      'address',
      'uint256',
      'address',
      'bytes',
    ],
    at(
      proxyExchangeData,
      [
        'tokenFrom',
        'allowanceTarget',
        'minUsdcAmount',
        'exchange',
        'exchangeData',
      ],
    ),
  );
}
