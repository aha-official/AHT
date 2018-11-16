var TokenVesting = artifacts.require("TokenVesting");

module.exports = function(deployer) {
  let beneficiary = '...';
  let start = Math.ceil(new Date().getTime() / 1000);
  let cliffDuration = 300;
  let duration = 600;
  let revocable = true;

  deployer.deploy(TokenVesting, beneficiary, start, cliffDuration, duration, revocable);
}