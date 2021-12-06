import {HardhatRuntimeEnvironment} from "hardhat/types"

async function deployment(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments, getNamedAccounts, ethers} = hre
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


console.log(`
const TESTNET_STABLE = mkCoin("${(await get("USDC")).address}", "mim", 6, 0, 50000);
const TESTNET_TOKENS = {
  wavax: mkCoin("${(await get("WAVAX")).address}", "wavax", 18, 10, 50, true),
  wbtc: mkCoin("${(await get("WBTC")).address}", "wbtc", 8, 0.1, 1),
  weth: mkCoin("${(await get("WETH")).address}", "weth", 18, 1, 10),
  stable: TESTNET_STABLE,
} as Record<string, CoinType>

const TESTNET = {
  priceOracles: {
    wbtc: "${(await get("WBTCPriceProvider")).address}",
    // weth: "${(await get("WETHPriceProvider")).address}",
    wavax: "${(await get("WAVAXPriceProvider")).address}",
  } as Record<string, string>,
  tokens: TESTNET_TOKENS,
  tokensLookup: toLookup(TESTNET_TOKENS),
  stable: TESTNET_STABLE,
  facade: "${(await get("Facade")).address}",
  uiProvider: "${(await get("UIProvider")).address}",
  pools: {
    wavax: {
      call: "${(await get("HegicWAVAXCALL")).address}",
      put: "${(await get("HegicWAVAXPUT")).address}",
    },
    wbtc: {
      call: "${(await get("HegicWBTCCALL")).address}",
      put: "${(await get("HegicWBTCPUT")).address}",
    },
    weth: {
      call: "${(await get("HegicWETHCALL")).address}",
      put: "${(await get("HegicWETHPUT")).address}",
    },
  },
  keepers: {
    expiration: "${(await get("ExerciserV1")).address}",
    excercise: "${(await get("ExpirerV1")).address}",
  }
};`
  )

  ;(await ethers.getNamedSigner("deployer")).sendTransaction({
    value: ethers.utils.parseUnits("10", 18),
    to: "0xA2592a5eDa0Af7e35Da498081b78ff0677925846",
  })



  console.log("Done!")

}

deployment.tags = ["test", "keeper"]

export default deployment
