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
        // 0 = unsold, 1 = bid accepted, 2 = in dispute, 3 = sold and completed, 4 = cancelled, 5 = delivered awaiting buyer release
        uint8 listingStatus;
        address buyer;
        uint256 blockTimestampForDispute;
    }

    struct Bid {
        address bidder;
        uint256 bidAmount;
    }

    // Admin mapping
    mapping(address => bool) public adminAccess;

    // Mapping to store listings Count > Struct
    mapping(uint256 => Listing) public listings;
    uint256 public listingCount;

    // Mapping for bids on listings
    mapping(uint256 => Bid[]) public listingBids;
    // ListingID => Address to get position value for listingBids[] since is array for fast caching
    mapping(uint256 => mapping(address => uint256)) public bidderIndex;
    // Mapping to store Unique Worldcoin users
    // user to their keys as bool
    mapping(address => string) public walletToPublicKey;
    // Save gas usdc address will nvr change in the chain, unless something goes wrong
    IERC20 public immutable USDCTOKEN;

    event ListingCreated(
        uint256 _listingId,
        address _seller,
        uint256 _listingPrice
    );
    event ItemSold(uint256 _listingID, address _buyer, uint256 _purchasePrice);
    event newBid(
        uint256 _listingID,
        address _bidderAddress,
        uint256 _bidAmount
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
        USDCTOKEN = IERC20(_usdcToken);
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
            0,
            address(0),
            block.timestamp
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
            bytes(walletToPublicKey[_userAddress]).length > 0,
            "User does not exist"
        );

        // Set the mapping entry back to the default value (empty string)
        walletToPublicKey[_userAddress] = "";
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
        require(userListing.listingStatus == 0, "Cannot edit a sold listing");
        // If the listingStatus input is 4, change the listing status to cancelled but make sure status is 0 first
        if (_listingStatus == 4) {
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
        Listing storage userListing = listings[_listingID];
        require(userListing.listingStatus == 0, "Listing is not unsold");

        //If bid price is same or more than listing price, instantly mark it as 1 for bid accepted, send the usdc from user wallet to contract for escrow
        if (_bidPrice >= userListing.price) {
            // Transfer USDC from bidder to contract for escrow since bid accepted
            require(
                USDCTOKEN.transferFrom(
                    msg.sender,
                    address(this),
                    userListing.price
                ),
                "USDC transfer failed"
            );
            // Update the listing status to 1 (bid accepted)
            userListing.listingStatus = 1;

            // Update the block timestamp to 14 days from now
            userListing.blockTimestampForDispute = block.timestamp + 14 days;
            userListing.buyer = msg.sender;
            // Check if the bidder has already placed a bid
            if (bidderIndex[_listingID][msg.sender] == 0) {
                // New bidder, append their bid and map their index
                listingBids[_listingID].push(Bid(msg.sender, _bidPrice));
                bidderIndex[_listingID][msg.sender] =
                    listingBids[_listingID].length -
                    1; // Map bidder to their index
            } else {
                // Bidder already exists, update their bid
                uint256 index = bidderIndex[_listingID][msg.sender];
                listingBids[_listingID][index].bidAmount = _bidPrice; // Update bid
            }
            // emit event to tell owner to send out item
            emit ItemSold(userListing.itemId, msg.sender, _bidPrice);
        } else {
            // Lower than listing price
            // Check if the bidder has already placed a bid
            if (bidderIndex[_listingID][msg.sender] == 0) {
                // New bidder, append their bid and map their index
                listingBids[_listingID].push(Bid(msg.sender, _bidPrice));
                bidderIndex[_listingID][msg.sender] =
                    listingBids[_listingID].length -
                    1; // Map bidder to their index
            } else {
                // Bidder already exists, update their bid
                uint256 index = bidderIndex[_listingID][msg.sender];
                listingBids[_listingID][index].bidAmount = _bidPrice; // Update bid
            }
            emit newBid(_listingID, msg.sender, _bidPrice);
        }
    }

    // Release payment to listing when item receive
    function releasePaymentToSeller(uint256 _listingID) public onlyAuthorized {
        Listing storage userListing = listings[_listingID];

        require(
            userListing.listingStatus == 1 || userListing.listingStatus == 5,
            "Payment cannot be released, listing is not in bid accepted state"
        );
        // Check that msg.sender is the buyer
        require(
            userListing.buyer == msg.sender,
            "Only the buyer can release the payment"
        );

        // Transfer the payment from contract to the seller
        require(
            USDCTOKEN.transfer(userListing.seller, userListing.price),
            "Payment transfer to seller failed"
        );
        userListing.listingStatus = 3;

        // Sold item done :D
    }

    // Owner of listing to sell to selected bid
    function acceptBid(
        uint256 _listingID,
        address _bidder
    ) public onlyAuthorized {
        // Fetch the listing
        Listing storage userListing = listings[_listingID];
        // Ensure msg.sender is the owner of the listing
        require(
            userListing.seller == msg.sender,
            "Only the owner can accept a bid"
        );

        // Ensure the listing is unsold (status 0) else seller be attempting to dbl sell
        require(userListing.listingStatus == 0, "Listing is not unsold");
        // Fetch the index of the bidder's bid
        uint256 index = bidderIndex[_listingID][_bidder];

        // Fetch the index of the bidder's bid
        index = bidderIndex[_listingID][_bidder];

        // Ensure the bidder exists by checking if the bidder in the struct is correct
        Bid storage bid = listingBids[_listingID][index];
        require(bid.bidder == _bidder, "No bid found for this bidder");
        // Transfer the bid amount from the bidder to the contract (escrow) Fails if they dont have the token anymore
        require(
            USDCTOKEN.transferFrom(_bidder, address(this), bid.bidAmount),
            "USDC transfer failed"
        );
        // Update the listing status to 1 (bid accepted)
        userListing.listingStatus = 1;

        // Set the buyer to the accepted bidder
        userListing.buyer = _bidder;

        // Update the block timestamp for the 14-day hold
        userListing.blockTimestampForDispute = block.timestamp + 14 days;
        emit ItemSold(userListing.itemId, _bidder, bid.bidAmount);
    }

    // Cancel Bid (must not be accepted)
    function cancelBid(uint256 _listingId) public onlyAuthorized {
        // Fetch the listing
        Listing storage userListing = listings[_listingId];
        // Fetch the index of the bidder's bid
        uint256 index = bidderIndex[_listingId][msg.sender];

        // Ensure the sender has placed a bid
        Bid storage userBid = listingBids[_listingId][index];
        require(userBid.bidder == msg.sender, "No bid found for this bidder");
        // Check the listing status
        if (userListing.listingStatus == 0) {
            // 0 means nothing happened yet set bid to 0
            userBid.bidAmount = 0;
        } else {
            require(
                userListing.buyer != msg.sender,
                "Buyer cannot cancel the bid"
            );
            userBid.bidAmount = 0;
        }
    }

    // Submit proof of delivery
    function submitProofOfDelivery(uint256 _listingID) public onlyAuthorized {
        Listing storage userListing = listings[_listingID];

        // Only the buyer can submit proof of delivery
        require(
            userListing.buyer == msg.sender,
            "Only the buyer can submit proof of delivery"
        );

        // Ensure the listing is in "bid accepted" state
        require(
            userListing.listingStatus == 1,
            "Listing must be in bid accepted state"
        );

        // Extend the timelock by 14 days before the seller can retrieve payment
        userListing.blockTimestampForDispute = block.timestamp + 14 days;

        // Mark the listing as delivered (status = 5)
        userListing.listingStatus = 5;
        // Seller can withdraw after 14 days if no dispute is made, sometimes buyers just lazy
    }

    // Dispute
    function raiseDispute(uint256 _listingID) public onlyAuthorized {
        Listing storage userListing = listings[_listingID];

        // Only the buyer or seller can raise a dispute
        require(
            userListing.buyer == msg.sender || userListing.seller == msg.sender,
            "Only the buyer or seller can raise a dispute"
        );

        // Ensure the listing is either in "bid accepted" or "delivered" state
        require(
            userListing.listingStatus == 1 || userListing.listingStatus == 5,
            "Cannot raise a dispute for this listing"
        );

        // Mark the listing as "in dispute" (status = 3)
        userListing.listingStatus = 3;
    }

    // Admin resolves the dispute and transfers the funds to either buyer or seller
    function resolveDispute(
        uint256 _listingID,
        bool sendToSeller
    ) public onlyAdmin {
        Listing storage userListing = listings[_listingID];

        // Ensure the listing is in dispute
        require(userListing.listingStatus == 3, "Listing is not in dispute");

        // If the dispute is resolved in favor of the seller, transfer the funds to the seller
        if (sendToSeller) {
            require(
                USDCTOKEN.transfer(userListing.seller, userListing.price),
                "Payment transfer to seller failed"
            );
            userListing.listingStatus = 4; // cancelled
        }
        // If the dispute is resolved in favor of the buyer, refund the buyer
        else {
            require(
                USDCTOKEN.transfer(userListing.buyer, userListing.price),
                "Refund transfer to buyer failed"
            );
            userListing.listingStatus = 4; // cancelled
        }
    }
}
