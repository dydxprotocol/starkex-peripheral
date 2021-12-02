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

// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { I_ExchangeProxy } from "../interfaces/I_ExchangeProxy.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "hardhat/console.sol";

/**
 * @title ZeroExUsdcExchangeProxy
 * @author dYdX
 *
 * @notice Contract for interacting with ZeroEx exchange.
 */
contract ZeroExUsdcExchangeProxy is I_ExchangeProxy {
    using SafeERC20 for IERC20;

    // ============ Structs ============

    struct ProxyExchangeData {
      IERC20 tokenFrom;
      address allowanceTarget;
      uint256 minUsdcAmount;
      address exchange;
      bytes exchangeData;
    }

    // ============ State Variables ============

    IERC20 immutable USDC_ADDRESS;

    // ============ Constructor ============

  constructor(
    IERC20 usdcAddress
  ) {
    USDC_ADDRESS = usdcAddress;
  }

  // ============ State-Changing Functions ============

  /**
    * @notice Make a call to an exchange via proxy.
    *
    * @param  proxyExchangeData  data to be used as parameters for the exchange call.
    */
    function proxyExchange(
      bytes calldata proxyExchangeData
    ) external
      override
      payable {
      (ProxyExchangeData memory proxyExchangeDataObject) = abi.decode(proxyExchangeData, (ProxyExchangeData));

      // Set allowance (if non-zero addresses provided)
      if (
        proxyExchangeDataObject.tokenFrom != IERC20(address(0)) &&
        proxyExchangeDataObject.allowanceTarget != address(0)
      ) {
        // safeApprove requires unsetting the allowance first.
        proxyExchangeDataObject.tokenFrom.safeApprove(proxyExchangeDataObject.allowanceTarget, 0);
        proxyExchangeDataObject.tokenFrom.safeApprove(proxyExchangeDataObject.allowanceTarget, type(uint256).max);
      }

      uint256 originalUsdcBalance = USDC_ADDRESS.balanceOf(address(this));

      (bool success, bytes memory returndata) = proxyExchangeDataObject.exchange.call{ value: msg.value }(
        proxyExchangeDataObject.exchangeData
      );
      require(success, string(returndata));

      // Verify minUsdcAmount
      uint256 usdcBalanceChange = USDC_ADDRESS.balanceOf(address(this)) - originalUsdcBalance;
      require(usdcBalanceChange >= proxyExchangeDataObject.minUsdcAmount, 'Received USDC is less than minUsdcAmount');

      // transfer all USDC balance back to msg.sender
      USDC_ADDRESS.safeTransfer(
        msg.sender,
        USDC_ADDRESS.balanceOf(address(this))
      );
    }
}