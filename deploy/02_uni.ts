/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
import {HardhatRuntimeEnvironment} from "hardhat/types"
import {UniswapV2Pair} from "../typechain/UniswapV2Pair"
import {WavaxMock} from "../typechain/WavaxMock"
import {Erc20Mock} from "../typechain/Erc20Mock"

// eslint-disable-next-line import/no-extraneous-dependencies
import {bytecode as UniswapV2FactoryBytecode} from "@uniswap/v2-core/build/UniswapV2Factory.json"

async function deployment(hre: HardhatRuntimeEnvironment): Promise<void> {
  const {deployments, getNamedAccounts, ethers, network} = hre
  const {deploy, save, getArtifact} = deployments
  const {deployer} = await getNamedAccounts()

  if (network.name == "ropsten" || network.name == "mainnet") {
    console.log(
      "TraderJoeRouter: 0x60aE616a2155Ee3d9A68541Ba4544862310933d4",
    )
    await save("UniswapRouter", {
      address: "0x60aE616a2155Ee3d9A68541Ba4544862310933d4",
      abi: (await getArtifact("UniswapV2Router01")).abi,
    })
  } else {
    console.log("Setting up testnet unipools")
    const WETH = (await ethers.getContract("WETH")) as Erc20Mock
    const WAVAX = (await ethers.getContract("WAVAX")) as WavaxMock
    const WBTC = (await ethers.getContract("WBTC")) as Erc20Mock
    const STABLE = (await ethers.getContract("USDC")) as Erc20Mock
    const tokens = [WETH.address, WBTC.address, WAVAX.address]
    const amounts = {
      [STABLE.address]: {
        [WETH.address]: [
          ethers.utils.parseUnits("25000000", 6),
          ethers.utils.parseUnits("10000", 18),
        ],
        [WBTC.address]: [
          ethers.utils.parseUnits("50000000", 6),
          ethers.utils.parseUnits("1000", 8),
        ],
        [WAVAX.address]: [
          ethers.utils.parseUnits("9500000", 6),
          ethers.utils.parseUnits("100000", 18),
        ],
      },
    }
    await deploy("UniswapV2Factory", {
      contract: "UniswapV2Factory",
      from: deployer,
      log: true,
      args: [deployer],
      waitConfirmations: 1
    }) as any;

    const UniswapV2Library = await ethers.getContractFactory(
      [
        "constructor(address _feeToSetter)",
        "function createPair(address tokenA, address tokenB) external returns (address pair)",
        "function getPair(address tokenA, address tokenB) external view returns (address pair)",
      ],
      UniswapV2FactoryBytecode,
    )

    console.log("Deploying uniswapV2Library")
    const uniswapV2Library = await UniswapV2Library.deploy(deployer)
    
    await new Promise(r => setTimeout(r, 1000))

    console.log("Deploying router")
    await deploy("UniswapRouter", {
      contract: "UniswapV2Router01",
      from: deployer,
      log: true,
      args: [uniswapV2Library.address, WAVAX.address],
      waitConfirmations: 1
    })

    console.log("Minting")
    await (await WETH.mint(ethers.utils.parseUnits("100000", 18))).wait(1)
    await (await WAVAX.mint(ethers.utils.parseUnits("100000000", 18))).wait(1)
    await (await WBTC.mint(ethers.utils.parseUnits("5000", 8))).wait(1)
    await (await STABLE.mint(ethers.utils.parseUnits("500000000", 6))).wait(1)

    console.log("Creating pairs and adding liquidity")
    for (let j = 0; j < tokens.length; j++) {
      await (await uniswapV2Library.createPair(STABLE.address, tokens[j])).wait(1)
      const p = await uniswapV2Library.getPair(STABLE.address, tokens[j])
      console.log(p)
      const pp = (await ethers.getContractAt(
        "UniswapV2Pair",
        p,
      )) as UniswapV2Pair
      const ppp = await ethers
        .getContractAt("ERC20", STABLE.address)
        .then((instance) =>
          (instance as Erc20Mock).transfer(p, amounts[STABLE.address][tokens[j]][0]),
        )
      await ppp.wait(1)
      const pppp = await ethers
        .getContractAt("ERC20", tokens[j])
        .then((instance) =>
          (instance as Erc20Mock).transfer(p, amounts[STABLE.address][tokens[j]][1]),
        )
      await pppp.wait(1)
      await (await pp.mint(deployer)).wait(1)
    }
  }
}

deployment.tags = ["test", "uni"]
export default deployment
