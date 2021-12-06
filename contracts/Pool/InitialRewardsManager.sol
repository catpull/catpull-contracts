pragma solidity ^0.8.4;
import "@openzeppelin/contracts/access/Ownable.sol";
import "../Interfaces/IRewardsManager.sol";
import "../Token/GovernanceToken.sol";

/**
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Hegic
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

contract InitialRewardsManager is IRewardsManager, Ownable {
    GovernanceToken public rewardToken;
    mapping(address => bool) public pools;

    modifier onlyPool {
        require(pools[msg.sender], "Only pools can call this contract");
        _;
    }

    // Initial emission rate. 1/20 of notional size
    // So paying 1000 usd in premiums, or providing 1000 usd worth of
    // liquidty results in a 50 IGNI reward
    uint public emissionRate = 20;

    constructor(GovernanceToken token) {
        rewardToken = token;
    }

    function setEmissionRate(uint _newRate) external onlyOwner {
        emissionRate = _newRate;
    }

    function addPool(address pool) external onlyOwner {
        pools[pool] = true;
    }

    function sendRewardToUser(address buyer, uint usdTotal) internal {
        uint reward = usdTotal / emissionRate;
        if (rewardToken.balanceOf(address(this)) >= reward) {
            rewardToken.transfer(buyer, reward);
        }
    }

    function callBought(address buyer, uint usdTotal) external override onlyPool {
        sendRewardToUser(buyer, usdTotal);
    }
    function putBought(address buyer, uint usdTotal) external override onlyPool {
        sendRewardToUser(buyer, usdTotal);
    }
    function liquidityProvided(address provider, uint usdTotal) external override onlyPool {
        sendRewardToUser(provider, usdTotal);
    }
}