require("@openzeppelin/test-helpers/configure")({
    provider: web3.currentProvider,
    singletons: {
        abstraction: "truffle"
    }
})

const { 
    balance,
    constants,
    ether,
    expectRevert,
    expectEvent
} = require("@openzeppelin/test-helpers");
const Marketplace = artifacts.require("Marketplace");
const RentableNfts = artifacts.require("RentableNfts");

const TODAY = Math.floor(Date.now()/1000);
const TODAY_2 = TODAY + (60*60);
const YESTERDAY = TODAY - (24*60*60);
const TOMORROW = TODAY + (24*60*60);
const IN_FIVE_DAYS = TODAY + (24*60*60*5);

contract("Marketplace", function (accounts) {
    const MARKETPLACE_OWNER = accounts[0];
    const TOKEN_OWNER =  accounts[1];
    const USER = accounts[2];
    let marketplace;
    let rentableNft;
    let nftContract;
    let listingFee;
    let tokenId1;
    let tokenId2;
    let tokenId3;

    before("should reuse variables", async () => {
        marketplace = await Marketplace.deployed();
        rentableNft = await RentableNfts.deployed();
        nftContract = rentableNft.address;
        listingFee = (await marketplace.getListingFee()).toString();

        tokenId1 = (await rentableNft.mint("fakeURI", {from: TOKEN_OWNER})).logs[0].args.tokenId.toNumber();
        tokenId2 = (await rentableNft.mint("fakeURI", {from: TOKEN_OWNER})).logs[0].args.tokenId.toNumber();
        tokenId3 = (await rentableNft.mint("fakeURI", {from: TOKEN_OWNER})).logs[0].args.tokenId.toNumber();
    })
    // it("should assert true", async function () {
    //    const marketplaceContract = await Marketplace.deployed();
    //    const rentableNftContract = await RentableNfts.deployed(marketplaceContract);
    //    console.log("marketplace contract", marketplaceContract);
    //    console.log("rentableNft contract", rentableNftContract);
    //    return assert.isTrue(true); 
    //});
    
    it("should revert if conditions are not satisfied for listing nft", async () => {
        expectRevert(
            marketplace.listNft(
                marketplace.address, tokenId1, 1, TODAY, TOMORROW,
                {from: TOKEN_OWNER, value: listingFee}
            ),
            "Contract is not an ERC4907"
        );
    });
});
