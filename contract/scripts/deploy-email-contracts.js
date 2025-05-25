// Deployment script for EmailClassificationStorage contracts on opBNB
const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment of Email Classification contracts...");
  
  // Get the account to deploy from
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);
  
  // Deploy AccessControl first
  const AccessControl = await ethers.getContractFactory("AccessControl");
  const accessControl = await AccessControl.deploy();
  await accessControl.deployed();
  console.log(`AccessControl deployed at: ${accessControl.address}`);
  
  // Deploy EmailClassificationStorage
  const EmailClassificationStorage = await ethers.getContractFactory("EmailClassificationStorage");
  const emailClassificationStorage = await EmailClassificationStorage.deploy(accessControl.address);
  await emailClassificationStorage.deployed();
  console.log(`EmailClassificationStorage deployed at: ${emailClassificationStorage.address}`);
  
  // Deploy EmailBatchStorage
  const EmailBatchStorage = await ethers.getContractFactory("EmailBatchStorage");
  const emailBatchStorage = await EmailBatchStorage.deploy(accessControl.address);
  await emailBatchStorage.deployed();
  console.log(`EmailBatchStorage deployed at: ${emailBatchStorage.address}`);
  
  // Grant backend role to deployer for testing
  const BACKEND_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BACKEND_ROLE"));
  await accessControl.grantRole(BACKEND_ROLE, deployer.address);
  console.log(`Backend role granted to deployer: ${deployer.address}`);
  
  console.log("\nDeployment complete!");
  console.log("=========================");
  console.log(`AccessControl:            ${accessControl.address}`);
  console.log(`EmailClassificationStorage: ${emailClassificationStorage.address}`);
  console.log(`EmailBatchStorage:          ${emailBatchStorage.address}`);
  
  // Wait for block explorer to index the contracts
  console.log("\nSleeping for 60 seconds to let block explorer index the contracts...");
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  // Verify contracts on block explorer (if API key is set)
  try {
    console.log("\nVerifying contracts on block explorer...");
    
    await hre.run("verify:verify", {
      address: accessControl.address,
      constructorArguments: [],
    });
    
    await hre.run("verify:verify", {
      address: emailClassificationStorage.address,
      constructorArguments: [accessControl.address],
    });
    
    await hre.run("verify:verify", {
      address: emailBatchStorage.address,
      constructorArguments: [accessControl.address],
    });
    
    console.log("Contract verification complete!");
  } catch (error) {
    console.error("Error during contract verification:", error);
  }
}

// Run the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
