# AHT Token contract and vesting contract
This repo contains Solidity smart contract code for Aha Knowledge Token which conforms [EIP20](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md) standard on Ethereum and vesting contract which is used for token vesting to a beneficiary.

## Specification

### AHT Token
**NOTES**
This token conforms [EIP20](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md) standard. This specification includes methods only that are not included in ERC20 standard.
### Methods

#### approveAndCall
`msg.sender` approves `_spender` to send `_amount` tokens on its behalf, and then a function is triggered in the contract that is being approved, `_spender`. This allows users to use their tokens to interact with contracts in one function call instead of two.

```js
function  approveAndCall(address _spender, uint256 _amount, bytes _extraData) public  returns (bool success)
```
#### increaseAllwance
Increase the amount of tokens that an owner allowed to a spender. `approve` should be called when `allowed[_spender] == 0`. To increment allowed value is better to use this function to avoid 2 calls (and wait until the first transaction is mined)

**NOTES**
It is to prevent attack vectors like the one[described here](https://docs.google.com/document/d/1YLPtQxZu1UAvO9cZ1O2RPXBbT0mooh4DYKjA_jp-RLM/)and discussed[here](https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729)

```js
function increaseAllowance(address spender, uint256 addedValue) public returns (bool)
```
#### decreaseAllowance
Decrease the amount of tokens that an owner allowed to a spender. `approve` should be called when `allowed[_spender] == 0`. To decrement allowed value is better to use this function to avoid 2 calls (and wait until the first transaction is mined)

**NOTES**
It is to prevent attack vectors like the one [described here](https://docs.google.com/document/d/1YLPtQxZu1UAvO9cZ1O2RPXBbT0mooh4DYKjA_jp-RLM/) and discussed [here](https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729)

```js
function  decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool)
```

### burn
Burns a specific amount of tokens of burer. This method is allowed for privileged burners only to prevent mass burning by anonymous token holders.

```js
function  burn(uint256 value) public onlyBurner
```

### Vesting
A token holder contract that can release its token balance gradually like a  typical vesting scheme, with a cliff and vesting period. Optionally revocable by the owner. Implementations are provided by [OpenZeppelin implementation](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/9b3710465583284b8c4c5d2245749246bb2e0094/contracts/token/ERC20/ERC20.sol) which is well tested.

### Methods

#### beneficiary
returns the beneficiary of the tokens.

```js
function  beneficiary() public  view  returns(address)
```

#### cliff
returns the cliff time of the token vesting.

```js
function  cliff() public  view  returns(uint256)
```

#### start
returns the start time of the token vesting.


```js
function  start() public  view  returns(uint256)
```

#### duration
returns the duration of the token vesting.

```js
function  duration() public  view  returns(uint256)
```

#### revocable
returns true if the vesting is revocable.

```js
function  revocable() public  view  returns(bool)
```

#### released
returns the amount of the token released.

```js
function  released(address token) public  view  returns(uint256)
```

#### revoked
returns true if the token is revoked.

```js
function  revoked(address token) public  view  returns(bool)
```

#### release
Allows the owner to revoke the vesting. Tokens already vested remain in the contract, the rest are returned to the owner.

```js
function  revoke(IERC20 token) public onlyOwner
```

## Requirements
- NodeJS 5.0+ recommended.
- Truffle

## Initialize

```
npm install
truffle compile
truffle migrate
```


## Test
The repo has a comprehensive test suite. You can run it via following command.

```
truffle test
```
