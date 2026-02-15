require("@openzeppelin/test-helpers/configure")({
  provider: web3.currentProvider,
  singletons: {
    abstraction: "truffle",
  },
});

const {
  constants,
  expectRevert,
  expectEvent,
} = require("@openzeppelin/test-helpers");

const RentableNfts = artifacts.require("RentableNfts");

contract("RentableNfts", function (accounts) {
  it("should support ERC721 and ERC4907 standards", async () => {
    const RentableNftsInstance = await RentableNfts.deployed();

    const ERC721Id = "0x80ac58cd";
    const ERC4907Id = "0xad092b5c";

    var isERC721 = await RentableNftsInstance.supportsInterface(ERC721Id);
    var isERC4907 = await RentableNftsInstance.supportsInterface(ERC4907Id);

    assert.equal(isERC721, true, "RentableNfts is not ERC721 Compatible");
    assert.equal(isERC4907, true, "RentableNfts is not ERC4907 compatible");
  });

  it("should not set Userinfo if sender is not owner", async () => {
    const RentableNftsInstance = await RentableNfts.deployed();

    const expirationDatePast = 1660252958;
    await RentableNftsInstance.mint("fakeURI");

    // expect a revert if sending from address other than the owner
    await expectRevert(
      RentableNftsInstance.setUser(1, accounts[1], expirationDatePast, {
        from: accounts[1],
      }),
      "ERC721: transfer caller is not owner nor approved",
    );

    // assert no userinfo for nft
    var user = await RentableNftsInstance.userOf.call(1);
    assert.equal(user, constants.ZERO_ADDRESS, "NFT user is not zero address");
  });

  it("should return the correct UserInfo", async () => {
    const RentableNftsInstance = await RentableNfts.deployed();
    const expirationDatePast = 1660252958; // Aug 8 2022
    const expirationDateFuture = 4121727755; // Aug 11 2100
    await RentableNftsInstance.mint("fakeURI");
    await RentableNftsInstance.mint("fakeURI");

    // Set and get UserInfo
    var expiredTx = await RentableNftsInstance.setUser(
      2,
      accounts[1],
      expirationDatePast,
    );
    var unexpiredTx = await RentableNftsInstance.setUser(
      3,
      accounts[2],
      expirationDateFuture,
    );
    var expiredNFTUser = await RentableNftsInstance.userOf.call(2);
    var expiredNFTDate = await RentableNftsInstance.userExpires.call(2);
    var unexpireNFTUser = await RentableNftsInstance.userOf.call(3);
    var unexpiredNFTDate = await RentableNftsInstance.userExpires.call(3);

    // Assert UserInfo and event transmission
    assert.equal(
      expiredNFTUser,
      constants.ZERO_ADDRESS,
      "Expired NFT has wrong user",
    );
    assert.equal(
      expiredNFTDate,
      expirationDatePast,
      "Expired NFT has wrong expiration date",
    );
    expectEvent(expiredTx, "UpdateUser", {
      tokenId: "2",
      user: accounts[1],
      expires: expirationDatePast.toString(),
    });
    assert.equal(unexpireNFTUser, accounts[2], "Expired NFT has wrong user");
    assert.equal(
      unexpiredNFTDate,
      expirationDateFuture,
      "Expired NFT has wrong expiration date",
    );
    expectEvent(unexpiredTx, "UpdateUser", {
      tokenId: "3",
      user: accounts[2],
      expires: expirationDateFuture.toString(),
    });

    // Burn NFT
    unexpiredTx = await RentableNftsInstance.burn(3);

    // Assert UserInfo was deleted
    unexpireNFTUser = await RentableNftsInstance.userOf.call(3);
    unexpiredNFTDate = await RentableNftsInstance.userExpires.call(3);
    assert.equal(
      unexpireNFTUser,
      constants.ZERO_ADDRESS,
      "NFT user is not zero address",
    );
    assert.equal(unexpiredNFTDate, 0, "NFT expiration date is not 0");
    expectEvent(unexpiredTx, "UpdateUser", {
      tokenId: "3",
      user: constants.ZERO_ADDRESS,
      expires: "0",
    });
  });
});
