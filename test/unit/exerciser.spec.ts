import {ethers, deployments} from "hardhat"
import {BigNumber as BN, Signer} from "ethers"
import {solidity} from "ethereum-waffle"
import chai from "chai"
import {Facade} from "../../typechain/Facade"
import {HegicPool} from "../../typechain/HegicPool"
import {WethMock} from "../../typechain/WethMock"
import {Erc20Mock as ERC20} from "../../typechain/Erc20Mock"
import {AggregatorV3Interface} from "../../typechain/AggregatorV3Interface"
import {Exerciser} from "../../typechain/Exerciser"
import {OptionsManager} from "../../typechain/OptionsManager"

chai.use(solidity)

describe("Exerciser", async () => {
  let facade: Facade
  let WBTC: ERC20
  let USDC: ERC20
  let WETH: WethMock
  let alice: Signer
  let hegicATMCALLWETH: HegicPool
  let hegicATMPUTWETH: HegicPool
  let ethPriceFeed: AggregatorV3Interface
  let exerciser: Exerciser
  let manager: OptionsManager

  beforeEach(async () => {
    await deployments.fixture()
    ;[, alice] = await ethers.getSigners()

    // router = (await ethers.getContract("UniswapRouterMock")) as Uniswap
    facade = (await ethers.getContract("Facade")) as Facade
    WBTC = (await ethers.getContract("WBTC")) as ERC20
    WETH = (await ethers.getContract("WETH")) as WethMock
    USDC = (await ethers.getContract("USDC")) as ERC20
    ethPriceFeed = (await ethers.getContract(
      "WETHPriceProvider",
    )) as AggregatorV3Interface

    hegicATMCALLWETH = (await ethers.getContract("HegicWETHCALL")) as HegicPool
    hegicATMPUTWETH = (await ethers.getContract("HegicWETHPUT")) as HegicPool
    manager = (await ethers.getContract("OptionsManager")) as OptionsManager
    exerciser = (await ethers.getContract("Exerciser")) as Exerciser

    await WETH.connect(alice).mint(ethers.utils.parseUnits("100"))

    await WBTC.mintTo(
      await alice.getAddress(),
      ethers.utils.parseUnits("1000000", await WBTC.decimals()),
    )

    await WETH.connect(alice).approve(
      hegicATMCALLWETH.address,
      ethers.constants.MaxUint256,
    )

    await USDC.mintTo(
      await alice.getAddress(),
      ethers.utils.parseUnits("1000000000000000", await USDC.decimals()),
    )

    await USDC.connect(alice).approve(
      facade.address,
      ethers.constants.MaxUint256,
    )

    await USDC.connect(alice).approve(
      hegicATMPUTWETH.address,
      ethers.constants.MaxUint256,
    )
  })

  describe("exercise", () => {
    it("should exercise option", async () => {
      await hegicATMCALLWETH.connect(alice).provideFrom(
        await alice.getAddress(),
        ethers.utils.parseEther("10"),
        0
      )
      await facade
        .connect(alice)
        .createOption(
          hegicATMCALLWETH.address,
          24 * 3600,
          ethers.utils.parseUnits("1"),
          2500e8,
          [USDC.address, WETH.address],
          ethers.constants.MaxUint256,
        )
      await ethPriceFeed.setPrice(3000e8)
      // await HegicATMCALL_WETH.connect(alice).exercise(0)

      await manager.connect(alice).setApprovalForAll(exerciser.address, true)
      // Move forward 360 days
      await ethers.provider.send("evm_increaseTime", [24 * 3600 - 30 * 60 + 1])
      await ethers.provider.send("evm_mine", [])
      await exerciser.exercise(0)
    })
  })
})
