const { assertRevert } = require('./helpers/assertRevert');
const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-bignumber')(BigNumber))
  .should();

const AhaToken = artifacts.require('AhaToken');

contract('AhaToken', async (accounts) => {
	const totalBalance = 15 * (10 ** 9) * (10 ** 18);

    beforeEach(async () => {
		ahaToken = await AhaToken.new();
	});

    it("creation: should put 15000000000 AhaToken in the first account", async () => {
		const balance = await ahaToken.balanceOf.call(accounts[0]);
		balance.should.be.bignumber.equal(totalBalance);
    });

    it('creation: test correct settings of vanity information', async () => {
        const name = await ahaToken.name.call();
		assert.strictEqual(name, 'Aha Knowledge Token');

		const symbol = await ahaToken.symbol.call();
		assert.strictEqual(symbol, 'AHT');

		const decimals = await ahaToken.decimals.call();
		assert.strictEqual(decimals.toNumber(), 18);
	});

	// TRANSERS
	// normal transfers without approvals
	it('transfers: ether transfer should be reversed.', async () => {
		const balanceBefore = await ahaToken.balanceOf.call(accounts[0]);
		balanceBefore.should.be.bignumber.equal(totalBalance);

		await assertRevert(new Promise((resolve, reject) => {
			web3.eth.sendTransaction({ from: accounts[0], to: ahaToken.address, value: web3.toWei('10', 'Ether') }, (err, res) => {
				if (err) { 
					reject(err);
				}
				resolve(res);
			});
		}));
		
		const balanceAfter = await ahaToken.balanceOf.call(accounts[0]);
		balanceAfter.should.be.bignumber.equal(totalBalance);
	});

	it('transfers: should transfer 10000 to accounts[1] with accounts[0]', async () => {
		await ahaToken.transfer(accounts[1], 10000, { from: accounts[0] });
		const balance = await ahaToken.balanceOf.call(accounts[1]);
		assert.strictEqual(balance.toNumber(), 10000);
	});

	it('transfers: should fail when trying to transfer more balance than the balance accounts[0] having to accounts[1]', async () => {
		await assertRevert(ahaToken.transfer.call(accounts[1], new BigNumber(totalBalance).plus(1), { from: accounts[0] }));
	});

	it('transfers: should fail when trying to transfer to zero-address', async () => {
		await assertRevert(ahaToken.transfer.call('0x0000000000000000000000000000000000000000', 1, { from: accounts[0] }));
	});

	it('transfers: should handle zero-transfers normally', async () => {
		assert(await ahaToken.transfer.call(accounts[1], 0, { from: accounts[0] }), 'zero-transfer has failed');
	});

	// APPROVALS
	it('approvals: msg.sender should approve 100 to accounts[1]', async () => {
		await ahaToken.approve(accounts[1], 100, { from: accounts[0] });
		const allowance = await ahaToken.allowance.call(accounts[0], accounts[1]);
		assert.strictEqual(allowance.toNumber(), 100);
	});

	// bit overkill. But is for testing a bug
	it('approvals: msg.sender approves accounts[1] of 100 & withdraws 20 once.', async () => {
		const balance0 = await ahaToken.balanceOf.call(accounts[0]);
		balance0.should.be.bignumber.equal(totalBalance);

		await ahaToken.approve(accounts[1], 100, { from: accounts[0] }); // 100
		const balance2 = await ahaToken.balanceOf.call(accounts[2]);
		assert.strictEqual(balance2.toNumber(), 0, 'balance2 not correct');

		await ahaToken.transferFrom.call(accounts[0], accounts[2], 20, { from: accounts[1] });
		await ahaToken.allowance.call(accounts[0], accounts[1]);
		await ahaToken.transferFrom(accounts[0], accounts[2], 20, { from: accounts[1] }); // -20
		const allowance01 = await ahaToken.allowance.call(accounts[0], accounts[1]);
		assert.strictEqual(allowance01.toNumber(), 80); // =80

		const balance22 = await ahaToken.balanceOf.call(accounts[2]);
		assert.strictEqual(balance22.toNumber(), 20);

		const balance02 = await ahaToken.balanceOf.call(accounts[0]);
		balance02.should.be.bignumber.equal(new BigNumber(totalBalance).sub(20));
	});

	// should approve 100 of msg.sender & withdraw 50, twice. (should succeed)
	it('approvals: msg.sender approves accounts[1] of 100 & withdraws 20 twice.', async () => {
		await ahaToken.approve(accounts[1], 100, { from: accounts[0] });
		const allowance01 = await ahaToken.allowance.call(accounts[0], accounts[1]);
		assert.strictEqual(allowance01.toNumber(), 100);

		await ahaToken.transferFrom(accounts[0], accounts[2], 20, { from: accounts[1] });
		const allowance012 = await ahaToken.allowance.call(accounts[0], accounts[1]);
		assert.strictEqual(allowance012.toNumber(), 80);

		const balance2 = await ahaToken.balanceOf.call(accounts[2]);
		assert.strictEqual(balance2.toNumber(), 20);

		const balance0 = await ahaToken.balanceOf.call(accounts[0]);
		balance0.should.be.bignumber.equal(new BigNumber(totalBalance).sub(20));

		// FIRST tx done.
		// onto next.
		await ahaToken.transferFrom(accounts[0], accounts[2], 20, { from: accounts[1] });
		const allowance013 = await ahaToken.allowance.call(accounts[0], accounts[1]);
		assert.strictEqual(allowance013.toNumber(), 60);

		const balance22 = await ahaToken.balanceOf.call(accounts[2]);
		assert.strictEqual(balance22.toNumber(), 40);

		const balance02 = await ahaToken.balanceOf.call(accounts[0]);
		balance02.should.be.bignumber.equal(new BigNumber(totalBalance).sub(40));
	});

	// should approve 100 of msg.sender & withdraw 50 & 60 (should fail).
	it('approvals: msg.sender approves accounts[1] of 100 & withdraws 50 & 60 (2nd tx should fail)', async () => {
		await ahaToken.approve(accounts[1], 100, { from: accounts[0] });
		const allowance01 = await ahaToken.allowance.call(accounts[0], accounts[1]);
		assert.strictEqual(allowance01.toNumber(), 100);

		await ahaToken.transferFrom(accounts[0], accounts[2], 50, { from: accounts[1] });
		const allowance012 = await ahaToken.allowance.call(accounts[0], accounts[1]);
		assert.strictEqual(allowance012.toNumber(), 50);

		const balance2 = await ahaToken.balanceOf.call(accounts[2]);
		assert.strictEqual(balance2.toNumber(), 50);

		const balance0 = await ahaToken.balanceOf.call(accounts[0]);
		balance0.should.be.bignumber.equal(new BigNumber(totalBalance).sub(50));

		// FIRST tx done.
		// onto next.
		await assertRevert(ahaToken.transferFrom.call(accounts[0], accounts[2], 60, { from: accounts[1] }));
	});

	it('approvals: attempt withdrawal from account with no allowance (should fail)', async () => {
		await assertRevert(ahaToken.transferFrom.call(accounts[0], accounts[2], 60, { from: accounts[1] }));
	});

	it('approvals: allow accounts[1] 100 to withdraw from accounts[0]. Withdraw 60 and then approve 0 & attempt transfer.', async () => {
		await ahaToken.approve(accounts[1], 100, { from: accounts[0] });
		await ahaToken.transferFrom(accounts[0], accounts[2], 60, { from: accounts[1] });
		await ahaToken.approve(accounts[1], 0, { from: accounts[0] });
		await assertRevert(ahaToken.transferFrom.call(accounts[0], accounts[2], 10, { from: accounts[1] }));
	});

	it('approvals: approve max (2^256 - 1)', async () => {
		await ahaToken.approve(accounts[1], '115792089237316195423570985008687907853269984665640564039457584007913129639935', { from: accounts[0] });
		const allowance = await ahaToken.allowance(accounts[0], accounts[1]);
		assert(allowance.equals('1.15792089237316195423570985008687907853269984665640564039457584007913129639935e+77'));
	});

	it('approvals: allow accounts[1] 100 to withdraw from accounts[0]. Change allowance to 200 (should fail)', async () => {
		await ahaToken.approve(accounts[1], 100, { from: accounts[0] });
		const allowance01 = await ahaToken.allowance.call(accounts[0], accounts[1]);
		assert.strictEqual(allowance01.toNumber(), 100);

		await assertRevert(ahaToken.approve.call(accounts[1], 200, { from: accounts[0] }));
	});

	it('approvals: allow accounts[1] 100 to withdraw from accounts[0]. Increase allowance to 200', async () => {
		await ahaToken.approve(accounts[1], 100, { from: accounts[0] });
		const allowance01 = await ahaToken.allowance.call(accounts[0], accounts[1]);
		assert.strictEqual(allowance01.toNumber(), 100);

		await ahaToken.increaseAllowance(accounts[1], 100, { from: accounts[0] });
		const allowance012 = await ahaToken.allowance.call(accounts[0], accounts[1]);
		assert.strictEqual(allowance012.toNumber(), 200);
	});

	it('approvals: allow accounts[1] 100 to withdraw from accounts[0]. Change allowance to 50 (should fail)', async () => {
		await ahaToken.approve(accounts[1], 100, { from: accounts[0] });
		const allowance01 = await ahaToken.allowance.call(accounts[0], accounts[1]);
		assert.strictEqual(allowance01.toNumber(), 100);

		await assertRevert(ahaToken.approve.call(accounts[1], 50, { from: accounts[0] }));
	});

	it('approvals: allow accounts[1] 100 to withdraw from accounts[0]. Decrease allowance to 50', async () => {
		await ahaToken.approve(accounts[1], 100, { from: accounts[0] });
		const allowance01 = await ahaToken.allowance.call(accounts[0], accounts[1]);
		assert.strictEqual(allowance01.toNumber(), 100);

		await ahaToken.decreaseAllowance(accounts[1], 50, { from: accounts[0] });
		const allowance012 = await ahaToken.allowance.call(accounts[0], accounts[1]);
		assert.strictEqual(allowance012.toNumber(), 50);
	});

	it('burns: burn 100 of accounts[0]', async () => {
		await ahaToken.burn(100, { from: accounts[0] });
		const balance = await ahaToken.balanceOf.call(accounts[0]);
		balance.should.be.bignumber.equal(new BigNumber(totalBalance).sub(100));

		const totalSupply = await ahaToken.totalSupply.call();
		totalSupply.should.be.bignumber.equal(new BigNumber(totalBalance).sub(100));
	});

	it('burns: should fail when accounts[1] is trying to burn', async () => {
		await assertRevert(ahaToken.burn.call(100, { from: accounts[1] }));
	});

	it('burns: add burner role to accounts[1]', async () => {
		const isBurner0 = await ahaToken.isBurner.call(accounts[1]);
		assert(!isBurner0);

		await ahaToken.addBurner(accounts[1], { from: accounts[0] });
		const isBurner02 = await ahaToken.isBurner.call(accounts[1]);
		assert(isBurner02);
		
		await ahaToken.transfer(accounts[1], 10000, { from: accounts[0] });
		const balance1 = await ahaToken.balanceOf.call(accounts[1]);
		assert.strictEqual(balance1.toNumber(), 10000);

		await ahaToken.burn(100, { from: accounts[1] });
		const balance12 = await ahaToken.balanceOf.call(accounts[1]);
		assert.strictEqual(balance12.toNumber(), 9900);
	});

	it('burns: renounce burner role of accounts[1]', async () => {
		await ahaToken.addBurner(accounts[1], { from: accounts[0] });
		const isBurner0 = await ahaToken.isBurner.call(accounts[1]);
		assert(isBurner0);

		await ahaToken.renounceBurner({ from: accounts[1] });
		const isBurner02 = await ahaToken.isBurner.call(accounts[1]);
		assert(!isBurner02);
	});

	it('events: should fire Transfer event properly', async () => {
		const res = await ahaToken.transfer(accounts[1], '1000', { from: accounts[0] });
		const transferLog = res.logs.find(element => element.event.match('Transfer'));
		assert.strictEqual(transferLog.args.from, accounts[0]);
		assert.strictEqual(transferLog.args.to, accounts[1]);
		assert.strictEqual(transferLog.args.value.toString(), '1000');
	});

	it('events: should fire Transfer event normally on a zero transfer', async () => {
		const res = await ahaToken.transfer(accounts[1], '0', { from: accounts[0] });
		const transferLog = res.logs.find(element => element.event.match('Transfer'));
		assert.strictEqual(transferLog.args.from, accounts[0]);
		assert.strictEqual(transferLog.args.to, accounts[1]);
		assert.strictEqual(transferLog.args.value.toString(), '0');
	});

	it('events: should fire Approval event properly', async () => {
		const res = await ahaToken.approve(accounts[1], '1000', { from: accounts[0] });
		const approvalLog = res.logs.find(element => element.event.match('Approval'));
		assert.strictEqual(approvalLog.args.owner, accounts[0]);
		assert.strictEqual(approvalLog.args.spender, accounts[1]);
		assert.strictEqual(approvalLog.args.value.toString(), '1000');
	});
});