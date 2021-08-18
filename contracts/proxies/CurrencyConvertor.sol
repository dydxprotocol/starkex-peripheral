/*
    Copyright 2021 dYdX Trading Inc.
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

pragma solidity ^0.5.5;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { I_ExchangeWrapper } from "../external/I_ExchangeWrapper.sol";
import { I_StarkwareContract } from "../external/I_StarkwareContracts.sol";

contract CurrencyConvertor {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    IERC20 USDC_ADDRESS;

    uint256 USDC_ASSET_TYPE;

    I_StarkwareContract public immutable STARKWARE_CONTRACT;

    // ============ Constructor ============

    constructor(
        address starkwareContractAddress,
        IERC20 usdcAddress,
        uint256 usdcAssetType
    )
        public
    {
        STARKWARE_CONTRACT = I_StarkwareContract(starkwareContractAddress);
        USDC_ADDRESS = usdcAddress;
        USDC_ASSET_TYPE = usdcAssetType;
    }

  // ============ Events ============

      event LogConvertedDeposit(
        address indexed account,
        address source,
        address exchangeWrapper,
        address tokenFrom,
        uint256 tokenFromAmount,
        uint256 tokenToAmount
    );

  // ============ State-Changing Functions ============

  /**
    * @notice Make a deposit to the Starkware Layer2 Solution, after converting funds to USDC.
    *  Funds will be withdrawn from the sender and deposited into the StarkWare Layer2 to the starkKey.
    * @dev Emits LogConvertedDeposit event.
    *
    * @param  tokenFrom        The token to convert from.
    * @param  tokenFromAmount  The amount of `tokenFrom` tokens to deposit.
    * @param  exchangeWrapper  The ExchangeWrapper contract to trade with.
    * @param  starkKey         The starkKey of the L2 account to deposit into.
    * @param  positionId       The positionId of the L2 account to deposit into.
    * @param  data             Trade parameters for the ExchangeWrapper.
    */
  function deposit(
    IERC20 tokenFrom,
    uint256 tokenFromAmount,
    address exchangeWrapper,
    uint256 starkKey,
    uint256 positionId,
    bytes calldata data
  )
    external
    returns (uint256)
  {
    Send fromToken to the ExchangeWrapper.
    IERC20(tokenFrom).safeTransferFrom(
      msg.sender,
      exchangeWrapper,
      tokenFromAmount
    );

    address self = address(this);

    // Convert fromToken to toToken on the ExchangeWrapper.
    I_ExchangeWrapper exchangeWrapperContract = I_ExchangeWrapper(exchangeWrapper);

    uint256 tokenToAmount = exchangeWrapperContract.exchange(
        msg.sender,
        self,
        USDC_ADDRESS,
        tokenFrom,
        tokenFromAmount,
        data
    );

    Receive toToken from the ExchangeWrapper.
    IERC20(USDC_ADDRESS).safeTransferFrom(
        exchangeWrapper,
        self,
        tokenToAmount
    );


    // Deposit USDC to the L2.
    STARKWARE_CONTRACT.depositERC20(
        starkKey,
        USDC_ASSET_TYPE,
        positionId,
        tokenToAmount
    );

    // Log the result.
    emit LogConvertedDeposit(
        self,
        msg.sender,
        exchangeWrapper,
        tokenFrom,
        tokenFromAmount,
        tokenToAmount
    );

    return tokenToAmount;
  }
}
