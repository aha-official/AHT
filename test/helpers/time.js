// Returns the time of the last mined block in seconds
const latest = async () => {
  const block = await web3.eth.getBlock('latest');
  return block.timestamp;
}

// Increase ganache time by the passed duration in seconds
const increase = (duration) => {
  const id = Date.now();

  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      params: [duration],
      id
    }, err1 => {
      if (err1) return reject(err1);

      web3.currentProvider.sendAsync({
          jsonrpc: 2.0,
          method: 'evm_mine',
          id: id + 1
      }, (err2, res) => {
          return err2 ? reject(err2) : resolve(res);
      });
    });
  });
}

/**
 * Beware that due to the need of calling two separate ganache methods and rpc calls overhead
 * it's hard to increase time precisely to a target point so design your test to tolerate
 * small fluctuations from time to time.
 *
 * @param target time in seconds
 */
const increaseTo = async (target) => {
  const now = (await latest());

  if (target < now) throw Error(`Cannot increase current time(${now}) to a moment in the past(${target})`);
  const diff = target - now;
  return increase(diff);
}

const duration = {
  seconds(val) { return val; },
  minutes(val) { return val * this.seconds(60); },
  hours(val) { return val * this.minutes(60); },
  days(val) { return val * this.hours(24); },
  weeks(val) { return val * this.days(7); },
  years(val) { return val * this.days(365); }
}

module.exports = {
  latest, 
  increase,
  increaseTo,
  duration 
};