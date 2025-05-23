const { ethers } = require("hardhat");
const fs = require("fs");

/**
 * This script deploys contracts to the BSC Testnet
 * Make sure to set your PRIVATE_KEY in the .env file before running
 */

async function main() {
  // Load values from .env
  require('dotenv').config();
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts to BSC Testnet with account:", deployer.address);
  console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "BNB");

  // Deploy AccessControl
  console.log("\nDeploying AccessControl...");
  const AccessControl = await ethers.getContractFactory("AccessControl");
  const accessControl = await AccessControl.deploy();
  await accessControl.deployed();
  console.log("AccessControl deployed to:", accessControl.address);

  // Deploy PaymentProcessor
  console.log("\nDeploying PaymentProcessor...");
  const feePercentage = process.env.FEE_PERCENTAGE || 200; // Default 2%
  const feeCollector = process.env.FEE_COLLECTOR_ADDRESS || deployer.address;
  
  const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
  const paymentProcessor = await PaymentProcessor.deploy(feeCollector, feePercentage);
  await paymentProcessor.deployed();
  
  console.log("PaymentProcessor deployed to:", paymentProcessor.address);
  console.log("Fee collector:", await paymentProcessor.feeCollector());
  console.log("Fee percentage:", (await paymentProcessor.feePercentage()).toString(), "basis points");

  // Save deployment information
  const deployData = {
    network: "bscTestnet",
    chainId: 97,
    deployer: deployer.address,
    AccessControl: accessControl.address,
    PaymentProcessor: paymentProcessor.address,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync("./deployments-testnet.json", JSON.stringify(deployData, null, 2));
  console.log("\n✅ Deployment information saved to deployments-testnet.json");
  
  // Verification instructions
  console.log("\n🔍 To verify contracts on BscScan:");
  console.log(`npx hardhat verify --network bscTestnet ${accessControl.address}`);
  console.log(`npx hardhat verify --network bscTestnet ${paymentProcessor.address} ${feeCollector} ${feePercentage}`);
  
  console.log("\n🎉 Deployment to BSC Testnet complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
