pragma solidity ^0.8.4;

/**
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Hegic
 * Copyright (C) 2021 Hegic Protocol
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
// import "hardhat/console.sol";
import "../Interfaces/Interfaces.sol";
import "../Interfaces/IBlackScholesModel.sol";

/**
 * @author 0mllwntrmt3, appl
 * @title Catpull Price Calculator Contract
 * @notice The contract that calculates the options prices (the premiums)
 * that are adjusted through the `ImpliedVolRate` parameter.
 * Forked from the hegic price calculator
 **/

contract PriceCalculator is IPriceCalculator, Ownable {
    event RiskFreeRateChanged(int);
    event IVChanged(int);
    event SwingRateChanged(int);
    event DaoShareChanged(uint);

    int256 public riskFreeRate = 0; // 0%
    int256 public impliedVolRate = 900000000000000000; // 90%
    int256 public swingRate = -150000000000000000;  // -20%
    uint256 public daoshare = 10;
    AggregatorV3Interface public priceProvider;
    IHegicPool public pool;
    IBlackScholesModel public model;


    constructor(
        uint256 initialRate,
        AggregatorV3Interface _priceProvider,
        IHegicPool _pool,
        IBlackScholesModel _model
    ) {
        pool = _pool;
        priceProvider = _priceProvider;
        impliedVolRate = int(initialRate);
        model = _model;
    }


    /**
     * @notice Used to get current params used by the pricing module
     **/
    function params() external view returns (int, int, int, uint) {
        return (impliedVolRate, riskFreeRate, swingRate, daoshare);
    }

    /**
     * @notice Used for adjusting the options prices (the premiums)
     * while balancing the asset's implied volatility rate.
     * @param value New IVRate value
     **/
    function setImpliedVolRate(int256 value) external onlyOwner {
        require(value >= 0 && value <= 200000000000000000000, "OutOffBounds");
        impliedVolRate = value;
        emit IVChanged(value);
    }

    /**
     * @notice Used for adjusting the riskfree rate for the equation
     * @param value New risk free rate value
     **/
    function setRiskFreeRate(int256 value) external onlyOwner {
        require(value >= 0 && value <= 200000000000000000000, "OutOffBounds");
        riskFreeRate = value;
        emit RiskFreeRateChanged(value);
    }

    /**
     * @notice Used for adjusting the options prices (the premiums)
     * while balancing the asset's implied volatility rate.
     * @param value New IVRate value
     **/
    function setDaoShare(uint256 value) external onlyOwner {
        require(value < 10, "OutOffBounds");
        daoshare = value;
        emit DaoShareChanged(value);
    }

    /**
     * @notice Used for updating swingRate value
     * @param value New swingRate value
     **/
    function setSwingRate(int256 value) external onlyOwner {
        require(value >= -100000000000000000000 && value <= 100000000000000000000, "OutOffBounds");
        swingRate = value;
        emit SwingRateChanged(value);
    }

    /**
     * @notice Used for calculating the options prices
     * @param period The option period in seconds (1 days <= period <= 30 days)
     * @param amount The option size
     * @param strike The option strike
     * @return settlementFee The part of the premium that
     * is paid to the DAO
     * @return premium The part of the premium that
     * is distributed among the liquidity providers
     **/
    function calculateTotalPremium(
        uint256 period,
        uint256 amount,
        uint256 strike,
        bool isCall,
        uint outDecimals
    ) override public view returns (uint256 settlementFee, uint256 premium) {
        uint256 currentPrice = _currentPrice();
        if (strike == 0) {
            strike = currentPrice;
        }
        require(period >= 1 days && period <= 30 days, "InvalidPeriod");
        require(strike <= currentPrice + currentPrice / 5, "StrikeTooHigh");
        require(strike >= currentPrice - currentPrice / 5, "StrikeTooLow");

        
        (int callPrice, int putPrice) = _calculatePrice(
            currentPrice * 10**10,
            amount,
            period,
            strike * 10**10
        );
        uint total = (isCall ? uint(callPrice) : uint(putPrice));
        total = (total * 1e8) / currentPrice;

        if (outDecimals < 18) {
            total /= 10 ** (18 - outDecimals);
        } else if (outDecimals > 18) {
            total *= 10 ** (outDecimals - 18);
        }

        // Calculated in USD
        settlementFee = total / daoshare;
        premium = total - settlementFee;
    }

    function _calculatePrice(
        uint currentPrice,
        uint amount,
        uint period,
        uint strike
    ) public view returns (int256 callPrice, int putPrice) {
        // console.log("currentPrice", currentPrice);
        // console.log("amount", amount);
        // console.log("period", period);
        // console.log("strike", strike);
        // console.log("amount", amount);
        // console.log("SR,IV,RFR:");
        // console.logInt(swingRate);
        // console.logInt(impliedVolRate);
        // console.logInt(riskFreeRate);
        (callPrice, putPrice) = model.calculatePremiums(
            int(amount),
            int(currentPrice),
            int(strike),
            int(period),
            swingRate,
            impliedVolRate,
            riskFreeRate
        );
        // console.log("Result:");
        // console.logInt(callPrice);
        // console.logInt(putPrice);
    }

    /**
     * @notice Used for requesting the current price of the asset
     * using the ChainLink data feeds contracts.
     * See https://feeds.chain.link/
     * @return price Price
     **/
    function _currentPrice() internal view returns (uint256 price) {
        (, int256 latestPrice, , , ) = priceProvider.latestRoundData();
        price = uint(latestPrice);
    }
}
