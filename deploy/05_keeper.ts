import {HardhatRuntimeEnvironment} from "hardhat/types"

async function deployment(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments, getNamedAccounts} = hre
  const {deploy, get} = deployments
  const {deployer} = await getNamedAccounts()

  const OptionsManager = await get("OptionsManager")

  console.log("Keepers!")

  await deploy("ExerciserV1", {
    from: deployer,
    log: true,
    args: [
      OptionsManager.address
    ],
    waitConfirmations: 1
  })

  await deploy("ExpirerV1", {
    from: deployer,
    log: true,
    args: [
      OptionsManager.address
    ],
    waitConfirmations: 1
  })

  console.log("Done!")
}

deployment.tags = ["test", "keeper"]

export default deployment
