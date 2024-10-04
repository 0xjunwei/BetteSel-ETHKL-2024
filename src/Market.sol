// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Market {
    struct Listing {
        uint256 itemId;
        address seller;
        uint256 price;
        string ipfsLink;
        // 0 = unsold, 1 = bid accepted, 2 = in dispute, 3 = sold and completed, 4 = cancelled
        uint8 listingStatus;
        uint256 blockTimestampForDispute;
    }

    // Admin mapping
    mapping(address => bool) public adminAccess;

    // Mapping to store listings Count > Struct
    mapping(uint256 => Listing) public listings;
    uint256 public listingCount;

    // Mapping for bids on listings
    mapping(uint256 => mapping(address => uint256)) public bids;
    // Mapping to store Unique Worldcoin users
    // user to their keys as bool
    mapping(address => string) public walletToPublicKey;
    IERC20 public immutable USDCTOKEN;

    event ListingCreated(
        uint256 _listingId,
        address _seller,
        uint256 _listingPrice
    );
    // Only authorized users can access certain functions
    modifier onlyAuthorized() {
        require(
            bytes(walletToPublicKey[msg.sender]).length > 0,
            "Not authorized"
        );
        _;
    }

    // Only authorized users can access certain functions
    modifier onlyAdmin() {
        require(adminAccess[msg.sender], "Not authorized Admin");
        _;
    }

    constructor(address _usdcToken) {
        USDCTOKEN = _usdcToken;
        adminAccess[msg.sender] = true;
    }

    // Create listing by authorized user
    function addListing(
        uint256 _price,
        string memory _ipfsLink
    ) public onlyAuthorized {
        listings[listingCount] = Listing(
            listingCount,
            msg.sender,
            _price,
            _ipfsLink,
            false
        );
        emit ListingCreated(listingCount, msg.sender, _price);
        listingCount++;
    }

    // Add authorized user by admin
    function addAuthorizedUser(
        address _userAddress,
        string memory _userPublicKey
    ) public onlyAdmin {
        walletToPublicKey[_userAddress] = _userPublicKey;
    }

    // Remove user
    function removeAuthorizedUser(address _userAddress) public onlyAdmin {
        require(
            bytes(userPublicKeys[_userAddress]).length > 0,
            "User does not exist"
        );

        // Set the mapping entry back to the default value (empty string)
        userPublicKeys[_userAddress] = "";
    }

    // Edit listing by listing owner
    function editListing(
        uint256 _listingID,
        uint8 _listingStatus,
        uint256 _newPrice,
        string memory _newIPFS
    ) public onlyAuthorized {
        Listing storage userListing = listings[_listingID];
        require(
            userListing.seller == msg.sender,
            "Only the owner can edit the listing"
        );
        // Ensure the current status is 0 (listing is not sold)
        require(!userListing.isSold, "Cannot edit a sold listing");
        // If the listingStatus input is 4, change the listing status to cancelled but make sure status is 0 first
        if (_listingStatus == 4) {
            require(
                userListing.listingStatus == 0,
                "Cannot cancel unless the listing is unsold"
            );
            userListing.listingStatus = 4;
        }
        userListing.price = _newPrice;
        // If _newIPFS is non-empty, update the IPFS link
        if (bytes(_newIPFS).length > 0) {
            userListing.ipfsLink = _newIPFS;
        }
    }

    // Bid for Listing
    function bidForListing(
        uint256 _listingID,
        uint256 _bidPrice
    ) public onlyAuthorized {
        // Check listing if unsold
        //If bid price is same as listing price, instantly mark it as 1 for bid accepted, send the usdc from user wallet to contract for escrow
        // emit event to tell owner to send out item
    }

    // Release payment to listing when item receive

    //

    // Owner of listing to sell to selected bid

    // Cancel Bid (must not be accepted)

    // Submit proof of delivery

    // Dispute
}
