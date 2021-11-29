pragma solidity ^0.8.4;
import "../Interfaces/IPoolInputConstraint.sol";

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

contract InitialInputConstraint is IPoolInputConstraint {
    function validateInput(
        uint256 period,
        uint256,
        uint256 strike,
        uint256 currentPrice,
        bool
    ) external pure override {
        if (currentPrice != strike) {
            require(period == 30 days, "Only 30 days expiry supported for non ATM options");
        }
    }
}