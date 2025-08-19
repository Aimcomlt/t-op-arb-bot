/**
 * Uniswap V2 Factory ABI
 * Used to enumerate LP pairs and find pair addresses by token combination
 */
export declare const UNISWAP_FACTORY_ABI: readonly [{
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
//# sourceMappingURL=uniswapV2Factory.d.ts.map