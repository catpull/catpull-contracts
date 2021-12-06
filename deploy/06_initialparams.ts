import { HardhatRuntimeEnvironment } from "hardhat/types"

async function deployment(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments, ethers, getNamedAccounts} = hre

  const { deployer } = await getNamedAccounts()
  const { execute, get } = deployments

  await execute("WBTCCallPriceCalculator", {
      from: deployer,
      waitConfirmations: 1
  }, "setImpliedVolRate", "700000000000000000")

  await execute("WBTCCallPriceCalculator", {
      from: deployer,
      waitConfirmations: 1
  }, "setRiskFreeRate", "100000000000000000")

  await execute("WBTCCallPriceCalculator", {
      from: deployer,
      waitConfirmations: 1
  }, "setSwingRate", "0")

  await execute("WBTCPutPriceCalculator", {
      from: deployer,
      waitConfirmations: 1
  }, "setImpliedVolRate", "700000000000000000")

  await execute("WBTCPutPriceCalculator", {
      from: deployer,
      waitConfirmations: 1
  }, "setRiskFreeRate", "100000000000000000")

  await execute("WBTCPutPriceCalculator", {
      from: deployer,
      waitConfirmations: 1
  }, "setSwingRate", "0")
  
  await execute("WBTC", {
      from: deployer,
      waitConfirmations: 1
  }, "approve", (await get("HegicWBTCCALL")).address, "11579208923731619542357098500868790785326998466564056403945758400791312963")

  await execute("USDC", {
      from: deployer,
      waitConfirmations: 1
  }, "approve", (await get("HegicWBTCPUT")).address, "11579208923731619542357098500868790785326998466564056403945758400791312963")

  await execute("HegicWBTCCALL", {
      from: deployer,
      waitConfirmations: 1
  }, "provideFrom", deployer, ethers.utils.parseUnits("100", 8), 0)

  await execute("HegicWBTCPUT", {
      from: deployer,
      waitConfirmations: 1
  }, "provideFrom", deployer, ethers.utils.parseUnits("100000", 6), 0)

  await execute("WAVAX", {
      from: deployer,
      waitConfirmations: 1
  }, "approve", (await get("HegicWAVAXCALL")).address, "11579208923731619542357098500868790785326998466564056403945758400791312963")

  await execute("USDC", {
      from: deployer,
      waitConfirmations: 1
  }, "approve", (await get("HegicWAVAXPUT")).address, "11579208923731619542357098500868790785326998466564056403945758400791312963")

  await execute("HegicWAVAXCALL", {
      from: deployer,
      waitConfirmations: 1
  }, "provideFrom", deployer, ethers.utils.parseUnits("1000", 18), 0)

  await execute("HegicWAVAXPUT", {
      from: deployer,
      waitConfirmations: 1
  }, "provideFrom", deployer, ethers.utils.parseUnits("100000", 6), 0)
  console.log("Set up initial params")
}

deployment.tags = ["initial"]

export default deployment
