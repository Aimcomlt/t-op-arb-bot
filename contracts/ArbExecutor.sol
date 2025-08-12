// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IRouterV2 {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

interface IAaveV3Pool {
    function flashLoanSimple(
        address receiver,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

contract ArbExecutor is IFlashLoanSimpleReceiver {
    IAaveV3Pool public immutable pool;
    IRouterV2 public immutable uniV2;
    IRouterV2 public immutable sushiV2;

    struct SwapLeg {
        address[] path;
        uint256 minOut;
        bool useUni;
    }

    constructor(address _pool, address _uniV2, address _sushiV2) {
        pool = IAaveV3Pool(_pool);
        uniV2 = IRouterV2(_uniV2);
        sushiV2 = IRouterV2(_sushiV2);
    }

    function executeArb(address asset, uint256 amount, SwapLeg[] calldata legs) external {
        bytes memory data = abi.encode(legs);
        pool.flashLoanSimple(address(this), asset, amount, data, 0);
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(pool), "caller not pool");
        require(initiator == address(this), "initiator");

        SwapLeg[] memory legs = abi.decode(params, (SwapLeg[]));
        address currentAsset = asset;
        uint256 currentAmount = amount;

        for (uint256 i = 0; i < legs.length; i++) {
            SwapLeg memory leg = legs[i];
            require(leg.path.length >= 2, "path");
            require(leg.path[0] == currentAsset, "mismatch");
            address router = leg.useUni ? address(uniV2) : address(sushiV2);
            IERC20(currentAsset).approve(router, currentAmount);
            uint256[] memory amounts = IRouterV2(router).swapExactTokensForTokens(
                currentAmount,
                leg.minOut,
                leg.path,
                address(this),
                block.timestamp + 1
            );
            currentAmount = amounts[amounts.length - 1];
            currentAsset = leg.path[leg.path.length - 1];
        }

        require(currentAsset == asset, "final asset");
        uint256 owed = amount + premium;
        uint256 bal = IERC20(asset).balanceOf(address(this));
        require(bal >= owed, "insufficient");
        IERC20(asset).approve(address(pool), owed);
        return true;
    }
}
