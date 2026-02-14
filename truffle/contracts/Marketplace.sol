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
  uint256 private _listingFee = .001 ether;

  Counters.Counter private _nftsListed;
  mapping(address => mapping(uint256 => Listing)) private _listingMap;
  mapping(address => EnumerableSet.UintSet) private _nftContractTokensMap;
  EnumerableSet.AddressSet private _nftContracts;

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

}
