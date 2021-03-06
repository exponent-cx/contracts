// Copyright (C) 2021 Exponent

// This file is part of Exponent.

// Exponent is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Exponent is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Exponent.  If not, see <http://www.gnu.org/licenses/>.

import { ethers, waffle, artifacts } from "hardhat";
import { expect } from "chai";
import { randomAddress } from "./utils/address";
const { deployMockContract } = waffle;

describe("XPNCore", function () {
  beforeEach("deploy contract", async function () {
    [this.deployer, this.admin, this.settler, this.settler2] =
      await ethers.getSigners();
    this.mockAddress = randomAddress();
    const MockToken = await artifacts.readArtifact("IERC20");
    this.shares = await deployMockContract(this.deployer, MockToken.abi);
    this.weth = await deployMockContract(this.deployer, MockToken.abi);

    // deploy integration manager mock
    const Intmanager = await artifacts.readArtifact("IIntegrationManager");
    this.intmanager = await deployMockContract(this.deployer, Intmanager.abi);
    // deploy policy manager mock
    const Policymanager = await artifacts.readArtifact("IPolicyManager");
    this.policymanager = await deployMockContract(
      this.deployer,
      Policymanager.abi
    );

    // deploy comptroller mock
    const Comptroller = await artifacts.readArtifact("IComptroller");
    this.comptroller = await deployMockContract(this.deployer, Comptroller.abi);
    // deploy fund deployer
    const Funddeployer = await artifacts.readArtifact("IFundDeployer");
    this.funddeployer = await deployMockContract(
      this.deployer,
      Funddeployer.abi
    );

    const Signal = await artifacts.readArtifact("ISignal");
    this.signal = await deployMockContract(this.deployer, Signal.abi);
    const Util = await ethers.getContractFactory("XPNUtils");
    this.util = await Util.deploy();
    await this.util.deployed();
    const Core = await ethers.getContractFactory("IntXPNCoreSpy", {
      libraries: {
        XPNUtils: this.util.address,
      },
    });
    this.whitelistPolicy = randomAddress(); // mock addr
    this.trackedAssetAdapterAddress = randomAddress(); // mock addr
    const constructorArgs = [
      this.admin.address,
      this.settler.address,
      this.signal.address,
      "signal1",
      this.weth.address,
      "ETH", // ETH denominated
      this.funddeployer.address,
      this.intmanager.address,
      this.trackedAssetAdapterAddress,
      this.policymanager.address,
      this.whitelistPolicy,
      this.mockAddress,
      this.mockAddress,
      [],
      "EX-ETH",
    ];

    await this.funddeployer.mock.createNewFund.returns(
      this.comptroller.address,
      this.shares.address
    );
    await this.signal.mock.getSignalSymbols
      .withArgs("signal1")
      .returns(["ETH"]);
    await this.intmanager.mock.addAuthUserForFund.returns();
    await this.policymanager.mock.enablePolicyForFund.returns();

    this.core = await Core.deploy(constructorArgs, "EX-ETH", "EX-ETH");
    await this.core.deployed();
  });

  describe("addTrackedAssets", async function () {
    it("is called successfully", async function () {
      await this.signal.mock.getSignalSymbols
        .withArgs("signal1")
        .returns(["ETH"]);
      await this.comptroller.mock.callOnExtension.returns();
      await this.core.addTrackedAsset(this.mockAddress)
    });
    it("is reverted when thrown", async function () {
      await this.comptroller.mock.callOnExtension.reverts();
      await expect(this.core.addTrackedAsset(this.mockAddress)).to.be.reverted;
    });
  });

  describe("removeTrackedAssets", async function () {
    it("is reverted when thrown", async function () {
      await this.comptroller.mock.callOnExtension.reverts();
      await expect(this.core.removeTrackedAsset(this.mockAddress)).to.be
        .reverted;
    });
    it("is called successfully", async function () {
      await this.comptroller.mock.callOnExtension.returns();
      await this.core.removeTrackedAsset(this.mockAddress)
    });
  });

  describe("depositHook", async function () {
    it("is called successfully", async function () {
      await this.intmanager.mock.addAuthUserForFund.returns();
      await this.signal.mock.getSignalSymbols
        .withArgs("signal1")
        .returns(["ETH"]);
      const amount = 1000;
      await this.weth.mock.allowance.returns(0);
      await this.weth.mock.approve.returns(true);
      await this.comptroller.mock.buyShares
        .withArgs([this.core.address], [amount], [1])
        .returns([amount]);
      await this.core.depositHook(amount);
    });
    it("is reverted when thrown", async function () {
      const amount = 1000;
      await this.weth.mock.approve.reverts();
      await expect(this.core.depositHook(amount)).to.be.reverted;
    });
  });

  describe("whitelistWallet", async function () {
    it("emits event when successfully whitelisted", async function () {
      await expect(this.core.whitelistWallet(this.mockAddress))
        .to.emit(this.core, "WalletWhitelisted")
        .withArgs(this.mockAddress);
      expect(await this.core.isWalletWhitelist(this.mockAddress)).to.be.true;
    });
  });

  describe("deWhitelistWallet", async function () {
    it("emits an event when successfully dewhitelisted", async function () {
      await expect(this.core.deWhitelistWallet(this.mockAddress))
        .to.emit(this.core, "WalletDeWhitelisted")
        .withArgs(this.mockAddress);
      expect(await this.core.isWalletWhitelist(this.mockAddress)).to.be.false;
    });
  });


  describe("whitelistVenue", async function () {
    it("emits event when successfully whitelisted", async function () {
      await expect(this.core.whitelistVenue(this.mockAddress))
        .to.emit(this.core, "VenueWhitelisted")
        .withArgs(this.mockAddress);
      expect(await this.core.isVenueWhitelist(this.mockAddress)).to.be.true;
    });
  });

  describe("deWhitelistVenue", async function () {
    it("emits an event when successfully dewhitelisted", async function () {
      await expect(this.core.deWhitelistVenue(this.mockAddress))
        .to.emit(this.core, "VenueDeWhitelisted")
        .withArgs(this.mockAddress);
      expect(await this.core.isVenueWhitelist(this.mockAddress)).to.be.false;
    });
  });

  describe("whitelistAsset", async function () {
    it("emits event when successfully whitelisted", async function () {
      await expect(this.core.whitelistAsset(this.mockAddress))
        .to.emit(this.core, "AssetWhitelisted")
        .withArgs(this.mockAddress);
      expect(await this.core.isAssetWhitelist(this.mockAddress)).to.be.true;
    });
  });

  describe("deWhitelistAsset", async function () {
    it("emits an event when successfully dewhitelisted", async function () {
      await expect(this.core.deWhitelistAsset(this.mockAddress))
        .to.emit(this.core, "AssetDeWhitelisted")
        .withArgs(this.mockAddress);
      expect(await this.core.isAssetWhitelist(this.mockAddress)).to.be.false;
    });
  });

  describe("stateGetters", async function () {
    it("can fetch the correct internal addresses", async function () {
      expect(await this.core.getPolicyAddress()).to.be.equal(
        this.policymanager.address
      );
      expect(await this.core.getWhitelistPolicyAddress()).to.be.equal(
        this.whitelistPolicy
      );
      expect(await this.core.getTrackedAssetAddress()).to.be.equal(
        this.trackedAssetAdapterAddress
      );
      expect(await this.core.getIntegrationManagerAddress()).to.be.equal(
        this.intmanager.address
      );
      expect(await this.core.getDeployerAddress()).to.be.equal(
        this.funddeployer.address
      );
    });
  });

  describe("submitTrade", async function () {
    it("is reverted when thrown", async function () {
      await this.comptroller.mock.callOnExtension.reverts();
      await expect(this.core.submitTrade("", this.weth.address)).to.be.reverted;
    });
    it("is called successfully", async function () {
      await this.comptroller.mock.callOnExtension.returns();
      await this.core.submitTrade("0x", this.weth.address);
    });
  });

  describe("redeemFeesHook", async function () {
    it("is called successfully", async function () {
      await this.comptroller.mock.callOnExtension.returns();
      await this.core.redeemFeesHook(this.mockAddress, [this.mockAddress]);
    });
    it("is reverted when thrown", async function () {
      await this.comptroller.mock.callOnExtension.reverts();
      await expect(
        this.core.redeemFeesHook(this.mockAddress, [this.mockAddress])
      ).to.be.reverted;
    });
  });

  describe("addAssetConfig", async function () {
    it("adds a new asset config successfully", async function () {
      const btc = randomAddress();
      const btcFeed = randomAddress();
      await expect(this.core.addAssetConfig("BTC", btc, btcFeed))
        .to.emit(this.core, "AssetConfigAdded")
        .withArgs("BTC", btc, btcFeed);
      expect(await this.core.getAssetConfig("BTC")).to.deep.equal([
        btc,
        btcFeed,
      ]);
    });
  });

  describe("removeAssetConfig", async function () {
    it("removes an asset config successfully", async function () {
      const btc = randomAddress();
      const btcFeed = randomAddress();
      await this.core.addAssetConfig("BTC", btc, btcFeed);
      await expect(this.core.removeAssetConfig("BTC"))
        .to.emit(this.core, "AssetConfigRemoved")
        .withArgs("BTC");
      expect(await this.core.getAssetConfig("BTC")).to.deep.equal([
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
      ]);
    });
  });

  describe("verifySignal", async function () {
    it("is called successfully for denom asset", async function () {
      await this.signal.mock.getSignalSymbols
        .withArgs("signal1")
        .returns(["ETH"]);
      await this.core.verifySignal(this.signal.address, "signal1");
    });
    it("is reverted when a symbol is not registered", async function () {
      await this.signal.mock.getSignalSymbols
        .withArgs("signal1")
        .returns(["SHIB"]);
      await expect(
        this.core.verifySignal(this.signal.address, "signal1")
      ).to.be.revertedWith("XPNCore: token symbol is not registered");
    });
    it("is reverted when non denom asset is not whitelisted", async function () {
      await this.signal.mock.getSignalSymbols
        .withArgs("signal1")
        .returns(["BTC"]);
      const btc = randomAddress();
      const btcFeed = randomAddress();
      await this.core.addAssetConfig("BTC", btc, btcFeed);
      await expect(
        this.core.verifySignal(this.signal.address, "signal1")
      ).to.be.revertedWith("XPNCore: token is not whitelisted");
    });
    it("is called sucessfully for non denom asset", async function () {
      await this.signal.mock.getSignalSymbols
        .withArgs("signal1")
        .returns(["BTC"]);
      const btc = randomAddress();
      const btcFeed = randomAddress();
      await this.core.whitelistAsset(btc);
      await this.core.addAssetConfig("BTC", btc, btcFeed);
      await this.core.verifySignal(this.signal.address, "signal1");
    });
  });
});
