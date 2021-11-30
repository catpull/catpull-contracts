import {HardhatRuntimeEnvironment} from "hardhat/types"
import {HegicPool} from "../typechain/HegicPool"
import {OptionsManager} from "../typechain/OptionsManager"

const INITIVRAte = "900000000000000000" // 90%

async function deployment(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments, getNamedAccounts, ethers} = hre
  const {deploy, execute, get} = deployments
  const {deployer} = await getNamedAccounts()

  const stableCoin = await get("USDC")
  const governanceToken = await get("GovernanceToken")

  
  const rewardsManagerInst = await deploy("RewardsManager", {
    contract: "InitialRewardsManager",
    from: deployer,
    waitConfirmations: 1,
    log: true,
    args: [governanceToken.address]
  })

  await execute(
    "GovernanceToken",
    {from: deployer, log: true, waitConfirmations: 1},
    "transfer",
    rewardsManagerInst.address,
    ethers.utils.parseUnits("1000000", 18),
  )

  const optionsManagerInst = await deploy("OptionsManager", {
    from: deployer,
    waitConfirmations: 1,
    log: true,
  })

  const blackScholesModelInst = await deploy("BlackScholes", {
    contract: "BlackScholesModel",
    from: deployer,
    waitConfirmations: 1,
    log: true,
    args: []
  })

  const optionsManagerInstance = (await ethers.getContract(
    "OptionsManager",
  )) as OptionsManager

  await deploy("InputConstaint", {
    contract: "InitialInputConstraint",
    from: deployer,
    waitConfirmations: 1,
    log: true,
    args: []
  })

  const setupPoolsForAsset = async (assetName: string) => {
    const asset = await get(assetName)
    const priceProvider = await get(`${assetName}PriceProvider`)
    const callPoolName = `Hegic${assetName}CALL`
    const putPoolName = `Hegic${assetName}PUT`
    const callPoolInst = await deploy(callPoolName, {
      contract: "HegicCALL",
      from: deployer,
      waitConfirmations: 1,
      log: true,
      args: [
        asset.address,
        `Hegic ${assetName} Calls Pool`,
        `${assetName}CALLSPOOL`,
        optionsManagerInst.address,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        priceProvider.address,
        asset.address,
      ],
    })


    const putPoolInst = await deploy(putPoolName, {
      contract: "HegicPUT",
      from: deployer,
      waitConfirmations: 1,
      log: true,
      args: [
        stableCoin.address,
        `Hegic ${assetName} Puts Pool`,
        `${assetName}PUTSPOOL`,
        optionsManagerInst.address,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        priceProvider.address,
        18,
        asset.address,
      ],
    })

    const callPricerAtm = await deploy(`${assetName}CallPriceCalculator`, {
      contract: "PriceCalculator",
      from: deployer,
      waitConfirmations: 1,
      log: true,
      args: [INITIVRAte, priceProvider.address, callPoolInst.address, blackScholesModelInst.address],
    })
    const callPricerItm = await deploy(`${assetName}CallPriceCalculatorItm`, {
      contract: "PriceCalculator",
      from: deployer,
      waitConfirmations: 1,
      log: true,
      args: [INITIVRAte, priceProvider.address, callPoolInst.address, blackScholesModelInst.address],
    })
    const callPricerOtm = await deploy(`${assetName}CallPriceCalculatorOtm`, {
      contract: "PriceCalculator",
      from: deployer,
      waitConfirmations: 1,
      log: true,
      args: [INITIVRAte, priceProvider.address, callPoolInst.address, blackScholesModelInst.address],
    })
    const callInst = (await ethers.getContract(
      callPoolName,
    )) as HegicPool

    const putPricerAtm = await deploy(`${assetName}PutPriceCalculator`, {
      contract: "PriceCalculator",
      from: deployer,
      waitConfirmations: 1,
      log: true,
      args: [INITIVRAte, priceProvider.address, putPoolInst.address, blackScholesModelInst.address],
    })

    const putPricerItm = await deploy(`${assetName}PutPriceCalculatorItm`, {
      contract: "PriceCalculator",
      from: deployer,
      waitConfirmations: 1,
      log: true,
      args: [INITIVRAte, priceProvider.address, putPoolInst.address, blackScholesModelInst.address],
    })

    const putPricerOtm = await deploy(`${assetName}PutPriceCalculatorOtm`, {
      contract: "PriceCalculator",
      from: deployer,
      waitConfirmations: 1,
      log: true,
      args: [INITIVRAte, priceProvider.address, putPoolInst.address, blackScholesModelInst.address],
    })
    const putInst = (await ethers.getContract(
      putPoolName,
    )) as HegicPool

    await execute(
      callPoolName,
      {from: deployer, log: true, waitConfirmations: 1},
      "setPriceCalculator",
      callPricerItm.address,
      callPricerAtm.address,
      callPricerOtm.address,
    )

    await execute(
      putPoolName,
      {from: deployer, log: true, waitConfirmations: 1},
      "setPriceCalculator",
      putPricerItm.address,
      putPricerAtm.address,
      putPricerOtm.address
    )

    await execute(
      "OptionsManager",
      {from: deployer, log: true, waitConfirmations: 1},
      "grantRole",
      await optionsManagerInstance.HEGIC_POOL_ROLE(),
      putInst.address,
    )


    await execute(
      "OptionsManager",
      {from: deployer, log: true, waitConfirmations: 1},
      "grantRole",
      await optionsManagerInstance.HEGIC_POOL_ROLE(),
      callInst.address,
    )

    if (hre.network.name === "mainnet" || hre.network.name === "testnet") {
      await execute(
        callPoolName,
        {from: deployer, log: true, waitConfirmations: 1},
        "setInputValidator",
        ethers.constants.AddressZero,
      )

      await execute(
        putPoolName,
        {from: deployer, log: true, waitConfirmations: 1},
        "setInputValidator",
        ethers.constants.AddressZero,
      )
    }

    await execute(
      callPoolName,
      {from: deployer, log: true, waitConfirmations: 1},
      "setRewardsManager",
      rewardsManagerInst.address
    )

    await execute(
      putPoolName,
      {from: deployer, log: true, waitConfirmations: 1},
      "setRewardsManager",
      rewardsManagerInst.address
    )

    await execute(
      "RewardsManager",
      {from: deployer, log: true, waitConfirmations: 1},
      "addPool",
      callInst.address
    )
    await execute(
      "RewardsManager",
      {from: deployer, log: true, waitConfirmations: 1},
      "addPool",
      putInst.address
    )
  }
  await setupPoolsForAsset("WAVAX")
  await setupPoolsForAsset("WETH")
  await setupPoolsForAsset("WBTC")
}

deployment.tags = ["test", "base"]
export default deployment
