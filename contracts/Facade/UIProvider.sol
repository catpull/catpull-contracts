pragma solidity ^0.8.4;
/**
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Copyright (C) 2021 CatPull
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 **/
import "../Interfaces/Interfaces.sol";
import "../Options/OptionsManager.sol";
import "../Pool/HegicPool.sol";

struct BuyViewData {
    uint currentPrice;
    uint availableBalance;
}

struct OptionViewData {
    bool isCall;
    IHegicPool.OptionState state;
    uint256 optionId;
    address asset; // Asset this option is based on ETC/BTC/AVAX
    uint256 strike; // Strike of asset 8 digit
    uint256 amount; // Amount in asset precision digit
    uint256 expiry;
    uint256 premium; // Premium paid for this option in stablecoin 18 digit
    uint256 value;
    uint256 tokens;
}


struct TrancheViewData {
    IHegicPool.TrancheState state;
    uint256 share;
    uint256 amount;
    uint256 creationTimestamp;
    uint256 trancheId;
    int pnl;
    address asset; // Asset this option is based on ETC/BTC/AVAX
}

struct OptionsHoldingsView {
    int totalPNL;
    OptionViewData[] optionPageEntries;
    uint totalEntries;
}

struct TranchesHoldingsView {
    int totalPNL;
    TrancheViewData[] tranchesPageEntries;
    uint totalEntries;
}

contract UIProvider {
    uint internal constant PAGE_SIZE = 5;
    OptionsManager internal optionsManager;
    ERC20 internal stableCoin;

    constructor(
        OptionsManager _optionsManager,
        ERC20 _stableCoin
    ) {
        stableCoin = _stableCoin;
        optionsManager = _optionsManager;
    }

    function buyViewData(
        HegicPool pool,
        address user
    ) external view returns (BuyViewData memory out) {
        (, int256 latestPrice, , , ) = pool.priceProvider().latestRoundData();
        out.currentPrice = uint(latestPrice);
        out.availableBalance = stableCoin.balanceOf(user);
    }

    function optionsViewData(
        address user,
        uint optionsPage
    ) external view returns (OptionsHoldingsView memory out) {
        OptionViewData[] memory optionsList = new OptionViewData[](5);
        out.totalEntries = optionsManager.balanceOf(user);
        for(uint i ; i < PAGE_SIZE; i++) {
            if (i + optionsPage >= out.totalEntries) {
                break;
            }
            uint optId = optionsManager.tokenOfOwnerByIndex(user, i + optionsPage);
            HegicPool pool = HegicPool(optionsManager.tokenPool(optId));
            {
                (
                    IHegicPool.OptionState state,
                    uint strike,
                    uint amount,
                    ,
                    uint expired,
                    uint premium,
                    uint profit
                ) = pool.options(optId);

                int pnl;
                
                uint256 excerciseAmount = pool.profitOf(optId);
                uint256 valueOfOption = pool.priceOf(excerciseAmount);
                if (state == IHegicPool.OptionState.Active) {
                    if (valueOfOption != 0) {
                        pnl = int(valueOfOption) - int(premium);
                    } else {
                        pnl = -int(premium);
                    }
                } else {
                    if (profit != 0) {
                        pnl = int(profit);
                    } else {
                        pnl = -int(premium);
                    }
                }
                out.totalPNL += pnl;


                optionsList[i] = OptionViewData(
                    pool.isCall(),
                    state,
                    optId,
                    address(pool.assetPriceToken()),
                    strike,
                    amount,
                    expired,
                    premium,
                    valueOfOption,
                    excerciseAmount
                );
            }
        }
        out.optionPageEntries = optionsList;
    }


    function tranchesViewData(
        address user,
        address pool,
        uint optionsPage
    ) external view returns (TranchesHoldingsView memory out) {
        HegicPool poolInst = HegicPool(pool);
        TrancheViewData[] memory tranchesList = new TrancheViewData[](5);
        out.totalEntries = poolInst.balanceOf(user);

        for(uint i ; i < PAGE_SIZE; i++) {
            if (i + optionsPage >= out.totalEntries) {
                break;
            }
            uint trancheId = poolInst.tokenOfOwnerByIndex(user, i);
            (
                IHegicPool.TrancheState state,
                uint256 share,
                uint256 amount,
                uint256 creationTimestamp
            ) = poolInst.tranches(trancheId);

            int withdrawable = int((share * poolInst.unhedgedBalance()) / poolInst.unhedgedShare());
            
            int pnl = withdrawable - int(amount);

            tranchesList[i] = TrancheViewData(
                state,
                share,
                amount,
                creationTimestamp,
                trancheId,
                pnl,
                address(poolInst.token())
            );
        }
        out.tranchesPageEntries = tranchesList;
    }
}