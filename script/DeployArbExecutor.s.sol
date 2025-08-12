// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/ArbExecutor.sol";

contract DeployArbExecutor is Script {
    function run() external {
        address pool = vm.envAddress("AAVE_POOL");
        address uni = vm.envAddress("UNI_ROUTER");
        address sushi = vm.envAddress("SUSHI_ROUTER");
        vm.startBroadcast();
        new ArbExecutor(pool, uni, sushi);
        vm.stopBroadcast();
    }
}
