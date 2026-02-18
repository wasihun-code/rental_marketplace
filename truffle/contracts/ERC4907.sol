// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./IERC4907.sol";

contract ERC4907 is ERC721URIStorage, IERC4907 {
    struct UserInfo {
        address user;
        uint64 expires;
    }

    mapping(uint256 => UserInfo) internal _users;

    constructor(
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) {}

    function setUser(
        uint256 tokenId,
        address user,
        uint64 expires
    ) public virtual override {
        address owner = ownerOf(tokenId);

        require(
            msg.sender == owner ||
                isApprovedForAll(owner, msg.sender) ||
                getApproved(tokenId) == msg.sender,
            "ERC721: transfer caller is not owner nor approved"
        );

        _users[tokenId] = UserInfo(user, expires);

        emit UpdateUser(tokenId, user, expires);
    }

    function userOf(
        uint256 tokenId
    ) public view virtual override returns (address) {
        if (uint256(_users[tokenId].expires) >= block.timestamp) {
            return _users[tokenId].user;
        } else {
            return address(0);
        }
    }

    function userExpires(
        uint256 tokenId
    ) public view virtual returns (uint256) {
        return _users[tokenId].expires;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override returns (bool) {
        return
            interfaceId == type(IERC4907).interfaceId ||
            super.supportsInterface(interfaceId);
    }
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = super._update(to, tokenId, auth);

        if (from != to && _users[tokenId].user != address(0)) {
            delete _users[tokenId];
            emit UpdateUser(tokenId, address(0), 0);
        }

        return from;
    }

    // function _beforeTokenTransfer(
    //     address from, address to, uint256 tokenId, uint256 batchSize
    // ) internal virtual override {
    //     super._beforeTokenTransfer(from, to, tokenId, batchSize);

    //     if (from != to && _users[tokenId].user != address(0)) {
    //         delete _users[tokenId];
    //         emit UpdateUser(tokenId, address(0), 0);
    //     }
    // }
}
