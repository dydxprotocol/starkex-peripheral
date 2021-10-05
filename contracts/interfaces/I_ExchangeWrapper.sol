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
pragma experimental ABIEncoderV2;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title I_ExchangeWrapper
 * @author dYdX
 *
 * Interface that Exchange Wrappers for Starkex-Peripheral must implement in order to trade ERC20 tokens
 * for USDC.
 */
interface I_ExchangeWrapper {

    // ============ Public Functions ============


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
        external
        returns (uint256);
}
