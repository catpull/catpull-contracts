import {ethers, deployments} from "hardhat"
import {BigNumber as BN, Signer} from "ethers"
import {solidity} from "ethereum-waffle"
import chai from "chai"
import {HegicPool} from "../../typechain/HegicPool"
import {WethMock} from "../../typechain/WethMock"
import {PriceCalculator} from "../../typechain/PriceCalculator"
import {PriceProviderMock} from "../../typechain/PriceProviderMock"

chai.use(solidity)
const {expect} = chai

describe("PriceCalculator", async () => {
  let hegicPoolWETH: HegicPool
  let priceCalculator: PriceCalculator
  let WETH: WethMock
  let fakePriceProvider: PriceProviderMock
  let alice: Signer

  beforeEach(async () => {
    await deployments.fixture()
    ;[, alice] = await ethers.getSigners()

    WETH = (await ethers.getContract("WETH")) as WethMock

    hegicPoolWETH = (await ethers.getContract("HegicWETHCALL")) as HegicPool

    fakePriceProvider = (await ethers.getContract(
      "WETHPriceProvider",
    )) as PriceProviderMock
    priceCalculator = (await ethers.getContract(
      "WETHCallPriceCalculator",
    )) as PriceCalculator

    await WETH.connect(alice).mint(BN.from(10).pow(20))
    await WETH.connect(alice).approve(
      hegicPoolWETH.address,
      ethers.constants.MaxUint256,
    )
    await hegicPoolWETH
      .connect(alice)
      .provideFrom(await alice.getAddress(), 100000, 100000)
  })

  describe("constructor & settings", async () => {
    it("should set all initial state", async () => {
      expect(await priceCalculator.impliedVolRate()).to.be.eq(
        BN.from("900000000000000000"),
      )
      expect(await priceCalculator.utilizationRate()).to.be.eq(BN.from(0))
      expect(await priceCalculator.priceProvider()).to.be.eq(
        fakePriceProvider.address,
      )
    })

    describe("setImpliedVolRate", async () => {
      it("should revert if the caller is not the owner", async () => {
        await expect(
          priceCalculator.connect(alice).setImpliedVolRate(BN.from(22000)),
        ).to.be.revertedWith("caller is not the owner")
      })

      it("should set the impliedVolRate correctly", async () => {
        const impliedVolRateBefore = await priceCalculator.impliedVolRate()
        expect(impliedVolRateBefore).to.be.eq(BN.from("900000000000000000"))
        await priceCalculator.setImpliedVolRate(BN.from(11000))
        const impliedVolRateAfter = await priceCalculator.impliedVolRate()
        expect(impliedVolRateAfter).to.be.eq(BN.from(11000))
      })
    })

    describe("calculateTotalPremium", async () => {
      it("should return correct values for OOM options", async () => {
        const feeResponseCall = await priceCalculator.calculateTotalPremium(
          BN.from("2592000"),
          BN.from(ethers.utils.parseUnits("1")),
          BN.from("260000000000"),
          true,
          8
        )
        expect(feeResponseCall.settlementFee.add(feeResponseCall.premium)).to.be.eq("9207709")

        const feeResponsePut = await priceCalculator.calculateTotalPremium(
          BN.from("2592000"),
          BN.from(ethers.utils.parseUnits("1")),
          BN.from("240000000000"),
          false,
          8
        )
        expect(feeResponsePut.settlementFee.add(feeResponsePut.premium)).to.be.eq("7713424")
      })
    })
  })
})
