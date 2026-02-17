require("@openzeppelin/test-helpers/configure")({
  provider: web3.currentProvider,
  singletons: {
    abstraction: "truffle",
  },
});

const {
  balance,
  constants,
  ether,
  expectRevert,
  expectEvent,
  BN,
} = require("@openzeppelin/test-helpers");
const { tracker } = require("@openzeppelin/test-helpers/src/balance");
const Marketplace = artifacts.require("Marketplace");
const RentableNfts = artifacts.require("RentableNfts");

const TODAY = Math.floor(Date.now() / 1000);
const TODAY_2 = TODAY + 60 * 60;
const YESTERDAY = TODAY - 24 * 60 * 60;
const TOMORROW = TODAY + 24 * 60 * 60;
const IN_FIVE_DAYS = TODAY + 24 * 60 * 60 * 5;

contract("Marketplace", function (accounts) {
  const MARKETPLACE_OWNER = accounts[0];
  const TOKEN_OWNER = accounts[1];
  const USER = accounts[2];
  let marketplace;
  let rentableNft;
  let nftContract;
  let listingFee;
  let tokenId1;
  let tokenId2;
  let tokenId3;

  // Helper function to compare each field of a listing
  function assertListing(actual, expected) {
    assert.equal(actual.owner, expected.owner, "Owner is not correct");
    assert.equal(actual.user, expected.user, "User is not correct");
    assert.equal(
      actual.nftContract,
      expected.nftContract,
      "NFT contract is not correct",
    );
    assert.equal(actual.tokenId, expected.tokenId, "TokenId is not correct");
    assert.equal(
      actual.pricePerDay,
      expected.pricePerDay,
      "Price per day is not correct",
    );
    assert.equal(
      actual.startDateUNIX,
      expected.startDateUNIX,
      "Start date is not correct",
    );
    assert.equal(
      actual.endDateUNIX,
      expected.endDateUNIX,
      "End date is not correct",
    );
    assert.equal(
      actual.expires,
      expected.expires,
      "Expires date is not correct",
    );
  }

  // helper function to get an individual listing
  function getListing(listings, tokenId) {
    let listing = {};
    listings.every((_listing) => {
      if (_listing.tokenId == tokenId) {
        listing = _listing;
        return false;
      } else {
        return true;
      }
    });
    return listing;
  }

  // helper function to change each field of a listing to string for easier comparision.
  function listingToString(listing) {
    let listingCopy = { ...listing };
    listingCopy.tokenId = listing.tokenId.toString();
    listingCopy.pricePerDay = listing.pricePerDay.toString();
    listingCopy.startDateUNIX = listing.startDateUNIX.toString();
    listingCopy.endDateUNIX = listing.endDateUNIX.toString();
    listingCopy.expires = listing.expires.toString();
    if ("rentalFee" in listing) {
      listingCopy.rentalFee = listing.rentalFee.toString();
    }
  }

  function listingToString2(listing) {
    let listingCopy = { ...listing };
    listingCopy.tokenId = listing.tokenId.toString();
    listingCopy.startDateUNIX = listing.startDateUNIX.toString();
    listingCopy.endDateUNIX = listing.endDateUNIX.toString();
    listingCopy.expires = listing.expires.toString();
    listingCopy.rentalFee = listing.rentalFee.toString();
  }

  before("should reuse variables", async () => {
    marketplace = await Marketplace.deployed();
    rentableNft = await RentableNfts.deployed();
    nftContract = rentableNft.address;
    listingFee = (await marketplace.getListingFee()).toString();

    tokenId1 = (
      await rentableNft.mint("fakeURI", { from: TOKEN_OWNER })
    ).logs[0].args.tokenId.toNumber();
    tokenId2 = (
      await rentableNft.mint("fakeURI", { from: TOKEN_OWNER })
    ).logs[0].args.tokenId.toNumber();
    tokenId3 = (
      await rentableNft.mint("fakeURI", { from: TOKEN_OWNER })
    ).logs[0].args.tokenId.toNumber();
  });

  it("should not list nft if conditions are not met", async () => {
    expectRevert(
      marketplace.listNft(nftContract, tokenId1, 1, TODAY, YESTERDAY, {
        from: USER,
        value: listingFee,
      }),
      "You are not the owner of the contract",
    );
    expectRevert(
      marketplace.listNft(marketplace.address, tokenId1, 1, TODAY, TOMORROW, {
        from: TOKEN_OWNER,
        value: listingFee,
      }),
      "Contract is not an ERC4907",
    );
    expectRevert(
      marketplace.listNft(nftContract, tokenId1, 1, TODAY, TOMORROW, {
        from: TOKEN_OWNER,
        value: listingFee - 1,
      }),
      "You havenot provided enough ether for listing",
    );
    expectRevert(
      marketplace.listNft(nftContract, tokenId1, 1, YESTERDAY, TODAY, {
        from: TOKEN_OWNER,
        value: listingFee,
      }),
      "Start date cannot be in the past",
    );
    expectRevert(
      marketplace.listNft(nftContract, tokenId1, 1, TODAY, YESTERDAY, {
        from: TOKEN_OWNER,
        value: listingFee,
      }),
      "End date cannot be before the start date",
    );
  });

  it("should list nft1", async () => {
    // check if listing fee has been transferred
    let tracker = await balance.tracker(MARKETPLACE_OWNER);
    await tracker.get();

    let txn = await marketplace.listNft(
      nftContract,
      tokenId2,
      ether("1"),
      TOMORROW,
      IN_FIVE_DAYS,
      {
        from: TOKEN_OWNER,
        value: listingFee,
      },
    );

    // check if listing fee has been transferred
    const fee = await tracker.delta();
    assert.equal(
      fee.toString(),
      listingFee.toString(),
      "Listing Fee not transferred",
    );

    const expectedListing = {
      owner: TOKEN_OWNER,
      user: constants.ZERO_ADDRESS,
      nftContract: nftContract,
      tokenId: tokenId2,
      pricePerDay: ether("1"),
      startDateUNIX: TOMORROW,
      endDateUNIX: IN_FIVE_DAYS,
      expires: 0,
    };

    // test if it is listed
    assertListing(
      getListing(await marketplace.getAllListings.call(), tokenId2),
      expectedListing,
    );
    expectEvent(txn, "NFTListed", listingToString(expectedListing));
  });

  it("should list nft2", async () => {
    // check if listing fee has been transferred
    let tracker = await balance.tracker(MARKETPLACE_OWNER);
    await tracker.get();

    let txn = await marketplace.listNft(
      nftContract,
      tokenId3,
      ether("1"),
      TODAY_2,
      IN_FIVE_DAYS,
      {
        from: TOKEN_OWNER,
        value: listingFee,
      },
    );

    // check if listing fee has been transferred
    const fee = await tracker.delta();
    assert.equal(
      fee.toString(),
      listingFee.toString(),
      "Listing Fee not transferred",
    );

    const expectedListing = {
      owner: TOKEN_OWNER,
      user: constants.ZERO_ADDRESS,
      nftContract: nftContract,
      tokenId: tokenId3,
      pricePerDay: ether("1"),
      startDateUNIX: TODAY_2,
      endDateUNIX: IN_FIVE_DAYS,
      expires: 0,
    };

    // test if it is listed
    assertListing(
      getListing(await marketplace.getAllListings.call(), tokenId3),
      expectedListing,
    );
    expectEvent(txn, "NFTListed", listingToString(expectedListing));
  });

  it("shouldnot rent nft if conditions are not met", async () => {
    // get listing
    const listing = getListing(
      await marketplace.getAllListings.call(),
      tokenId2,
    );
    console.log(listing);
    expectRevert(
      marketplace.rentNFT(nftContract, tokenId2, TODAY_2, {
        from: USER,
        value: ether("0"),
      }),
      "not enough ether to cover rental fee",
    );
    // // expectRevert(
    // //   marketplace.rentNFT(nftContract, tokenId1, 0, {
    // //     from: TOKEN_OWNER,
    // //     value: ether("1"),
    // //   }),
    // //   "You cannot rent your own nft",
    // // );
    // const tx = await marketplace.rentNFT(nftContract, tokenId1, 0, {
    //   from: USER,
    //   value: ether("1"),
    // });
    // console.log(listing);
  });

  it("should rent nft", async () => {
    let txn = await marketplace.rentNFT(nftContract, tokenId2, TODAY_2, {
      from: USER,
      value: ether("4"),
    });
    const listing = getListing(
      await marketplace.getAllListings.call(),
      tokenId2,
    );
    console.log(listing);
    const expectedListing = {
      owner: TOKEN_OWNER,
      user: USER,
      nftContract: nftContract,
      tokenId: tokenId2,
      startDateUNIX: TOMORROW,
      endDateUNIX: IN_FIVE_DAYS,
      expires: 0,
      rentalFee: ether("4"),
    };
    assert(listing.user.toString() == USER.toString());
    expectEvent(txn, "nftRented", listingToString2(expectedListing));
  });

  it("should not unlist nft if conditions are not met", async () => {
    await expectRevert(
      marketplace.unlistNFT(nftContract, tokenId3, {
        from: USER,
        value: ether("3"),
      }),
      "Not approved to unlist NFT",
    );

    await expectRevert(
      marketplace.unlistNFT(nftContract, tokenId2, {
        from: TOKEN_OWNER,
        value: ether("0"),
      }),
      "Not enough ether to cover refund",
    );
  });

  it("should unlist nft", async () => {
    let tracker = await balance.tracker(USER);
    await tracker.get();

    let txn = await marketplace.unlistNFT(nftContract, tokenId3, {
      from: TOKEN_OWNER,
      value: ether("2.5"),
    });

    // check refund calculation
    assert.equal(
      (await tracker.delta()).toString(),
      "0",
      "Refund amount is not correct",
    );

    // check if it has been removed from the data structure
    let listing = getListing(await marketplace.getAllListings.call(), tokenId3);
    assert.equal(Object.keys(listing).length, 0, "Nft is not listed");

    expectEvent(txn, "NFTUnlisted", {
      unlistSender: TOKEN_OWNER,
      nftContract: nftContract,
      tokenId: tokenId3.toString(),
      refund: "0",
    });
  });
});
