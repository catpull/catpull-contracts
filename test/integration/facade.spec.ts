import {ethers, deployments} from "hardhat"
import {BigNumber as BN, Signer} from "ethers"
import {solidity} from "ethereum-waffle"
import chai, { expect } from "chai"
import {Facade} from "../../typechain/Facade"
import {UiProvider} from "../../typechain/UiProvider"
import {HegicPool} from "../../typechain/HegicPool"
import {WethMock} from "../../typechain/WethMock"
import {WavaxMock} from "../../typechain/WavaxMock"
import {Erc20Mock as ERC20} from "../../typechain/Erc20Mock"
import {AggregatorV3Interface} from "../../typechain/AggregatorV3Interface"
import {OptionsManager} from "../../typechain/OptionsManager"

chai.use(solidity)

describe("Facade", async () => {
  let facade: Facade
  let WBTC: ERC20
  let GovernanceToken: ERC20
  let USDC: ERC20
  let WETH: ERC20
  let WAVAX: WethMock
  let alice: Signer
  let HegicATMCALLWETH: HegicPool
  let HegicATMPUTWETH: HegicPool
  let HegicATMCALLWAVAX: HegicPool
  let uiProvider: UiProvider
  let HegicATMPUTWAVAX: HegicPool
  let ethPriceFeed: AggregatorV3Interface

  beforeEach(async () => {
    await deployments.fixture()
    ;[, alice] = await ethers.getSigners()

    facade = (await ethers.getContract("Facade")) as Facade
    uiProvider = (await ethers.getContract("UIProvider")) as UiProvider
    WBTC = (await ethers.getContract("WBTC")) as ERC20
    GovernanceToken = (await ethers.getContract("GovernanceToken")) as ERC20
    WETH = (await ethers.getContract("WETH")) as WethMock
    WAVAX = (await ethers.getContract("WAVAX")) as WavaxMock
    USDC = (await ethers.getContract("USDC")) as ERC20
    ethPriceFeed = (await ethers.getContract(
      "WETHPriceProvider",
    )) as AggregatorV3Interface

    HegicATMCALLWETH = (await ethers.getContract("HegicWETHCALL")) as HegicPool
    HegicATMPUTWETH = (await ethers.getContract("HegicWETHPUT")) as HegicPool
    HegicATMCALLWAVAX = (await ethers.getContract("HegicWAVAXCALL")) as HegicPool
    HegicATMPUTWAVAX = (await ethers.getContract("HegicWAVAXPUT")) as HegicPool
    WAVAX.deposit({value: ethers.utils.parseUnits("100")})

    await WETH.connect(alice).mint(ethers.utils.parseUnits("100"))

    await WBTC.mintTo(
      await alice.getAddress(),
      ethers.utils.parseUnits("1000000", await WBTC.decimals()),
    )

    await WETH.connect(alice).approve(
      HegicATMCALLWETH.address,
      ethers.constants.MaxUint256,
    )
    await WETH.connect(alice).approve(
      facade.address,
      ethers.constants.MaxUint256,
    )

    await WAVAX.connect(alice).approve(
      HegicATMCALLWAVAX.address,
      ethers.constants.MaxUint256,
    )
    await WAVAX.connect(alice).approve(
      HegicATMPUTWAVAX.address,
      ethers.constants.MaxUint256,
    )
    await WAVAX.connect(alice).approve(
      facade.address,
      ethers.constants.MaxUint256,
    )

    await USDC.mintTo(
      await alice.getAddress(),
      ethers.utils.parseUnits("10000000", await USDC.decimals()),
    )

    await USDC.connect(alice).approve(
      facade.address,
      ethers.constants.MaxUint256,
    )

    await USDC.connect(alice).approve(
      HegicATMPUTWETH.address,
      ethers.constants.MaxUint256,
    )
  })

  describe("options pricing", () => {
    it("should be able to correctly price options", async () => {
      const pricePut = await facade
        .connect(alice)
        .getOptionPrice(
          HegicATMPUTWETH.address,
          24 * 3600,
          ethers.utils.parseUnits("1"),
          2500e8,
          [USDC.address],
      )
      expect(pricePut.total.toString()).to.eq("46458200");


      const priceCallBase = await facade
        .connect(alice)
        .getBaseOptionCost(
          HegicATMCALLWETH.address,
          24 * 3600,
          ethers.utils.parseUnits("1"),
          2500e8,
      )

      expect(priceCallBase.total.toString()).to.eq("18994328227402749");

      const priceCall = await facade
        .connect(alice)
        .getOptionPrice(
          HegicATMCALLWETH.address,
          24 * 3600,
          ethers.utils.parseUnits("1"),
          2500e8,
          [USDC.address, WETH.address],
      )
      expect(priceCall.total.toString()).to.eq("47629612");

      const pricePutBase = await facade
        .connect(alice)
        .getBaseOptionCost(
          HegicATMPUTWETH.address,
          24 * 3600,
          ethers.utils.parseUnits("1"),
          2500e8,
      )
      expect(pricePutBase.total.toString()).to.eq("46458200");
    })
  })

  describe("createOption", () => {
    it("should create call options", async () => {

      await HegicATMCALLWETH.connect(alice).provideFrom(
        await alice.getAddress(),
        ethers.utils.parseEther("10"),
        0
      )

      await facade
        .connect(alice)
        .createOption(
          HegicATMCALLWETH.address,
          24 * 3600,
          ethers.utils.parseUnits("1"),
          2500e8,
          [USDC.address, WETH.address],
          ethers.constants.MaxUint256,
        )
      await ethPriceFeed.setPrice(3000e8)
      await HegicATMCALLWETH.connect(alice).exercise(0)
    })

    it("should create put options", async () => {
      await HegicATMPUTWETH.connect(alice).provideFrom(
        await alice.getAddress(),
        "10000000000",
        0,
      )
      await facade
        .connect(alice)
        .createOption(
          HegicATMPUTWETH.address,
          24 * 3600,
          ethers.utils.parseUnits("1"),
          2500e8,
          [USDC.address],
          ethers.constants.MaxUint256,
        )
      await ethPriceFeed.setPrice(2000e8)
      await HegicATMPUTWETH.connect(alice).exercise(0)
    })

    it("should be able to see option in UI manager after", async () => {
      await HegicATMCALLWETH.connect(alice).provideFrom(
        await alice.getAddress(),
        ethers.utils.parseEther("10"),
        0
      )

      await facade
        .connect(alice)
        .createOption(
          HegicATMCALLWETH.address,
          24 * 3600,
          ethers.utils.parseUnits("1"),
          2500e8,
          [USDC.address, WETH.address],
          ethers.constants.MaxUint256,
        )
      
      const overview = await uiProvider.optionsViewData(await alice.getAddress(), 0)
      expect(overview.totalOptions.toNumber()).to.eq(1);
    })

    it("should have gotten a reward after creating an option", async () => {

      const balance0 = await GovernanceToken.balanceOf(await alice.getAddress())
      expect(balance0.toString()).to.eq("0");
      await HegicATMCALLWETH.connect(alice).provideFrom(
        await alice.getAddress(),
        ethers.utils.parseEther("10"),
        0
      )
      const balance1 = await GovernanceToken.balanceOf(await alice.getAddress())
      // User gets 1250 rewards tokens for providing 10ETH @ 2500 usd
      expect(balance1.toString()).to.eq("1250000000000000000000");


      await facade
        .connect(alice)
        .createOption(
          HegicATMCALLWETH.address,
          24 * 3600,
          ethers.utils.parseUnits("1"),
          2500e8,
          [USDC.address, WETH.address],
          ethers.constants.MaxUint256,
        )
      
      // User got 2.37 tokens for buying a call @ 47 USD
      const balance2 = await GovernanceToken.balanceOf(await alice.getAddress())
      expect(balance2.toString()).to.eq("1252374291028425343625");
    })
  })

  describe("provideEthToPool", () => {
    it("should provide ETH to pool (unhedged)", async () => {
      await facade
        .connect(alice)
        .provideEthToPool(HegicATMCALLWAVAX.address, 0, {
          value: ethers.utils.parseEther("10"),
        })
    })
  })
})
