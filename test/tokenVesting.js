const { assertRevert } = require('./helpers/assertRevert');
const expectEvent = require('./helpers/expectEvent');
const time = require('./helpers/time');

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

const AhaToken = artifacts.require('AhaToken');
const TokenVesting = artifacts.require('TokenVesting');

contract('TokenVesting', async (accounts) => {
  const amount = new BigNumber(1000);
  const totalBalance = new BigNumber(15 * (10 ** 9) * (10 ** 18));

  beforeEach(async () => {
    // +1 minutes so it starts after contract instantiation
    this.start = (await time.latest()) + time.duration.minutes(1);
    this.cliffDuration = time.duration.years(1);
    this.duration = time.duration.years(2);
    this.beneficiary = accounts[1];
  });

  it('reverts with a duration shorter than the cliff', async () => {
    const cliffDuration = this.duration;
    const duration = this.cliffDuration;

    cliffDuration.should.be.gt(duration);

    await assertRevert(
        TokenVesting.new(this.beneficiary, this.start, cliffDuration, duration, true, { from: accounts[0] })
    );
  });

  it('reverts with a null beneficiary', async () => {
    await assertRevert(
        TokenVesting.new('0x0000000000000000000000000000000000000000', this.start, 0, 0, true, { from: accounts[0] })
    );
  });

  it('reverts with a null duration', async () => {
    // cliffDuration should also be 0, since the duration must be larger than the cliff
    await assertRevert(
      TokenVesting.new(this.beneficiary, this.start, 0, 0, true, { from: accounts[0] })
    );
  });

  it('reverts if the end time is in the past', async () => {
    const now = await time.latest();

    this.start = now - this.duration - time.duration.minutes(1);
    await assertRevert(
      TokenVesting.new(this.beneficiary, this.start, this.cliffDuration, this.duration, true, { from: accounts[0] })
    );
  });

  describe('once deployed', () => {
    beforeEach(async () => {
      this.vesting = await TokenVesting.new(this.beneficiary, this.start, this.cliffDuration, this.duration, true, { from: accounts[0] });

      this.token = await AhaToken.new();
      await this.token.transfer(this.vesting.address, amount, { from: accounts[0] });
    });

    it('can get state', async () => {
      (await this.vesting.beneficiary()).should.be.equal(this.beneficiary);
      (await this.vesting.cliff()).should.be.bignumber.equal(this.start + this.cliffDuration);
      (await this.vesting.start()).should.be.bignumber.equal(this.start);
      (await this.vesting.duration()).should.be.bignumber.equal(this.duration);
      (await this.vesting.revocable()).should.be.equal(true);
    });

    it('cannot be released before cliff', async () => {
      await assertRevert(this.vesting.release(this.token.address));
    });

    it('can be released after cliff', async () => {
      await time.increaseTo(this.start + this.cliffDuration + time.duration.weeks(1));
      const { logs } = await this.vesting.release(this.token.address);
      expectEvent.inLogs(logs, 'TokensReleased', {
        token: this.token.address,
        amount: await this.token.balanceOf(this.beneficiary),
      });
    });

    it('should release proper amount after cliff', async () => {
      await time.increaseTo(this.start + this.cliffDuration);

      const { receipt } = await this.vesting.release(this.token.address);
      const block = await web3.eth.getBlock(receipt.blockNumber);
      const releaseTime = block.timestamp;

      const releasedAmount = amount.mul(releaseTime - this.start).div(this.duration).floor();
      (await this.token.balanceOf(this.beneficiary)).should.bignumber.equal(releasedAmount);
      (await this.vesting.released(this.token.address)).should.bignumber.equal(releasedAmount);
    });

    it('should linearly release tokens during vesting period', async () => {
      const vestingPeriod = this.duration - this.cliffDuration;
      const checkpoints = 4;

      for (let i = 1; i <= checkpoints; i++) {
        const now = this.start + this.cliffDuration + i * (vestingPeriod / checkpoints);
        await time.increaseTo(now);

        await this.vesting.release(this.token.address);
        const expectedVesting = amount.mul(now - this.start).div(this.duration).floor();
        (await this.token.balanceOf(this.beneficiary)).should.bignumber.equal(expectedVesting);
        (await this.vesting.released(this.token.address)).should.bignumber.equal(expectedVesting);
      }
    });

    it('should have released all after end', async () => {
      await time.increaseTo(this.start + this.duration);
      await this.vesting.release(this.token.address);
      (await this.token.balanceOf(this.beneficiary)).should.bignumber.equal(amount);
      (await this.vesting.released(this.token.address)).should.bignumber.equal(amount);
    });

    it('should be revoked by owner if revocable is set', async () => {
      const { logs } = await this.vesting.revoke(this.token.address);
      expectEvent.inLogs(logs, 'TokenVestingRevoked', { token: this.token.address });
      (await this.vesting.revoked(this.token.address)).should.equal(true);
    });

    it('should fail to be revoked by owner if revocable not set', async () => {
      const vesting = await TokenVesting.new(
        this.beneficiary, this.start, this.cliffDuration, this.duration, false, { from: accounts[0] }
      );

      await assertRevert(vesting.revoke(this.token.address, { from: accounts[0] }));
    });

    it('should return the non-vested tokens when revoked by owner', async () => {
      await time.increaseTo(this.start + this.cliffDuration + time.duration.weeks(12));

      const vested = vestedAmount(amount, await time.latest(), this.start, this.cliffDuration, this.duration);

      await this.vesting.revoke(this.token.address, { from: accounts[0] });

      (await this.token.balanceOf(accounts[0])).should.bignumber.equal(totalBalance.sub(vested));
    });

    it('should keep the vested tokens when revoked by owner', async () => {
      await time.increaseTo(this.start + this.cliffDuration + time.duration.weeks(12));

      const vestedPre = vestedAmount(amount, await time.latest(), this.start, this.cliffDuration, this.duration);

      await this.vesting.revoke(this.token.address, { from: accounts[0] });

      const vestedPost = vestedAmount(amount, await time.latest(), this.start, this.cliffDuration, this.duration);

      vestedPre.should.bignumber.equal(vestedPost);
    });

    it('should fail to be revoked a second time', async () => {
      await this.vesting.revoke(this.token.address, { from: accounts[0] });
      await assertRevert(this.vesting.revoke(this.token.address, { from: accounts[0] }));
    });

    function vestedAmount (total, now, start, cliffDuration, duration) {
      return (now < start + cliffDuration) ? 0 : Math.round(total * (now - start) / duration);
    }
  });
});