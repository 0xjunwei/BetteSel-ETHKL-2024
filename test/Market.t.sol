// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/Market.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MarketTest is Test {
    Market public market;
    IERC20 public usdcToken;
    address public admin;
    address public user1;
    address public user2;
    address public user3;

    function setUp() public {
        admin = address(this);
        user1 = address(0x123);
        user2 = address(0x456);
        user3 = address(0x789);

        // You can either use a mock USDC token or deploy a new ERC20 contract in a real test network
        usdcToken = IERC20(vm.envAddress("USDC_TOKEN_ADDRESS")); // Replace with real USDC or mock token

        // Deploy the Market contract
        market = new Market(address(usdcToken));

        // Admin adds authorized users
        market.addAuthorizedUser(user1, "User1PublicKey");
        market.addAuthorizedUser(user2, "User2PublicKey");
    }

    // Test adding a new listing
    function testAddListing() public {
        vm.prank(user1); // Act as user1
        market.addListing(1000 * 10 ** 6, "ipfs://example_link");

        // Access the listing directly and compare the fields
        (
            uint256 itemId,
            address seller,
            uint256 price,
            string memory ipfsLink,
            uint8 listingStatus,
            address buyer,
            uint256 blockTimestampForDispute
        ) = market.listings(0); // Access listing 0

        // Assertions to ensure the listing was created correctly
        assertEq(itemId, 0); // Check if the itemId is correct
        assertEq(seller, user1); // Check if the seller is correct
        assertEq(price, 1000 * 10 ** 6); // Check if the price is correct
        assertEq(listingStatus, 0); // Check if the listing status is unsold
        assertEq(bytes(ipfsLink).length, bytes("ipfs://example_link").length); // Check if the IPFS link is correct
    }

    // Test placing a bid on the listing

    // Test cancelling a bid

    // Test raising a dispute
}
