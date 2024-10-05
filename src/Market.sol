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
        string encryptedBuyerAddress;
        uint256 blockTimestampForDispute;
    }

    struct Bid {
        address bidder;
        uint256 bidAmount;
        // Seller can read all bidders address, recommend to use PO box for delivery, require more advanced solution to hide the address in
        // future
        string encryptedBidderAddress;
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
    // Mapping of verified humans (proof) to wallet addresses and vice versa
    mapping(bytes32 => address) public humanToWallet;
    mapping(address => bytes32) public walletToHumanIDHash;
    // Save gas usdc address will nvr change in the chain, unless something goes wrong
    IERC20 public immutable USDCTOKEN;
    uint256 public feeBPS;
    uint256 public totalFeeCollected;

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
        // Initial set to 2% BPS 200/10000
        feeBPS = 200;
    }

    // Admin can set the fee (in basis points)
    function setFee(uint256 _feeBPS) public onlyAdmin {
        feeBPS = _feeBPS;
    }

    // Admin can withdraw the accumulated fees
    function withdrawFees() public onlyAdmin {
        uint256 amount = totalFeeCollected;
        totalFeeCollected = 0; // Reset the fees
        require(USDCTOKEN.transfer(msg.sender, amount), "Transfer failed");
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
            // encryptedBuyerAddress (initially empty)
            "",
            block.timestamp
        );
        emit ListingCreated(listingCount, msg.sender, _price);
        listingCount++;
    }

    // Add authorized user by admin
    function addAuthorizedUser(
        address _userAddress,
        string memory _userPublicKey,
        bytes32 worldIDHash
    ) public onlyAdmin {
        walletToPublicKey[_userAddress] = _userPublicKey;
        // Ensure the human is not already registered
        require(humanToWallet[worldIDHash] == address(0), "Already registered");

        // Map the verified human (worldIDHash) to the provided wallet
        humanToWallet[worldIDHash] = _userAddress;
        walletToHumanIDHash[_userAddress] = worldIDHash;
    }

    // Remove user
    function removeAuthorizedUser(address _userAddress) public onlyAdmin {
        require(
            bytes(walletToPublicKey[_userAddress]).length > 0,
            "User does not exist"
        );
        // Get the worldIDHash associated with the user
        bytes32 worldIDHash = walletToHumanIDHash[_userAddress];

        // Set the mapping entry back to the default value (empty string)
        walletToPublicKey[_userAddress] = "";
        humanToWallet[worldIDHash] = address(0); // Set the address to 0
        walletToHumanIDHash[_userAddress] = "";
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
        uint256 _bidPrice,
        string memory _encryptedAddress
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
                listingBids[_listingID].push(
                    Bid(msg.sender, _bidPrice, _encryptedAddress)
                );
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
                listingBids[_listingID].push(
                    Bid(msg.sender, _bidPrice, _encryptedAddress)
                );
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

    // Change encrypted Address incase you mess up
    function changeBidAddress(
        uint256 _listingID,
        string memory _newEncryptedAddress
    ) public onlyAuthorized {
        // Fetch the listing
        Listing storage userListing = listings[_listingID];

        // Ensure the listing status is unsold (0)
        require(
            userListing.listingStatus == 0,
            "Listing status must be unsold (0)"
        );
        // Fetch the index of the caller's bid
        uint256 index = bidderIndex[_listingID][msg.sender];

        // Ensure the bid exists for the caller
        require(
            index < listingBids[_listingID].length,
            "No bid found for this address"
        );

        // Fetch the bid
        Bid storage bid = listingBids[_listingID][index];

        // Ensure the caller is the original bidder
        require(
            bid.bidder == msg.sender,
            "Only the original bidder can modify the address"
        );

        // Update the encrypted buyer address in the Bid struct
        bid.encryptedBidderAddress = _newEncryptedAddress;
    }

    function changeAddressAfterAcceptance(
        uint256 _listingID,
        string memory _newEncryptedAddress
    ) public onlyAuthorized {
        // Fetch the listing
        Listing storage userListing = listings[_listingID];

        // Ensure the listing status is bid accepted (1)
        require(
            userListing.listingStatus == 1,
            "Listing status must be 'bid accepted' (1)"
        );

        // Ensure the caller is the buyer of the listing
        require(
            userListing.buyer == msg.sender,
            "Only the buyer can modify the address after acceptance"
        );

        // Update the encrypted address in the Listing struct
        userListing.encryptedBuyerAddress = _newEncryptedAddress;

        // Fetch the index of the caller's bid
        uint256 index = bidderIndex[_listingID][msg.sender];

        // Ensure the bid exists
        require(
            index < listingBids[_listingID].length,
            "No bid found for this address"
        );

        // Update the encrypted address in the Bid struct
        Bid storage bid = listingBids[_listingID][index];
        bid.encryptedBidderAddress = _newEncryptedAddress;
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

        uint256 fee = (userListing.price * feeBPS) / 10000; // Calculate the 2% fee
        uint256 sellerAmount = userListing.price - fee;
        // Transfer the payment from contract to the seller
        require(
            USDCTOKEN.transfer(userListing.seller, sellerAmount),
            "Payment transfer to seller failed"
        );
        // Add the fee to the total fees
        totalFeeCollected += fee;
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
        // move the encrypted address
        userListing.encryptedBuyerAddress = bid.encryptedBidderAddress;

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

    // Withdraw funds after proof of delivery
    function sellerWithdrawalNoDispute(
        uint256 _listingID
    ) public onlyAuthorized {
        // Recognize i am not checking if msg.sender is the seller but hardcoded to fwd seller the funds, thus doesnt matter anyone can assist
        // the seller in retrieving their payment (can be platform helps to send the seller their funds by calling this, removing the gas requirement by seller)
        // Fetch the listing
        Listing storage userListing = listings[_listingID];

        // Ensure the listing status is 'delivered awaiting buyer release' (5)
        require(
            userListing.listingStatus == 5,
            "Listing status must be 'delivered' (5)"
        );

        // Ensure the block timestamp has passed the dispute period
        require(
            block.timestamp > userListing.blockTimestampForDispute,
            "Dispute period has not passed"
        );
        uint256 fee = (userListing.price * feeBPS) / 10000; // feeBPS is in basis points (e.g., 200 for 2%)

        // Calculate the amount to be sent to the seller (price minus fee)
        uint256 sellerAmount = userListing.price - fee;

        // Transfer the funds to the seller
        require(
            USDCTOKEN.transfer(userListing.seller, sellerAmount),
            "Transfer to seller failed"
        );

        // Update total fees collected
        totalFeeCollected += fee;

        // Mark the listing as completed (status = 3)
        userListing.listingStatus = 3;
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
        uint256 fee = (userListing.price * feeBPS) / 10000; // Calculate the 2% fee
        // Pay back the amount - fee as the feeBPS is used to cover admin charges and dispute charges
        uint256 sendAmount = userListing.price - fee;

        // If the dispute is resolved in favor of the seller, transfer the funds to the seller
        if (sendToSeller) {
            require(
                USDCTOKEN.transfer(userListing.seller, sendAmount),
                "Payment transfer to seller failed"
            );
            userListing.listingStatus = 4; // cancelled
        }
        // If the dispute is resolved in favor of the buyer, refund the buyer
        else {
            require(
                USDCTOKEN.transfer(userListing.buyer, sendAmount),
                "Refund transfer to buyer failed"
            );
            userListing.listingStatus = 4; // cancelled
        }
        // Add the fee to the total fees
        totalFeeCollected += fee;
    }
}
