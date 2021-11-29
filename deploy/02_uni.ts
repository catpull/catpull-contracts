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
    const USDC = (await ethers.getContract("USDC")) as Erc20Mock
    const tokens = [WETH.address, WBTC.address, USDC.address]
    const amounts = {
      [WBTC.address]: {
        [WETH.address]: [
          ethers.utils.parseUnits("100", 8),
          ethers.utils.parseUnits("2000", 18),
        ],
      },
      [USDC.address]: {
        [WETH.address]: [
          ethers.utils.parseUnits("2500000", 6),
          ethers.utils.parseUnits("1000", 18),
        ],
        [WBTC.address]: [
          ethers.utils.parseUnits("5000000", 6),
          ethers.utils.parseUnits("100", 8),
        ],
      },
    }
    // if (network.name === "testnet") {
    //   amounts = {
    //     [WBTC.address]: {
    //       [WETH.address]: [
    //         ethers.utils.parseUnits("149", 8),
    //         ethers.utils.parseUnits("2000", 18),
    //       ],
    //     },
    //     [USDC.address]: {
    //       [WETH.address]: [
    //         ethers.utils.parseUnits("4085000", 6),
    //         ethers.utils.parseUnits("1000", 18),
    //       ],
    //       [WBTC.address]: [
    //         ethers.utils.parseUnits("5450000", 6),
    //         ethers.utils.parseUnits("100", 8),
    //       ],
    //     },
    //   }
    // }
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
    await (await WETH.mint(ethers.utils.parseUnits("10000", 18))).wait(1)
    await (await WBTC.mint(ethers.utils.parseUnits("500", 8))).wait(1)
    await (await USDC.mint(ethers.utils.parseUnits("50000000", 6))).wait(1)

    console.log("Creating pairs and adding liquidity")
    for (let i = 0; i < tokens.length; i++)
      for (let j = 0; j < i; j++) {
        await (await uniswapV2Library.createPair(tokens[i], tokens[j])).wait(1)
        const p = await uniswapV2Library.getPair(tokens[i], tokens[j])
        console.log(p)
        const pp = (await ethers.getContractAt(
          "UniswapV2Pair",
          p,
        )) as UniswapV2Pair
        const ppp = await ethers
          .getContractAt("ERC20", tokens[i])
          .then((instance) =>
            (instance as Erc20Mock).transfer(p, amounts[tokens[i]][tokens[j]][0]),
          )
        await ppp.wait(1)
        const pppp = await ethers
          .getContractAt("ERC20", tokens[j])
          .then((instance) =>
            (instance as Erc20Mock).transfer(p, amounts[tokens[i]][tokens[j]][1]),
          )
        await pppp.wait(1)
        await (await pp.mint(deployer)).wait(1)
      }
  }
}

deployment.tags = ["test", "uni"]
export default deployment
