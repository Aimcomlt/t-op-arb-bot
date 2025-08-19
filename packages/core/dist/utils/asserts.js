export function assertDefined(val, msg = 'Expected value to be defined') {
    if (val === undefined)
        throw new Error(msg);
    return val;
}
