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


import { I_StarkwareContract } from "../external/I_StarkwareContracts.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";

contract MockStarkware is I_StarkwareContract {

    // ============ State Variables ============

    address immutable USDC_ADDRESS;

    // ============ Constructor ============

    constructor(
        address usdcAddress
    )
    {
        USDC_ADDRESS = usdcAddress;
    }

  // ============ State-Changing Functions ============

    function registerAndDepositERC20(
        address ethKey,
        uint256 starkKey,
        bytes memory signature,
        uint256 assetType,
        uint256 vaultId,
        uint256 quantizedAmount
    ) external override
    {
    }

    /**
    * @notice Make a deposit to the Starkware Layer2 Solution.
    *
    * @param  starkKey        The starkKey of the L2 account to deposit into.
    * @param  assetType       The assetType to deposit in.
    * @param  vaultId         The L2 id to deposit into
    * @param  quantizedAmount The quantized amount being deposited
    */
    function depositERC20(
        uint256 starkKey,
        uint256 assetType,
        uint256 vaultId,
        uint256 quantizedAmount
    ) external override
    {
        uint256 amount = quantizedAmount;

        address tokenAddress = extractContractAddress(assetType);
        IERC20 token = IERC20(tokenAddress);
        uint256 exchangeBalanceBefore = token.balanceOf(address(this));
        bytes memory callData = abi.encodeWithSelector(
            token.transferFrom.selector,
            msg.sender,
            address(this),
            amount
        );
        safeTokenContractCall(tokenAddress, callData);

        uint256 exchangeBalanceAfter = token.balanceOf(address(this));
        require(exchangeBalanceAfter >= exchangeBalanceBefore, "OVERFLOW");
        // NOLINTNEXTLINE(incorrect-equality): strict equality needed.
        require(
            exchangeBalanceAfter == exchangeBalanceBefore + amount,
            "INCORRECT_AMOUNT_TRANSFERRED"
        );
    }

    function extractContractAddress(
        uint256 assetType
    ) internal returns (address) {
        return USDC_ADDRESS;
    }

    /*
      Safe wrapper around ERC20/ERC721 calls.
      This is required because many deployed ERC20 contracts don't return a value.
      See https://github.com/ethereum/solidity/issues/4116.
    */
    function safeTokenContractCall(address tokenAddress, bytes memory callData) internal {
        require(isContract(tokenAddress), "BAD_TOKEN_ADDRESS");
        // NOLINTNEXTLINE: low-level-calls.

        (bool success, bytes memory returndata) = tokenAddress.call(callData);
        require(success, string(returndata));

        if (returndata.length > 0) {
            require(abi.decode(returndata, (bool)), "TOKEN_OPERATION_FAILED");
        }
    }

    function isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }
}
