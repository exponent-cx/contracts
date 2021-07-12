// Copyright (C) 2021 Exponent

// This file is part of Exponent.
    
// Exponent is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Exponent is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Exponent.  If not, see <http://www.gnu.org/licenses/>.

pragma solidity ^0.8.0;
import "./interface/AggregatorV3Interface.sol";

library XPNUtils {
    int256 public constant ONE = 1e18;
    int256 public constant chainlinkONE = 1e8;

    function LatestPrice(AggregatorV3Interface priceFeed)
        public
        view
        returns (int256)
    {
        /*
            get lastast price of target price feed. note: chainlike default use 8 decimal.
            TODO: reformat to maybe use symbol (will come with new data structure)
        */
        // uint80 roundID, int price,  uint startedAt, uint timeStamp, uint80 answeredInRound
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return (price * ONE) / chainlinkONE;
    }

    function checkAndPadSymbol(
        string[] memory allSymbol,
        string[] memory symbol,
        int256[] memory weight
    ) public pure returns (int256[] memory cleanWeight) {
        cleanWeight = new int256[](allSymbol.length);

        if (allSymbol.length == symbol.length) {
            return weight;
        }
        require((symbol.length < allSymbol.length), "invalid signal");
        for (uint256 i = 0; i < symbol.length; i++) {
            require(
                keccak256(bytes(symbol[i])) == keccak256(bytes(allSymbol[i])),
                "invalid symbol sequence"
            );
            cleanWeight[i] = weight[i];
        }
        for (uint256 i = symbol.length; i < allSymbol.length; i++) {
            cleanWeight[i] = 0;
        }
    }

    function compareStrings(string memory first, string memory second)
        public
        pure
        returns (bool)
    {
        return (keccak256(abi.encodePacked((first))) ==
            keccak256(abi.encodePacked((second))));
    }
}
