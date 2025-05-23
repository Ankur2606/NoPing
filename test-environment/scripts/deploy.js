const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy AccessControl
  const AccessControl = await ethers.getContractFactory("AccessControl");
  const accessControl = await AccessControl.deploy();
  await accessControl.deployed();
  console.log("AccessControl deployed to:", accessControl.address);

  // Deploy PaymentProcessor with the fee collector address (using deployer for now)
  const feePercentage = process.env.FEE_PERCENTAGE || 200; // 2% default
  const feeCollectorAddress = process.env.FEE_COLLECTOR_ADDRESS || deployer.address;
  
  const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
  const paymentProcessor = await PaymentProcessor.deploy(feeCollectorAddress, feePercentage);
  await paymentProcessor.deployed();
  console.log("PaymentProcessor deployed to:", paymentProcessor.address);
  console.log("Fee collector set to:", await paymentProcessor.feeCollector());
  console.log("Fee percentage set to:", (await paymentProcessor.feePercentage()).toString(), "basis points");

  // Deploy other contracts as needed
  // TODO: Add SubscriptionManager and EscrowContract deployment
  
  console.log("Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
