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
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

/**
 * @title ZeroExExchangeWrapper
 * @author dYdX
 *
 * Wrapper around 0x API ERC20 token swap.
 */
contract ZeroExExchangeWrapper is I_ExchangeWrapper {
    using SafeERC20 for IERC20;


    // ============ Public Functions ============

    /**
     * Exchange some amount of takerToken for makerToken.
     *
     * @param  tradeOriginator      Address of the initiator of the trade (however, this value
     *                              cannot always be trusted as it is set at the discretion of the
     *                              msg.sender)
     * @param  receiver             Address to set allowance on once the trade has completed
     * @param  makerToken           Address of makerToken, the token to receive
     * @param  takerToken           Address of takerToken, the token to pay
     * @param  requestedFillAmount  Amount of takerToken being paid
     * @param  orderData            Arbitrary bytes data for any information to pass to the exchange
     * @return                      The amount of makerToken received
     */
    function exchange(
        address tradeOriginator,
        address receiver,
        IERC20 makerToken,
        IERC20 takerToken,
        uint256 requestedFillAmount,
        bytes calldata orderData
    )
        external override
        returns (uint256)
    {
      address self = address(this);
      address exchange = bytesToAddress(orderData);

      uint256 originalMakerBalance = makerToken.balanceOf(self);

      // safe approve token if allowance is too low
      if (takerToken.allowance(self, exchange) < requestedFillAmount) {
        takerToken.safeApprove(exchange, type(uint256).max);
      }

      // Swap token
      (bool success, bytes memory returndata) = exchange.call(orderData[32:]);
      require(success, string(returndata));

      // safe approve token if allowance is too low
      if (makerToken.allowance(self, self) < requestedFillAmount) {
        makerToken.safeApprove(self, type(uint256).max);
      }

      // transfer change in balance of makerToken to msg.sender
      makerToken.safeTransferFrom(
        self,
        msg.sender,
        makerToken.balanceOf(self) - originalMakerBalance
      );

      return makerToken.balanceOf(self) - originalMakerBalance;
    }

    /**
     * Convert first 32 bytes of bys to an ethereum address

     * @param  bys  Is total bytes array the address is prepended to
     * @return addr The ethereum address
     */
    function bytesToAddress(bytes memory bys) private pure returns (address addr) {
        assembly {
          addr := mload(add(bys,32))
        }
    }
}
