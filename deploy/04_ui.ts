import {HardhatRuntimeEnvironment} from "hardhat/types"

async function deployment(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments, getNamedAccounts} = hre
  const {deploy, get} = deployments
  const {deployer} = await getNamedAccounts()

  const StableCoin = await get("USDC")
  const OptionsManager = await get("OptionsManager")

  console.log("UIProvider!")

  await deploy("UIProvider", {
    from: deployer,
    log: true,
    args: [
      OptionsManager.address,
      StableCoin.address
    ],
    waitConfirmations: 1
  })

  console.log("Done!")
}

deployment.tags = ["test", "ui"]

export default deployment
