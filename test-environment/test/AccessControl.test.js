const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AccessControl Contract", function () {
  let AccessControl;
  let accessControl;
  let owner, admin, paymentManager, subscriptionManager, user;

  // Role constant hashes
  const ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ADMIN_ROLE"));
  const PAYMENT_MANAGER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PAYMENT_MANAGER_ROLE"));
  const SUBSCRIPTION_MANAGER_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("SUBSCRIPTION_MANAGER_ROLE"));

  beforeEach(async function () {
    // Get signers
    [owner, admin, paymentManager, subscriptionManager, user] = await ethers.getSigners();
    
    // Deploy AccessControl contract
    AccessControl = await ethers.getContractFactory("AccessControl");
    accessControl = await AccessControl.deploy();
    await accessControl.deployed();
  });

  describe("Deployment", function () {
    it("Should set the deployer as owner", async function () {
      expect(await accessControl.owner()).to.equal(owner.address);
    });

    it("Should assign ADMIN_ROLE to owner", async function () {
      expect(await accessControl.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Role Management", function () {
    it("Should grant roles correctly", async function () {
      // Grant roles
      await accessControl.grantRole(ADMIN_ROLE, admin.address);
      await accessControl.grantRole(PAYMENT_MANAGER_ROLE, paymentManager.address);
      await accessControl.grantRole(SUBSCRIPTION_MANAGER_ROLE, subscriptionManager.address);
      
      // Verify roles
      expect(await accessControl.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
      expect(await accessControl.hasRole(PAYMENT_MANAGER_ROLE, paymentManager.address)).to.be.true;
      expect(await accessControl.hasRole(SUBSCRIPTION_MANAGER_ROLE, subscriptionManager.address)).to.be.true;
    });

    it("Should not duplicate role assignments", async function () {
      // Grant role
      await accessControl.grantRole(ADMIN_ROLE, admin.address);
      
      // Check role is assigned
      expect(await accessControl.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
      
      // Grant same role again and verify it remains assigned
      await accessControl.grantRole(ADMIN_ROLE, admin.address);
      expect(await accessControl.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should revoke roles correctly", async function () {
      // Grant role
      await accessControl.grantRole(ADMIN_ROLE, admin.address);
      expect(await accessControl.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
      
      // Revoke role
      await accessControl.revokeRole(ADMIN_ROLE, admin.address);
      expect(await accessControl.hasRole(ADMIN_ROLE, admin.address)).to.be.false;
    });

    it("Should allow self-renunciation of roles", async function () {
      // Grant role
      await accessControl.grantRole(PAYMENT_MANAGER_ROLE, user.address);
      expect(await accessControl.hasRole(PAYMENT_MANAGER_ROLE, user.address)).to.be.true;
      
      // Renounce role
      await accessControl.connect(user).renounceRole(PAYMENT_MANAGER_ROLE);
      expect(await accessControl.hasRole(PAYMENT_MANAGER_ROLE, user.address)).to.be.false;
    });
  });

  describe("Access Control", function () {
    beforeEach(async function () {
      // Grant admin role to admin account
      await accessControl.grantRole(ADMIN_ROLE, admin.address);
    });

    it("Should allow admin to grant roles", async function () {
      await accessControl.connect(admin).grantRole(PAYMENT_MANAGER_ROLE, user.address);
      expect(await accessControl.hasRole(PAYMENT_MANAGER_ROLE, user.address)).to.be.true;
    });

    it("Should allow admin to revoke roles", async function () {
      // First grant role
      await accessControl.grantRole(PAYMENT_MANAGER_ROLE, user.address);
      
      // Then revoke as admin
      await accessControl.connect(admin).revokeRole(PAYMENT_MANAGER_ROLE, user.address);
      expect(await accessControl.hasRole(PAYMENT_MANAGER_ROLE, user.address)).to.be.false;
    });

    it("Should prevent non-admins from granting roles", async function () {
      await expect(
        accessControl.connect(user).grantRole(PAYMENT_MANAGER_ROLE, user.address)
      ).to.be.revertedWith("AccessControl: caller does not have required role");
    });

    it("Should prevent non-admins from revoking roles", async function () {
      // First grant role
      await accessControl.grantRole(PAYMENT_MANAGER_ROLE, paymentManager.address);
      
      // Attempt to revoke as non-admin
      await expect(
        accessControl.connect(user).revokeRole(PAYMENT_MANAGER_ROLE, paymentManager.address)
      ).to.be.revertedWith("AccessControl: caller does not have required role");
    });
  });

  describe("Ownership Management", function () {
    it("Should transfer ownership correctly", async function () {
      await accessControl.transferOwnership(user.address);
      expect(await accessControl.owner()).to.equal(user.address);
      
      // New owner should have admin role
      expect(await accessControl.hasRole(ADMIN_ROLE, user.address)).to.be.true;
    });

    it("Should reject zero address for ownership transfer", async function () {
      await expect(
        accessControl.transferOwnership(ethers.constants.AddressZero)
      ).to.be.revertedWith("AccessControl: new owner cannot be zero address");
    });

    it("Should prevent non-owners from transferring ownership", async function () {
      await expect(
        accessControl.connect(user).transferOwnership(user.address)
      ).to.be.revertedWith("AccessControl: caller is not the owner");
    });
  });

  describe("Events", function () {
    it("Should emit RoleGranted event", async function () {
      await expect(accessControl.grantRole(PAYMENT_MANAGER_ROLE, user.address))
        .to.emit(accessControl, "RoleGranted")
        .withArgs(PAYMENT_MANAGER_ROLE, user.address, owner.address);
    });

    it("Should emit RoleRevoked event", async function () {
      // First grant role
      await accessControl.grantRole(PAYMENT_MANAGER_ROLE, user.address);
      
      // Then check event on revoke
      await expect(accessControl.revokeRole(PAYMENT_MANAGER_ROLE, user.address))
        .to.emit(accessControl, "RoleRevoked")
        .withArgs(PAYMENT_MANAGER_ROLE, user.address, owner.address);
    });

    it("Should emit OwnershipTransferred event", async function () {
      await expect(accessControl.transferOwnership(user.address))
        .to.emit(accessControl, "OwnershipTransferred")
        .withArgs(owner.address, user.address);
    });
  });
});
