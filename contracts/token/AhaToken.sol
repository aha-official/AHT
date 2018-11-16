pragma solidity ^0.4.24;

import "./ERC20.sol";
import "./ERC20Detailed.sol";
import "./ERC20Burnable.sol";


/**
 * @dev Contract function to receive approval and execute funtion in one call
 */
contract ApproveAndCallFallBack {
    function receiveApproval(address from, uint256 _amount, address _token, bytes _data) public;
}


/**
 * @title Aha Knowledge Token based on ERC20 token
 * @dev Aha token is burnable for burners only
 */
contract AhaToken is ERC20, ERC20Detailed, ERC20Burnable {
    uint256 public constant INITIAL_SUPPLY = 15 * (10 ** 9);

    constructor() public ERC20Detailed("Aha Knowledge Token", "AHT", 18) {
        _mint(msg.sender, INITIAL_SUPPLY * (10 ** uint256(decimals())));
    }

    function () public payable {
        revert();
    }

    /** 
     * @notice `msg.sender` approves `_spender` to send `_amount` tokens on
     * its behalf, and then a function is triggered in the contract that is
     * being approved, `_spender`. This allows users to use their tokens to
     * interact with contracts in one function call instead of two
     * @param _spender The address of the contract able to transfer the tokens
     * @param _amount The amount of tokens to be approved for transfer
     * @return True if the function call was successful
     */
    function approveAndCall(address _spender, uint256 _amount, bytes _extraData) public returns (bool success) {
        require(approve(_spender, _amount));

        ApproveAndCallFallBack(_spender).receiveApproval(
            msg.sender,
            _amount,
            this,
            _extraData
        );

        return true;
    }
}