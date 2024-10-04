// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

// Inherit foundry scripts to help deploy
import {Script} from "forge-std/Script.sol";
import {MintableERC} from "../src/ERC20USDC.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract USDC is Script {
    function run() external returns (MintableERC) {
        // From forge-std library
        vm.startBroadcast();
        // Any txn we wanna send, we put in between the start and stop broadcast
        // To deploy
        MintableERC usdc = new MintableERC();

        //When done broadcasting
        vm.stopBroadcast();
        return usdc;
    }
}
