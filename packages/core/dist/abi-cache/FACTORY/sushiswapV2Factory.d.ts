/**
 * SushiSwap V2 Factory ABI
 * Same structure as Uniswap V2, allows pair lookups and listing
 */
export declare const SUSHISWAP_FACTORY_ABI: readonly [{
    readonly constant: true;
    readonly inputs: readonly [];
    readonly name: "allPairsLength";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly constant: true;
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "";
        readonly type: "uint256";
    }];
    readonly name: "allPairs";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly constant: true;
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "tokenA";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "tokenB";
        readonly type: "address";
    }];
    readonly name: "getPair";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "pair";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}];
//# sourceMappingURL=sushiswapV2Factory.d.ts.map