const RentableNfts = artifacts.require("RentableNfts");

module.exports = function (deployer) {
  deployer.deploy(RentableNfts);
};
