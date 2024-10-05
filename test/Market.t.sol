// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/Market.sol";
import "../src/ERC20USDC.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MarketTest is Test {
    Market public market;
    MintableERC public usdcToken;
    address public admin;
    address public user1;
    address public user2;
    address public user3;

    function setUp() public {
        admin = address(this);
        user1 = address(0x123);
        user2 = address(0x456);
        user3 = address(0x789);

        // Deploy the mock USDC token
        usdcToken = new MintableERC();

        // Deploy the Market contract
        market = new Market(address(usdcToken));
    }

    // Test adding a new listing
    function testAddListing() public {
        vm.prank(user1); // Act as user1
        market.addListing(100 * 10 ** 6, "Item 1", "ipfs://example_link");

        // Access the listing directly and compare the fields
        (
            uint256 itemId,
            string memory itemTitle,
            address seller,
            uint256 price,
            string memory ipfsLink,
            uint8 listingStatus,
            address buyer,
            string memory encryptedBuyerAddress,
            uint256 blockTimestampForDispute
        ) = market.listings(0); // Access listing 0

        // Assertions to ensure the listing was created correctly
        assertEq(itemId, 0); // Check if the itemId is correct
        assertEq(seller, user1); // Check if the seller is correct
        assertEq(price, 100 * 10 ** 6); // Check if the price is correct
        assertEq(listingStatus, 0); // Check if the listing status is unsold
        assertEq(bytes(ipfsLink).length, bytes("ipfs://example_link").length); // Check if the IPFS link is correct
    }

    // Test placing a bid on the listing
    function testAddBid() public {
        // User1 creates a listing
        vm.prank(user1);
        market.addListing(100 * 10 ** 6, "Item 1", "ipfs://example_link");

        // User2 approves the Market contract to spend their USDC
        vm.prank(user2);
        usdcToken.mint(user2, 100000 * 10 ** 6); // Mint 100000 USDC to user2
        vm.prank(user2);
        usdcToken.approve(address(market), 100 * 10 ** 6);
        vm.prank(user2);
        market.bidForListing(0, 100 * 10 ** 6, "Test address");

        // Access the listing directly and compare the fields
        (
            uint256 itemId,
            string memory itemTitle,
            address seller,
            uint256 price,
            string memory ipfsLink,
            uint8 listingStatus,
            address buyer,
            string memory encryptedBuyerAddress,
            uint256 blockTimestampForDispute
        ) = market.listings(0); // Access listing 0

        // should instant sell as price matches
        assertEq(listingStatus, 1);
        // Buyer should be user2
        assertEq(buyer, user2);
    }

    // Test under bidding
    // Test placing a bid on the listing
    function testUnderBid() public {
        // User1 creates a listing
        vm.prank(user1);
        market.addListing(10000 * 10 ** 6, "Item 1", "ipfs://example_link");

        // User2 approves the Market contract to spend their USDC
        vm.prank(user2);
        usdcToken.mint(user2, 100000 * 10 ** 6); // Mint 100000 USDC to user2
        vm.prank(user2);
        usdcToken.approve(address(market), 100 * 10 ** 6);
        vm.prank(user2);
        market.bidForListing(0, 100 * 10 ** 6, "Test address");

        // Access the listing directly and compare the fields
        (
            uint256 itemId,
            string memory itemTitle,
            address seller,
            uint256 price,
            string memory ipfsLink,
            uint8 listingStatus,
            address buyer,
            string memory encryptedBuyerAddress,
            uint256 blockTimestampForDispute
        ) = market.listings(0); // Access listing 0

        // should instant sell as price matches
        assertEq(listingStatus, 0);
        // Buyer should be address(0) still
        assertEq(buyer, address(0));
    }

    // Test release payment from seller after bid accepted
    function testReleasePayment() public {
        // User1 creates a listing
        vm.prank(user1);
        market.addListing(100 * 10 ** 6, "Item 1", "ipfs://example_link");

        // User2 approves the Market contract to spend their USDC
        vm.prank(user2);
        usdcToken.mint(user2, 100000 * 10 ** 6); // Mint 100000 USDC to user2
        vm.prank(user2);
        usdcToken.approve(address(market), 100 * 10 ** 6);
        vm.prank(user2);
        market.bidForListing(0, 100 * 10 ** 6, "Test address");

        vm.prank(user2);
        market.releasePaymentToSeller(0);
        // Calculate the expected fee (2% of 100 USDC = 2 USDC)
        uint256 expectedFee = (100 * 10 ** 6 * 200) / 10000; // 2% fee

        // Validate totalFees after releasing payment
        uint256 totalFeesAfter = market.totalFeeCollected();
        assertEq(totalFeesAfter, expectedFee); // Total fee should now be 2 USDC

        // Optional: validate the seller's balance if needed
        uint256 sellerBalance = usdcToken.balanceOf(user1);
        assertEq(sellerBalance, 98 * 10 ** 6); // Seller should receive 98 USDC after the 2% fee
    }

    // Test cancelling a bid
    function testCancelBid() public {
        // User1 creates a listing
        vm.prank(user1);
        market.addListing(10000 * 10 ** 6, "Item 1", "ipfs://example_link");

        // User2 approves the Market contract to spend their USDC
        vm.prank(user2);
        usdcToken.mint(user2, 100000 * 10 ** 6); // Mint 100000 USDC to user2
        vm.prank(user2);
        usdcToken.approve(address(market), 100 * 10 ** 6);
        vm.prank(user2);
        market.bidForListing(0, 100 * 10 ** 6, "Test address");
        vm.prank(user2);
        market.cancelBid(0);
        // Fetch the bid information after cancellation
        uint256 bidIndex = market.bidderIndex(0, user2);
        (address bidder, uint256 bidAmount, ) = market.listingBids(0, bidIndex);

        // Assert that the bid amount is 0
        assertEq(bidAmount, 0, "Bid amount should be 0 after cancellation");
    }

    // Test raising a dispute
    function testDispute() public {
        // User1 creates a listing
        vm.prank(user1);
        market.addListing(100 * 10 ** 6, "Item 1", "ipfs://example_link");

        // User2 approves the Market contract to spend their USDC
        vm.prank(user2);
        usdcToken.mint(user2, 100000 * 10 ** 6); // Mint 100000 USDC to user2
        vm.prank(user2);
        usdcToken.approve(address(market), 100 * 10 ** 6);
        vm.prank(user2);
        market.bidForListing(0, 100 * 10 ** 6, "Test address");

        vm.prank(user2);
        market.raiseDispute(0);
        (
            uint256 itemIdAfterDispute,
            string memory itemTitle,
            address sellerAfterDispute,
            uint256 priceAfterDispute,
            string memory ipfsLinkAfterDispute,
            uint8 listingStatusAfterDispute,
            address buyerAfterDispute,
            string memory encryptedBuyerAddressAfterDispute,
            uint256 blockTimestampForDisputeAfterDispute
        ) = market.listings(0);

        assertEq(
            listingStatusAfterDispute,
            3,
            "Listing status should be 'in dispute' (3)"
        );
    }

    // Dispute raise and admin came in to verify
    function testResolveDispute() public {
        testDispute();
        uint256 initialSellerBalance = usdcToken.balanceOf(user1);
        uint256 initialFeeCollected = market.totalFeeCollected();

        vm.prank(admin); // Use the admin account to resolve the dispute
        market.resolveDispute(0, true);
        (
            uint256 itemIdAfterResolveDispute,
            string memory itemTitle,
            address sellerAfterResolveDispute,
            uint256 priceAfterResolveDispute,
            string memory ipfsLinkAfterResolveDispute,
            uint8 listingStatusAfterResolveDispute,
            address buyerAfterResolveDispute,
            string memory encryptedBuyerAddressAfterResolveDispute,
            uint256 blockTimestampForDisputeAfterResolveDispute
        ) = market.listings(0);
        assertEq(
            listingStatusAfterResolveDispute,
            4,
            "Listing status should be 'cancelled' 4 "
        );
    }
}
