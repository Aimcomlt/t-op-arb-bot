it("should simulate unknown tx and return parsed trace", async () => {
  const result = await simulateUnknownTx({ txHash: "0x..." });
  expect(result).toBeDefined();
});
