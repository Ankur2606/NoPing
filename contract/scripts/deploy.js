const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);

  // Deploy AccessControl
  const AccessControl = await hre.ethers.getContractFactory("AccessControl");
  const accessControl = await AccessControl.deploy();
  await accessControl.deployed(); // Use deployed() instead of waitForDeployment()
  console.log("AccessControl deployed at:", accessControl.address); // Use .address instead of .target

  // Deploy PaymentProcessor with AccessControl address and initial payee
  const PaymentProcessor = await hre.ethers.getContractFactory("PaymentProcessor");
  const paymentProcessor = await PaymentProcessor.deploy(
    accessControl.address, // Use .address instead of .target
    deployer.address
  );
  await paymentProcessor.deployed(); // Use deployed() instead of waitForDeployment()
  console.log("PaymentProcessor deployed at:", paymentProcessor.address); // Use .address instead of .target
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
