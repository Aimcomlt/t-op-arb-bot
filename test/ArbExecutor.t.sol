// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/ArbExecutor.sol";

contract MockToken is IERC20 {
    string public constant name = "Mock";
    string public constant symbol = "MOCK";
    uint8 public constant decimals = 18;
    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        require(balanceOf[msg.sender] >= amount, "bal");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        require(balanceOf[from] >= amount, "bal");
        require(allowance[from][msg.sender] >= amount, "allow");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract MockRouter is IRouterV2 {
    uint256 public factor;
    constructor(uint256 _factor) { factor = _factor; }
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 /*amountOutMin*/,
        address[] calldata path,
        address to,
        uint256 /*deadline*/
    ) external override returns (uint256[] memory amounts) {
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        uint256 out = amountIn * factor;
        IERC20(path[path.length - 1]).transfer(to, out);
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        amounts[path.length - 1] = out;
    }
}

contract MockAavePool is IAaveV3Pool {
    function flashLoanSimple(
        address receiver,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 /*referral*/
    ) external override {
        uint256 premium = amount / 100;
        IERC20(asset).transfer(receiver, amount);
        IFlashLoanSimpleReceiver(receiver).executeOperation(asset, amount, premium, receiver, params);
        uint256 repay = amount + premium;
        IERC20(asset).transferFrom(receiver, address(this), repay);
    }
}

contract ArbExecutorTest is Test {
    MockToken tokenA;
    MockToken tokenB;
    MockRouter uni;
    MockRouter sushi;
    MockAavePool pool;
    ArbExecutor exec;

    function setUp() public {
        tokenA = new MockToken();
        tokenB = new MockToken();
        uni = new MockRouter(2); // doubles amount
        sushi = new MockRouter(1); // 1:1
        pool = new MockAavePool();
        exec = new ArbExecutor(address(pool), address(uni), address(sushi));

        tokenA.mint(address(pool), 1000 ether);
        tokenB.mint(address(uni), 1000 ether);
        tokenA.mint(address(sushi), 1000 ether);
    }

    function testPostCallbackBalanceAtLeastOwed() public {
        ArbExecutor.SwapLeg[] memory legs = new ArbExecutor.SwapLeg[](2);

        address[] memory path1 = new address[](2);
        path1[0] = address(tokenA);
        path1[1] = address(tokenB);
        legs[0] = ArbExecutor.SwapLeg({path: path1, minOut: 0, useUni: true});

        address[] memory path2 = new address[](2);
        path2[0] = address(tokenB);
        path2[1] = address(tokenA);
        legs[1] = ArbExecutor.SwapLeg({path: path2, minOut: 0, useUni: false});

        uint256 loan = 10 ether;
        uint256 premium = loan / 100;
        bytes memory params = abi.encode(legs);

        tokenA.mint(address(exec), loan);
        vm.prank(address(pool));
        exec.executeOperation(address(tokenA), loan, premium, address(exec), params);

        uint256 bal = tokenA.balanceOf(address(exec));
        assertGe(bal, loan + premium, "balance < owed");
    }
}
