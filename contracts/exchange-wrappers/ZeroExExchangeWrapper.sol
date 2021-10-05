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

pragma solidity ^0.8.0;

import { I_ExchangeWrapper } from "../interfaces/I_ExchangeWrapper.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { I_StarkwareContract } from "../interfaces/I_StarkwareContracts.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ZeroExExchangeWrapper
 * @author dYdX
 *
 * Wrapper around 0x API ERC20 token swap.
 */
contract ZeroExExchangeWrapper is I_ExchangeWrapper {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    IERC20 immutable USDC_ADDRESS;

    uint256 immutable USDC_ASSET_TYPE;

    I_StarkwareContract public immutable STARKWARE_CONTRACT;

    // ============ Constructor ============

    constructor(
        I_StarkwareContract starkwareContractAddress,
        IERC20 usdcAddress,
        uint256 usdcAssetType
    )
    {
        STARKWARE_CONTRACT = starkwareContractAddress;
        USDC_ADDRESS = usdcAddress;
        USDC_ASSET_TYPE = usdcAssetType;

        // Set the allowance to the highest possible value.
        usdcAddress.safeApprove(address(starkwareContractAddress), type(uint256).max);
    }


    // ============ Public Functions ============

    /**
    * Approve an exchange to swap an asset
    *
    * @param exchange Address of exchange that will be swapping a token
    * @param token    Address of token that will be swapped by the exchange
    */
    function approveSwap(
      address exchange,
      IERC20 token
    )
      external
    {
      // safeApprove requires unsetting the allowance first.
      token.safeApprove(exchange, 0);
      token.safeApprove(exchange, type(uint256).max);
    }

    /**
     * Exchange some amount of takerToken for USDC.
     *

     * @param  takerToken           Address of takerToken, the token to pay.
     * @param  requestedFillAmount  Amount of takerToken being paid.
     * @param  starkKey             The starkKey of the L2 account to deposit into.
     * @param  positionId           The positionId of the L2 account to deposit into.
     * @param  exchange             The exchange being used to swap the taker token for USDC.
     * @param  orderData            Arbitrary bytes data for any information to pass to the exchange.
     * @return                      The amount of USDC deposited to the StarkEx Deposit Contract.
     */
    function exchange(
        IERC20 takerToken,
        uint256 starkKey,
        uint256 positionId,
        uint256 requestedFillAmount,
        address exchange,
        bytes calldata orderData
    )
        external override
        returns (uint256)
    {
      uint256 originalUsdcBalance = USDC_ADDRESS.balanceOf(address(this));

      // Swap token
      (bool success, bytes memory returndata) = exchange.call(orderData);
      require(success, string(returndata));

      // transfer change in balance of USDC to msg.sender
      uint256 usdcBalanceChange = USDC_ADDRESS.balanceOf(address(this)) - originalUsdcBalance;

      // Deposit USDC to the L2.
      STARKWARE_CONTRACT.depositERC20(
          starkKey,
          USDC_ASSET_TYPE,
          positionId,
          usdcBalanceChange
      );

      return usdcBalanceChange;
    }
}
