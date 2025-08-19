export declare const UNISWAP_PAIR_ABI: readonly [{
    readonly constant: true;
    readonly inputs: readonly [];
    readonly name: "getReserves";
    readonly outputs: readonly [{
        readonly internalType: "uint112";
        readonly name: "_reserve0";
        readonly type: "uint112";
    }, {
        readonly internalType: "uint112";
        readonly name: "_reserve1";
        readonly type: "uint112";
    }, {
        readonly internalType: "uint32";
        readonly name: "_blockTimestampLast";
        readonly type: "uint32";
    }];
    readonly payable: false;
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly constant: true;
    readonly inputs: readonly [];
    readonly name: "token0";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly payable: false;
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly constant: true;
    readonly inputs: readonly [];
    readonly name: "token1";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly payable: false;
    readonly stateMutability: "view";
    readonly type: "function";
}];
//# sourceMappingURL=uniswapV2Pair.d.ts.map