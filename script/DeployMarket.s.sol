// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/Market.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MarketScript is Script {
    Market public market;
    IERC20 public usdcToken;

    function setUp() public {
        // Load USDC token address from environment variable
        address usdcTokenAddress = vm.envAddress("USDC_TOKEN_ADDRESS"); // Set the USDC token address in the .env file
        usdcToken = IERC20(usdcTokenAddress);
    }

    function run() external returns (Market) {
        // Load private key from environment variable
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Start broadcasting with the deployer's private key
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the Market contract
        market = new Market(address(usdcToken));

        vm.stopBroadcast();
        return market;
    }
}
