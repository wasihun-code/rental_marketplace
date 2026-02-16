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

  it("should revert if conditions are not satisfied for listing nft", async () => {
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

  it("should list nft", async () => {
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
    console.log("Listing fee", BN(listingFee), "Tracker fee", fee);
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
});
