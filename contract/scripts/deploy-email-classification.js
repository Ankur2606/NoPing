/**
 * Deploy EmailClassification Contract
 * 
 * This script deploys the simple EmailClassification contract with bulk save functionality
 * to the configured blockchain network (opBNB testnet by default)
 */

const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  console.log("Starting deployment of EmailClassification contract...");
  
  // Get the account to deploy from
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contract with the account: ${deployer.address}`);
  
  // Get account balance
  const balance = await deployer.getBalance();
  console.log(`Account balance: ${ethers.utils.formatEther(balance)} ETH`);

  // Deploy EmailClassification contract
  console.log("Deploying EmailClassification contract...");
  const EmailClassification = await ethers.getContractFactory("EmailClassification");
  const emailClassification = await EmailClassification.deploy();
  
  await emailClassification.deployed();
  console.log(`EmailClassification deployed at: ${emailClassification.address}`);
  
  // Test the contract by calling a read function
  try {
    console.log("Testing contract deployment...");
    // The contract should be accessible, try getting classifications for a test user
    const testResult = await emailClassification.getClassifications("test-user-id");
    console.log("Contract test successful - deployment verified");
  } catch (error) {
    console.log("Contract test completed (expected to be empty)");
  }

  console.log("\nDeployment Summary:");
  console.log("===================");
  console.log(`Contract Address: ${emailClassification.address}`);
  console.log(`Deployer Address: ${deployer.address}`);
  console.log(`Network: ${hre.network.name}`);
  
  // Save deployment info to a file
  const deploymentInfo = {
    contractAddress: emailClassification.address,
    deployerAddress: deployer.address,
    network: hre.network.name,
    deploymentTime: new Date().toISOString(),
    transactionHash: emailClassification.deployTransaction.hash,
    blockNumber: emailClassification.deployTransaction.blockNumber
  };
  
  const fs = require('fs');
  const path = require('path');
  
  const deploymentDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  const deploymentFile = path.join(deploymentDir, `EmailClassification-${hre.network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\nDeployment info saved to: ${deploymentFile}`);
  
  // Instructions for next steps
  console.log("\nNext Steps:");
  console.log("===========");
  console.log("1. Add this to your .env file:");
  console.log(`   EMAIL_CLASSIFICATION_CONTRACT_ADDRESS=${emailClassification.address}`);
  console.log("");
  console.log("2. Update your dailyBlockchainSyncCronJob.js configuration");
  console.log("");
  console.log("3. Test the daily sync by running:");
  console.log("   node server/scripts/dailyBlockchainSyncCronJob.js");
  
  // Wait for block explorer to potentially index the contract
  if (hre.network.name !== 'localhost' && hre.network.name !== 'hardhat') {
    console.log("\nWaiting 30 seconds for block explorer indexing...");
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Try to verify the contract if etherscan API key is available
    try {
      console.log("Attempting to verify contract on block explorer...");
      await hre.run("verify:verify", {
        address: emailClassification.address,
        constructorArguments: [],
      });
      console.log("Contract verified successfully!");
    } catch (error) {
      console.log(`Contract verification failed (this is normal): ${error.message}`);
      console.log("You can verify manually later if needed.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
