// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDT is ERC20 {
    constructor(address recipient) ERC20("Mock USD Tether", "USDT") {
        _mint(recipient, 1_000_000 * 1e6); // 1M USDT
    }
    function decimals() public pure override returns (uint8) { return 6; }
}
