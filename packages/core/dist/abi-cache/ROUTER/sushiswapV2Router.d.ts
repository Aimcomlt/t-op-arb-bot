/**
 * SushiSwap V2 Router ABI
 * Identical to Uniswap V2 — used for token swap calls and pricing
 */
export declare const SUSHISWAP_ROUTER_ABI: readonly [{
    readonly name: "swapExactTokensForTokens";
    readonly type: "function";
    readonly inputs: readonly [{
        readonly name: "amountIn";
        readonly type: "uint256";
    }, {
        readonly name: "amountOutMin";
        readonly type: "uint256";
    }, {
        readonly name: "path";
        readonly type: "address[]";
    }, {
        readonly name: "to";
        readonly type: "address";
    }, {
        readonly name: "deadline";
        readonly type: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "amounts";
        readonly type: "uint256[]";
    }];
    readonly stateMutability: "nonpayable";
}, {
    readonly name: "getAmountsOut";
    readonly type: "function";
    readonly inputs: readonly [{
        readonly name: "amountIn";
        readonly type: "uint256";
    }, {
        readonly name: "path";
        readonly type: "address[]";
    }];
    readonly outputs: readonly [{
        readonly name: "amounts";
        readonly type: "uint256[]";
    }];
    readonly stateMutability: "view";
}];
//# sourceMappingURL=sushiswapV2Router.d.ts.map