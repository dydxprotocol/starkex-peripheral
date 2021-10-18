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

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { I_StarkwareContract } from "../interfaces/I_StarkwareContracts.sol";

/**
 * @title CurrencyConvertor
 * @author dYdX
 *
 * @notice Contract for depositing to dYdX L2 in non-USDC tokens.
 */
contract CurrencyConvertor {
  using SafeERC20 for IERC20;

  // ============ State Variables ============

  I_StarkwareContract public immutable STARKWARE_CONTRACT;

  IERC20 immutable USDC_ADDRESS;

  uint256 immutable USDC_ASSET_TYPE;

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


  // ============ Events ============

  event LogConvertedDeposit(
    address indexed sender,
    address source,
    address tokenFrom,
    uint256 tokenFromAmount,
    uint256 tokenToAmount
  );

  // ============ State-Changing Functions ============

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
    * @notice Make a deposit to the Starkware Layer2 Solution, after converting funds to USDC.
    *  Funds will be withdrawn from the sender and deposited into the StarkWare Layer2 to the starkKey.
    * @dev Emits LogConvertedDeposit event.
    *
    * @param  tokenFrom          The token to convert from.
    * @param  tokenFromAmount    The amount of `tokenFrom` tokens to deposit.
    * @param  limitTokenToAmount The minimum tokenToAmount the user will accept in a swap.
    * @param  starkKey           The starkKey of the L2 account to deposit into.
    * @param  positionId         The positionId of the L2 account to deposit into.
    * @param  exchange           The exchange being used to swap the taker token for USDC.
    * @param  data               Trade parameters for the ExchangeWrapper.
    */
  function deposit(
    IERC20 tokenFrom,
    uint256 tokenFromAmount,
    uint256 limitTokenToAmount,
    uint256 starkKey,
    uint256 positionId,
    address exchange,
    bytes calldata data
  )
    external
    returns (uint256)
  {
    // Send fromToken to this contract.
    tokenFrom.safeTransferFrom(
      msg.sender,
      address(this),
      tokenFromAmount
    );

    uint256 originalUsdcBalance = USDC_ADDRESS.balanceOf(address(this));

    // Swap token
    (bool success, bytes memory returndata) = exchange.call(data);
    require(success, string(returndata));

    // transfer change in balance of USDC to msg.sender
    uint256 usdcBalanceChange = USDC_ADDRESS.balanceOf(address(this)) - originalUsdcBalance;

    require(usdcBalanceChange >= limitTokenToAmount, 'Would swap less than limin token to amount');

    // Deposit USDC to the L2.
    STARKWARE_CONTRACT.depositERC20(
      starkKey,
      USDC_ASSET_TYPE,
      positionId,
      usdcBalanceChange
    );


    // Log the result.
    emit LogConvertedDeposit(
      msg.sender,
      address(tokenFrom),
      tokenFromAmount,
      usdcBalanceChange
    );

    return usdcBalanceChange;
  }
}
