/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
import {ethers, deployments} from "hardhat"
import {BigNumber, Signer} from "ethers"
import {solidity} from "ethereum-waffle"
import chai, { expect } from "chai"
import {Facade} from "../../typechain/Facade"
import {HegicPool} from "../../typechain/HegicPool"
import {WethMock} from "../../typechain/WethMock"
import {ExerciserV1} from "../../typechain/ExerciserV1"
import {ExpirerV1} from "../../typechain/ExpirerV1"
import {Erc20Mock as ERC20} from "../../typechain/Erc20Mock"
import {AggregatorV3Interface} from "../../typechain/AggregatorV3Interface"

chai.use(solidity)

describe("Keepers", async () => {
  let facade: Facade
  let WBTC: ERC20
  let USDC: ERC20
  let WETH: ERC20
  let alice: Signer
  let HegicATMCALLWETH: HegicPool
  let HegicATMPUTWETH: HegicPool
  let ethPriceFeed: AggregatorV3Interface
  let exerciserV1: ExerciserV1
  let expirerV1: ExpirerV1

  beforeEach(async () => {
    await deployments.fixture()
    ;[, alice] = await ethers.getSigners()

    facade = (await ethers.getContract("Facade")) as Facade
    WBTC = (await ethers.getContract("WBTC")) as ERC20
    WETH = (await ethers.getContract("WETH")) as WethMock
    USDC = (await ethers.getContract("USDC")) as ERC20
    exerciserV1 = (await ethers.getContract("ExerciserV1")) as ExerciserV1
    expirerV1 = (await ethers.getContract("ExpirerV1")) as ExpirerV1
    USDC = (await ethers.getContract("USDC")) as ERC20
    ethPriceFeed = (await ethers.getContract(
      "WETHPriceProvider",
    )) as AggregatorV3Interface

    HegicATMCALLWETH = (await ethers.getContract("HegicWETHCALL")) as HegicPool
    HegicATMPUTWETH = (await ethers.getContract("HegicWETHPUT")) as HegicPool

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

  const runExerciser = async () => {
    const pages = (await exerciserV1.numberOfPages()).toNumber()
    const options: BigNumber[] = []
    for (let page = 0; page < pages ; page ++) {
        const {len, out} = await exerciserV1.search(page);
        options.push(...out.slice(0, len.toNumber()))
    }
    await(await exerciserV1.run(options)).wait(1)
  }


  const runExpirationBot = async () => {
    const pages = (await expirerV1.numberOfPages()).toNumber()
    const options: BigNumber[] = []
    for (let page = 0; page < pages ; page ++) {
        const {len, out} = await expirerV1.callStatic.search(page);
        options.push(...out.slice(0, len.toNumber()))
    }
    await(await expirerV1.run(options)).wait(1)
  }

  describe("Keeper bot can process options", () => {
    it("Should be able to excersise ITM options", async () => {

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
        
        // Make sure we can't change state prematurely
        await runExerciser()
        expect((await HegicATMCALLWETH.options(0)).state).to.be.eq(1)
        await runExpirationBot()
        expect((await HegicATMCALLWETH.options(0)).state).to.be.eq(1)

        // Move forward 23 hours 30 minutes
        await ethers.provider.send("evm_increaseTime", [24 * 3600 - 30 * 60 + 1])
        await ethers.provider.send("evm_mine", [])
        expect((await HegicATMCALLWETH.options(0)).state).to.be.eq(1)
        
        // Make sure we can't expire an option prematurely
        await runExpirationBot()
        expect((await HegicATMCALLWETH.options(0)).state).to.be.eq(1)

        // Make sure we can excersice this option
        await runExerciser()
        expect((await HegicATMCALLWETH.options(0)).state).to.be.eq(2)

        // Make sure we can't change the state of the exercised option
        await runExpirationBot()
        expect((await HegicATMCALLWETH.options(0)).state).to.be.eq(2)
    })

    it("Should expire OTM options", async () => {
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
        // Make sure we can't change state prematurely
        await runExerciser()
        expect((await HegicATMCALLWETH.options(0)).state).to.be.eq(1)
        await runExpirationBot()
        expect((await HegicATMCALLWETH.options(0)).state).to.be.eq(1)

        // Move forward 23 hours 30 minutes
        await ethers.provider.send("evm_increaseTime", [24 * 3600 - 30 * 60 + 1])
        await ethers.provider.send("evm_mine", [])

        // Nothing changes
        expect((await HegicATMCALLWETH.options(0)).state).to.be.eq(1)
        await runExerciser()
        expect((await HegicATMCALLWETH.options(0)).state).to.be.eq(1)
        await runExpirationBot()
        expect((await HegicATMCALLWETH.options(0)).state).to.be.eq(1)

        // Move forward 1 hour
        await ethers.provider.send("evm_increaseTime", [3600])
        await ethers.provider.send("evm_mine", [])
        await runExerciser()
        expect((await HegicATMCALLWETH.options(0)).state).to.be.eq(1)
        await runExpirationBot()
        expect((await HegicATMCALLWETH.options(0)).state).to.be.eq(3)
        await runExerciser()
        expect((await HegicATMCALLWETH.options(0)).state).to.be.eq(3)
    })
  })

})
