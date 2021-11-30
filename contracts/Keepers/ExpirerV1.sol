pragma solidity ^0.8.4;

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

import "../Options/OptionsManager.sol";
import "../Pool/HegicPool.sol";

contract ExpirerV1 {
    uint public constant PAGE_SIZE = 50;
    OptionsManager private immutable optionsManager;

    constructor(OptionsManager manager) {
        optionsManager = manager;
    }

    function run(uint256[] calldata options) external {
        for (uint i ; i < options.length ; i ++) {
            uint optionId = options[i];
            IHegicPool pool = IHegicPool(optionsManager.tokenPool(optionId));
            (IHegicPool.OptionState state, , , , uint256 expired, ,) = pool.options(optionId);
            if (expired < block.timestamp && state == IHegicPool.OptionState.Active) {
                try pool.unlock(optionId) { } catch (bytes memory) { }
            }
        }
    }
    
    function numberOfPages() external view returns (uint) {
        uint totalOptions = optionsManager.nextTokenId();
        if (totalOptions == 0) {
            return 0;
        }
        return 1 + totalOptions / PAGE_SIZE;
    }

    function search(uint page) external view returns (uint[25] memory out, uint len) {
        uint totalOptions = optionsManager.nextTokenId();

        for (uint i = page * PAGE_SIZE; i < (page + 1) * PAGE_SIZE ; i ++) {
            if (i >= totalOptions) {
                break;
            }
            IHegicPool pool = IHegicPool(optionsManager.tokenPool(i));
            (IHegicPool.OptionState state, , , , uint256 expired, ,) = pool.options(i);
            if (expired < block.timestamp && state == IHegicPool.OptionState.Active) {
                out[len] = i;
                len += 1;
            }
        }
    }

    // const pages = (await exerciserV1.numberOfPages()).toNumber()
    // const options: BigNumber[] = []
    // for (let page = 0; page < pages ; page ++) {
    //     const {len, out} = await exerciserV1.search(page);
    //     options.push(...out.slice(0, len.toNumber()))
    // }
    // await(await exerciserV1.run(options)).wait(1)
}
