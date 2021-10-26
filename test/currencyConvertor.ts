import { ethers, waffle } from 'hardhat'
import hre from 'hardhat';
import '@nomiclabs/hardhat-ethers';
import { keccak256 } from '@ethersproject/keccak256';
import chaiAsPromised from 'chai-as-promised';


import chai from "chai";
import { solidity } from "ethereum-waffle";
import CurrencyConvertorArtifact from '../artifacts/contracts/proxies/CurrencyConvertor.sol/CurrencyConvertor.json';
import {
  axiosRequest,
  generateQueryPath,
  starkKeyToUint256,
} from './helpers';
import { erc20Abi } from './erc20';

import { CurrencyConvertor, IERC20 } from '../src/types';
import _ from 'underscore';
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

describe("CurrencyConvertor", () => {
  let currencyConvertor: CurrencyConvertor;
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

    const usdtSlot = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [impersonatedAccount, '0x2']))

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
  })

  describe("auxiliary functions", async () => {
    it("versionRecipient", async () => {
      await currencyConvertor.versionRecipient();
    });

    it("trustedForwarder", async () => {
      await currencyConvertor.trustedForwarder();
    });

    it("directly deposit USDC", async () => {
      await currencyConvertor.deposit(
        '1',
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
      );
    });
  });

  describe("deposit ERC20", async () => {
    it("deposit USDT as USDC to Starkware", async () => {
      const zeroExTransaction = await zeroExRequestERC20('100');

      // get old balances
      const userUsdtBalance: BigNumber = await usdtTokenContract.balanceOf(signer.address);
      const starkwareUsdcBalance: BigNumber = await usdcTokenContract.balanceOf(
        starkwareContractAddress,
      )

      await currencyConvertor.approveSwap(zeroExTransaction.to, usdtTokenAddress);
      const tx = await currencyConvertor.depositERC20(
        usdtTokenAddress,
        '100000',
        '1',
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        zeroExTransaction.to,
        zeroExTransaction.data,
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

      // deposit with approvals
      const zeroExTransaction2 = await zeroExRequestERC20('100');
      await currencyConvertor.depositERC20(
        usdtTokenAddress,
        '100000',
        '1',
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        zeroExTransaction.to,
        zeroExTransaction2.data,
      );
    });

    it("deposit USDT as USDC in one wrapped transaction", async () => {
      const zeroExTransaction = await zeroExRequestERC20('100');

      // get old balances
      const userUsdtBalance: BigNumber = await usdtTokenContract.balanceOf(signer.address);
      const starkwareUsdcBalance: BigNumber = await usdcTokenContract.balanceOf(
        starkwareContractAddress,
      )

      const tx = await currencyConvertor.approveSwapAndDepositERC20(
        usdtTokenAddress,
        '100000',
        '1',
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        zeroExTransaction.to,
        zeroExTransaction.allowanceTarget,
        zeroExTransaction.data,
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
    });

    it("deposit USDT to USDC without enough funds", async () => {
      const zeroExTransaction = await zeroExRequestERC20('1000000');

      await currencyConvertor.approveSwap(zeroExTransaction.to, usdtTokenAddress);
      await expect(currencyConvertor.depositERC20(
        usdtTokenAddress,
        '1',
        '1',
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        zeroExTransaction.to,
        zeroExTransaction.data,
      )).to.be.revertedWith('');
    });

    it("deposit USDT to USDC with too small of swap", async () => {
      const zeroExTransaction = await zeroExRequestERC20('1000000');

      await currencyConvertor.approveSwap(zeroExTransaction.to, usdtTokenAddress);
      await expect(currencyConvertor.depositERC20(
        usdtTokenAddress,
        '100000',
        '1',
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        zeroExTransaction.to,
        zeroExTransaction.data,
      )).to.be.revertedWith('');
    });

    it("deposit USDT as USDC to Starkware but starkKey is invalid", async () => {
      const zeroExTransaction = await zeroExRequestERC20('100');

      await currencyConvertor.approveSwap(zeroExTransaction.to, usdtTokenAddress);
      await expect(currencyConvertor.depositERC20(
        usdtTokenAddress,
        '100000',
        '1',
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f90'),
        '22', // positionId
        zeroExTransaction.to,
        zeroExTransaction.data,
      )).to.be.revertedWith('INVALID_STARK_KEY');
    });

    it("deposit USDT as USDC to Starkware but swap is less than limit amount", async () => {
      const zeroExTransaction = await zeroExRequestERC20('100');

      await currencyConvertor.approveSwap(zeroExTransaction.to, usdtTokenAddress);
      await expect(currencyConvertor.depositERC20(
        usdtTokenAddress,
        '100000',
        '100000',
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        zeroExTransaction.to,
        zeroExTransaction.data,
      )).to.be.revertedWith('Received USDC is less than minUsdcAmount');
    });
  });

  describe("deposit ETH", async () => {
    const minUsdcAmount: string = '1000';

    it("deposit ETH as USDC to Starkware", async () => {
      const zeroExTransaction = await zeroExRequestEth(minUsdcAmount);

      // get old balances
      const userETHBalance: BigNumber = await signer.getBalance();
      const starkwareUsdcBalance: BigNumber = await usdcTokenContract.balanceOf(
        starkwareContractAddress,
      )

      const tx = await currencyConvertor.depositEth(
        minUsdcAmount,
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        zeroExTransaction.to,
        zeroExTransaction.data,
        { value: zeroExTransaction.value },
      );

      const blocks = await tx.wait();
      const events = _.chain(blocks.events!)
      .filter((e) => e.event === 'LogConvertedDeposit')
      .value();

      const event = events[0];
      expect(event.args?.tokenFromAmount.toString()).to.equal(zeroExTransaction.value);
      expect(event.args?.tokenFrom).to.equal('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE');

      // get new balances
      const newUserETHBalance: BigNumber = await signer.getBalance();
      const newStarkwareUsdcBalance: BigNumber = await usdcTokenContract.balanceOf(
        starkwareContractAddress,
      );

      expect(newUserETHBalance.lt(userETHBalance)).to.be.true;
      expect((newStarkwareUsdcBalance.sub(1000)).gt(starkwareUsdcBalance)).to.be.true;
    });

    it("deposit ETH to USDC without enough funds", async () => {
      const zeroExTransaction = await zeroExRequestEth(minUsdcAmount);

      await expect(currencyConvertor.depositEth(
        '1',
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        zeroExTransaction.to,
        zeroExTransaction.data,
        { value: '1' },
      )).to.be.revertedWith('');
    });

    it("deposit ETH as USDC to Starkware but swap is less than limit amount", async () => {
      const zeroExTransaction = await zeroExRequestEth(minUsdcAmount);

      await expect(currencyConvertor.depositEth(
        '10000000000000000000',
        starkKeyToUint256('050e0343dc2c0c00aa13f584a31db64524e98b7ff11cd2e07c2f074440821f99'),
        '22', // positionId
        zeroExTransaction.to,
        zeroExTransaction.data,
        { value: zeroExTransaction.value },
      )).to.be.revertedWith('Received USDC is less than minUsdcAmount');
    });
  });
});

async function zeroExRequestERC20(
  sellAmount: string,
): Promise<{ to: string, data: string, allowanceTarget: string }> {
  return axiosRequest({
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
  }) as Promise<{ to: string, data: string, allowanceTarget: string }>;
}

async function zeroExRequestEth(buyAmount: string): Promise<{ to: string, data: string, value: number }> {
  return axiosRequest({
    method: 'GET',
    url: generateQueryPath(
      swapUrl,
      {
        buyAmount,
        sellToken: 'ETH',
        buyToken: usdcAddress,
      },
    ),
  }) as Promise<{ to: string, data: string, value: number }>;
}
