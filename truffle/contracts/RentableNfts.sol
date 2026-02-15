// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "./ERC4907.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract RentableNfts is ERC4907{
  using Counters for Counters.Counter;
  Counters.Counter private _tokenIds;
  address private marketplaceContract;

  constructor(address _marketplaceContract) ERC4907("RentableNfts", "RP")  {
      marketplaceContract = _marketplaceContract;
  }

  function mint(string memory _tokenURI) public {
      _tokenIds.increment();
      uint256 newTokenId = _tokenIds.current();
      _safeMint(msg.sender, newTokenId);
      _setTokenURI(newTokenId, _tokenURI);
  }

  function burn(uint256 tokenId) public {
      _burn(tokenId);
  }
}

