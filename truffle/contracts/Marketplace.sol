// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "./IERC4907.sol";

contract Marketplace is ReentrancyGuard {
    using Counters for Counters.Counter;
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;

    address private _marketOwner;

    // define a listing fee for all nft contracts
    uint256 private _listingFee = .001 ether;

    Counters.Counter private _nftsListed;

    // maps contract address to a (mapping of token id to properties of listing)
    mapping(address => mapping(uint256 => Listing)) private _listingMap;

    // maps nft contracts to the set of the tokens that are listed in the contract
    mapping(address => EnumerableSet.UintSet) private _nftContractTokensMap;

    // tracks the nft contracts that have been listed
    EnumerableSet.AddressSet private _nftContracts;

    // contains properties of the rental listing
    struct Listing {
        address owner;
        address user;
        address nftContract;
        uint256 tokenId;
        uint256 pricePerDay;
        uint256 startDateUNIX;
        uint256 endDateUNIX;
        uint256 expires;
    }

    event NFTListed(
        address owner,
        address user,
        address nftContract,
        uint256 tokenId,
        uint256 pricePerDay,
        uint256 startDateUNIX,
        uint256 endDateUNIX,
        uint256 expires
    );

    event nftRented(
        address owner,
        address user,
        address nftContract,
        uint256 tokenId,
        uint256 startDateUNIX,
        uint256 endDateUNIX,
        uint256 expires,
        uint256 rentalFee
    );

    event NFTUnlisted(
        address unlistSender,
        address nftContract,
        uint256 tokenId,
        uint256 refund
    );

    constructor() {
        _marketOwner = msg.sender;
    }

    function isRentableNFT(address nftContract) public view returns (bool) {
        bool _isRentable = false;
        bool _isNFT = false;

        try
            IERC165(nftContract).supportsInterface(type(IERC4907).interfaceId)
        returns (bool rentable) {
            _isRentable = rentable;
        } catch {
            return false;
        }

        try
            IERC165(nftContract).supportsInterface(type(IERC721).interfaceId)
        returns (bool nft) {
            _isNFT = nft;
        } catch {
            return false;
        }

        return _isRentable && _isNFT;
    }

    function getListingFee() public view returns (uint256) {
        return _listingFee;
    }

    function getAllListings() public view returns (Listing[] memory) {
        Listing[] memory listings = new Listing[](_nftsListed.current());
        uint256 listingIndex = 0;
        address[] memory nftContracts = EnumerableSet.values(_nftContracts);

        for (uint i = 0; i < nftContracts.length; i++) {
            address nftAddress = nftContracts[i];
            uint256[] memory tokens = EnumerableSet.values(
                _nftContractTokensMap[nftAddress]
            );
            for (uint j = 0; j < tokens.length; j++) {
                listings[listingIndex] = _listingMap[nftAddress][tokens[j]];
                listingIndex++;
            }
        }
        return listings;
    }

    function listNft(
        address nftContract,
        uint256 tokenId,
        uint256 pricePerDay,
        uint256 startDateUNIX,
        uint256 endDateUNIX
    ) public payable nonReentrant {
        require(isRentableNFT(nftContract), "Contract is not an ERC4907");
        require(
            IERC721(nftContract).ownerOf(tokenId) == msg.sender,
            "You are not the owner of the contract"
        );
        require(
            msg.value == _listingFee,
            "You havenot provided enough ether for listing"
        );
        require(pricePerDay > 0, "Rental price should be greater than 0");
        require(
            startDateUNIX >= block.timestamp,
            "Start date cannot be in the past"
        );
        require(
            endDateUNIX >= startDateUNIX,
            "End date cannot be before the start date"
        );
        require(
            _listingMap[nftContract][tokenId].nftContract == address(0),
            "This NFT has been already listed"
        );

        // transfer the listing fee to the market offer
        // payable(_marketOwner).transfer(_listingFee);
        (bool success, ) = _marketOwner.call{value: _listingFee}("");
        require(success, "transfer of listing fee failed");

        // create the token inside the nft contract
        _listingMap[nftContract][tokenId] = Listing(
            msg.sender,
            address(0),
            nftContract,
            tokenId,
            pricePerDay,
            startDateUNIX,
            endDateUNIX,
            0
        );

        // increase the count for the nfts listed
        _nftsListed.increment();

        EnumerableSet.add(_nftContractTokensMap[nftContract], tokenId);
        EnumerableSet.add(_nftContracts, nftContract);

        // emit an event for frontend to let them know that nft is listed
        emit NFTListed(
            IERC721(nftContract).ownerOf(tokenId),
            address(0),
            nftContract,
            tokenId,
            pricePerDay,
            startDateUNIX,
            endDateUNIX,
            0
        );
    }

    function rentNFT(
        address nftContract,
        uint256 tokenId,
        uint64 expires
    ) public payable nonReentrant {
        Listing storage listing = _listingMap[nftContract][tokenId];

        // check for compliances here later

        // Transfer rental fee
        uint256 numDays = (expires - block.timestamp) / 60 / 60 / 24 + 1;
        uint256 rentalFee = listing.pricePerDay * numDays;
        require(msg.value >= rentalFee, "not enough ether to cover rental fee");
        // payable(listing.owner).transfer(rentalFee); // convert this to call() later
        (bool success, ) = listing.owner.call{value: rentalFee}("");
        require(success, "transferring rental fee tx failed");

        // Update Listing
        IERC4907(nftContract).setUser(tokenId, msg.sender, expires);
        listing.user = msg.sender;
        listing.expires = expires;

        // emit event for frontend
        emit nftRented(
            IERC721(nftContract).ownerOf(tokenId),
            msg.sender,
            nftContract,
            tokenId,
            listing.startDateUNIX,
            listing.endDateUNIX,
            expires,
            rentalFee
        );
    }
}
