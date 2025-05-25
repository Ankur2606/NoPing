const hre = require("hardhat");

async function main() {
  const EmailClassification = await hre.ethers.getContractFactory("EmailClassification");
  const emailClassification = await EmailClassification.deploy();

  await emailClassification.deployed();
  console.log("Contract deployed to:", emailClassification.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
