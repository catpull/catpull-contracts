import {HardhatRuntimeEnvironment} from "hardhat/types"

async function deployment(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments, getNamedAccounts} = hre
  const {deploy, get, execute} = deployments
  const {deployer} = await getNamedAccounts()

  const WAVAX = await get("WAVAX")
  const OptionsManager = await get("OptionsManager")
  const uniswapRouter = await get("UniswapRouter")
  console.log("Deploying facade")
  await deploy("Facade", {
    from: deployer,
    log: true,
    args: [
      WAVAX.address,
      uniswapRouter.address,
      OptionsManager.address
    ],
    waitConfirmations: 1
  })

  
  console.log("Setting up last steps")
  await execute(
    "Facade",
    {from: deployer, log: true, waitConfirmations: 1},
    "poolApprove",
    (await get("HegicWBTCCALL")).address,
  )

  await execute(
    "Facade",
    {from: deployer, log: true, waitConfirmations: 1},
    "poolApprove",
    (await get("HegicWBTCPUT")).address,
  )

  await execute(
    "Facade",
    {from: deployer, log: true, waitConfirmations: 1},
    "poolApprove",
    (await get("HegicWETHCALL")).address,
  )

  await execute(
    "Facade",
    {from: deployer, log: true, waitConfirmations: 1},
    "poolApprove",
    (await get("HegicWETHPUT")).address,
  )


  await execute(
    "Facade",
    {from: deployer, log: true, waitConfirmations: 1},
    "poolApprove",
    (await get("HegicWAVAXCALL")).address,
  )
  await execute(
    "Facade",
    {from: deployer, log: true, waitConfirmations: 1},
    "poolApprove",
    (await get("HegicWAVAXPUT")).address,
  )
}

deployment.tags = ["test", "facade"]
deployment.dependencies = ["uni"]

export default deployment
