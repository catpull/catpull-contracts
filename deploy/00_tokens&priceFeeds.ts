import {HardhatRuntimeEnvironment} from "hardhat/types"

import PriceProvider from "../artifacts/@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol/AggregatorV3Interface.json"
async function deployment(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments, getNamedAccounts, network} = hre
  const {deploy, save, getArtifact} = deployments
  const {deployer} = await getNamedAccounts()

  await deploy("GovernanceToken", {
    contract: "GovernanceToken",
    from: deployer,
    log: true,
    args: [],
    waitConfirmations: 1
  })

  if (network.name === "mainnet") {
    const IERC20ABI = await getArtifact("ERC20").then((x) => x.abi)
    const PriceProviderABI = PriceProvider.abi
    await save("USDC", {
      address: "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
      abi: IERC20ABI,
    })
    await save("WBTC", {
      address: "0x50b7545627a5162F82A992c33b87aDc75187B218",
      abi: IERC20ABI,
    })
    await save("WETH", {
      address: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
      abi: IERC20ABI,
    })
    await save("WAVAX", {
      address: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
      abi: IERC20ABI,
    })
    await save("WBTCPriceProvider", {
      address: "0x2779d32d5166baaa2b2b658333ba7e6ec0c65743",
      abi: PriceProviderABI,
    })
    await save("WETHPriceProvider", {
      address: "0x976b3d034e162d8bd72d6b9c989d545b839003b0",
      abi: PriceProviderABI,
    })
    await save("WAVAXPriceProvider", {
      address: "0x0a77230d17318075983913bc2145db16c7366156",
      abi: PriceProviderABI,
    })
  } else {
    await deploy("USDC", {
      contract: "ERC20Mock",
      from: deployer,
      log: true,
      args: ["USDC (Mock)", "USDC", 6],
      waitConfirmations: 1
    })

    await deploy("WETH", {
      contract: "ERC20Mock",
      from: deployer,
      log: true,
      args: ["Wrapped ETH (Mock)", "WETH", 18],
      waitConfirmations: 1
    })

    await deploy("WAVAX", {
      contract: "WAVAXMock",
      from: deployer,
      log: true,
      waitConfirmations: 1
    })

    await deploy("WBTC", {
      contract: "ERC20Mock",
      from: deployer,
      log: true,
      args: ["WBTC (Mock)", "WBTC", 8],
      waitConfirmations: 1
    })
    
    await deploy("WBTCPriceProvider", {
      contract: "PriceProviderMock",
      from: deployer,
      log: true,
      args: [50000e8],
      waitConfirmations: 1
    })

    await deploy("WETHPriceProvider", {
      contract: "PriceProviderMock",
      from: deployer,
      log: true,
      args: [2500e8],
      waitConfirmations: 1
    })

    await deploy("WAVAXPriceProvider", {
      contract: "PriceProviderMock",
      from: deployer,
      log: true,
      args: [95e8],
      waitConfirmations: 1
    })
  }
  console.log("Tokens: done")
}

deployment.tags = ["test", "tokens"]
export default deployment
