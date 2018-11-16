pragma solidity ^0.4.24;

import "./ERC20.sol";
import "../access/roles/BurnerRole.sol";


/**
 * @title Burnable Token
 * @dev Token that can be irreversibly burned (destroyed).
 */
contract ERC20Burnable is ERC20, BurnerRole {

    /**
     * @dev Burns a specific amount of tokens of burner.
     * @param value The amount of token to be burned.
     */
    function burn(uint256 value) public onlyBurner {
        _burn(msg.sender, value);
    }

    /**
     * @dev Burns a specific amount of tokens from the target address and decrements allowance
     * @param from address The address which you want to send tokens from
     * @param value uint256 The amount of token to be burned
     */
    function burnFrom(address from, uint256 value) public onlyBurner {
        _burnFrom(from, value);
    }
}
