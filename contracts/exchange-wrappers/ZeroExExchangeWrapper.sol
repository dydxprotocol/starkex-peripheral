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

      uint256 originalTakerBalance = makerToken.balanceOf(self);

      // Send fromToken to this contract.
      IERC20(takerToken).safeTransferFrom(
        msg.sender,
        self,
        requestedFillAmount
      );

      // Swap token
      IERC20(takerToken).safeApprove(exchange, type(uint256).max);
      (bool success, bytes memory returndata) = exchange.call(orderData[32:]);
      require(success, string(returndata));

      // find change in balance of takerToken on this contract
      uint256 takerBalanceChange= IERC20(makerToken).balanceOf(self) - originalTakerBalance;

      // transfer change in balance of takerToken to msg.sender
      IERC20(makerToken).safeTransferFrom(
        self,
        msg.sender,
        takerBalanceChange
      );

      return takerBalanceChange;
    }

    /**
     * Get amount of takerToken required to buy a certain amount of makerToken for a given trade.
     * Should match the takerToken amount used in exchangeForAmount. If the order cannot provide
     * exactly desiredMakerToken, then it must return the price to buy the minimum amount greater
     * than desiredMakerToken
     *
     * @param  makerToken         Address of makerToken, the token to receive
     * @param  takerToken         Address of takerToken, the token to pay
     * @param  desiredMakerToken  Amount of makerToken requested
     * @param  orderData          Arbitrary bytes data for any information to pass to the exchange
     * @return                    Amount of takerToken the needed to complete the exchange
     */
    function getExchangeCost(
        IERC20 makerToken,
        IERC20 takerToken,
        uint256 desiredMakerToken,
        bytes calldata orderData
    )
        external override
        view
        returns (uint256) {
            return 0; // stubbed out for now and will potentially remove this method
        }

    /**
     * Convert bytes to an ethereum address

     * @param bys   Is total bytes array the address is prepended to
     * @return addr The ethereum address
     */
    function bytesToAddress(bytes memory bys) private pure returns (address addr) {
        assembly {
          addr := mload(add(bys,32))
        }
    }
}