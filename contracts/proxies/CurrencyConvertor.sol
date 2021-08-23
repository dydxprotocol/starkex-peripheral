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
import { I_ExchangeWrapper } from "../external/I_ExchangeWrapper.sol";
import { I_StarkwareContract } from "../external/I_StarkwareContracts.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";

contract CurrencyConvertor {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    ERC20 immutable USDC_ADDRESS;

    uint256 immutable USDC_ASSET_TYPE;

    I_StarkwareContract public immutable STARKWARE_CONTRACT;

    // ============ Constructor ============

    constructor(
        address starkwareContractAddress,
        ERC20 usdcAddress,
        uint256 usdcAssetType
    )
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
        ERC20 tokenFrom,
        uint256 tokenFromAmount,
        uint256 tokenToAmount
    );

  // ============ State-Changing Functions ============

      /**
     * @notice Sets the maximum allowance on the L2 contract. Must be called at least once
     *  before deposits can be made.
     * @dev Cannot be run in the constructor due to technical restrictions in Solidity.
     */
    function approveMaximumOnL2()
        external
    {
        IERC20 tokenContract = IERC20(USDC_ADDRESS);

        // safeApprove requires unsetting the allowance first.
        tokenContract.safeApprove(address(this), 0);

        // Set the allowance to the highest possible value.
        tokenContract.safeApprove(address(STARKWARE_CONTRACT), 1000000000);
    }

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
    ERC20 tokenFrom,
    uint256 tokenFromAmount,
    address exchangeWrapper,
    uint256 starkKey,
    uint256 positionId,
    bytes calldata data
  )
    external
    returns (uint256)
  {
    address self = address(this);

    // Send fromToken to the ExchangeWrapper.
    // IERC20(tokenFrom).safeTransferFrom(
    //   msg.sender,
    //   self,
    //   tokenFromAmount
    // );

   (bool success, bytes memory returndata) = address(exchangeWrapper).call(data);
    // require(success, string(returndata));

    // Receive toToken from the ExchangeWrapper.
    // IERC20(USDC_ADDRESS).safeTransferFrom(
    //     exchangeWrapper,
    //     self,
    //     tokenToAmount
    // );

    // Deposit USDC to the L2.
    STARKWARE_CONTRACT.depositERC20(
        starkKey,
        USDC_ASSET_TYPE,
        positionId,
        50
    );

    // Log the result.
    emit LogConvertedDeposit(
        self,
        msg.sender,
        exchangeWrapper,
        tokenFrom,
        tokenFromAmount,
        50
    );

    return 50;
  }
}
