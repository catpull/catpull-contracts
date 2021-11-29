// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "prb-math/contracts/PRBMathSD59x18.sol";
import "../Interfaces/IBlackScholesModel.sol";

contract BlackScholesModel is IBlackScholesModel {
    using PRBMathSD59x18 for int;

    /// @dev One year in FP 59x18
    int internal constant ONE_YEAR = 31536000000000000000000000;

    /// @dev 0.5 in FP 59x18
    int internal constant HALF = 500000000000000000;

    /// @dev 1 in FP 59x18
    int internal constant ONE = 1000000000000000000;


    /// @notice Modified Black scholes model to calculate options price.
    ///
    /// @dev Requirements:
    /// - amount, currentPrice, strike, period, and implied volatility  must be greater than 0
    ///
    /// @param amount The size of the contract
    /// @param currentPrice The current price of the asset
    /// @param strike The strike price of the contract
    /// @param period The expiry of the contract denoted in seconds
    /// @param swingRate The swingrate of the asset
    /// @param impliedVolatility The IV of the asset
    /// @param riskFreeRate The current risk free rate of the settlement asset
    /// @param callPremium The price of the call option in FP 59x18
    /// @param putPremium The price of the put option in FP 59x18
    function calculatePremiums(
        int amount,
        int currentPrice,
        int strike,
        int period,
        int swingRate,
        int impliedVolatility,
        int riskFreeRate
    ) external pure override returns (int callPremium, int putPremium) {
        period = period.fromInt().div(ONE_YEAR);
        int riskFreeFactorStrike = PRBMathSD59x18.exp(-riskFreeRate.mul(period)).mul(strike);
        int swingRateFactorPrice = PRBMathSD59x18.exp(-swingRate.mul(period)).mul(currentPrice);
        int periodFactor = PRBMathSD59x18.sqrt(period).mul(impliedVolatility);
        int d1 = (swingRateFactorPrice.div(strike).ln() + (riskFreeRate + impliedVolatility.mul(impliedVolatility).mul(HALF)).mul(period)).div(periodFactor);
        callPremium = swingRateFactorPrice.mul(cumulativeStdNormApprox_(d1)) - riskFreeFactorStrike.mul(cumulativeStdNormApprox_(d1 - periodFactor));
        putPremium = callPremium - swingRateFactorPrice + riskFreeFactorStrike;
        callPremium = amount.mul(callPremium);
        putPremium = amount.mul(putPremium);
    }


    /// INTERNAL FUNCTIONS ///
    /// @notice Approcimates the commulative standard normal function.
    /// 
    /// https://stackoverflow.com/a/59217784
    /// @param x The value to find of the cummulative standard normal
    /// @return returns the cummulative standard normal distribution
    function cumulativeStdNormApprox_(int x) internal pure returns (int) {
        int t = (ONE + int(231541900000000000).mul(x.abs())).inv();
        int d = int(398942300000000000).mul(PRBMathSD59x18.exp(-x.mul(x).mul(HALF)));
        int prob = d.mul(t).mul(319381500000000000 + t.mul(-356563800000000000 + t.mul(1781478000000000000 + t.mul(-1821256000000000000 + t.mul(1330274000000000000)))));
        if(x>0) {
            return ONE - prob;
        }
        return prob;
    }
    
}