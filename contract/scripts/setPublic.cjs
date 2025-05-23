const { ethers } = require("hardhat");

async function main() {
  // Replace these with actual deployed contract addresses
  const paymentProcessorAddress = "0x7BBB1ff2D99de75Ddaa5bBbb0892763c708606c2";
  const newPayee = "0xCA204e687aF2ddAa492B8ca51a02Af5618433cB3";
  const newFeeCollector = "0xCA204e687aF2ddAa492B8ca51a02Af5618433cB3";
  const newFeePercentage = 0; // 3.00%

  const [admin] = await ethers.getSigners(); // Admin must be contract owner

  const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
  const paymentProcessor = await PaymentProcessor.attach(paymentProcessorAddress);

  // Update Payee Address
  const tx1 = await paymentProcessor.connect(admin).updatePayeeAddress(newPayee);
  await tx1.wait();
  console.log("✅ Payee address updated to:", newPayee);

  // Update Fee Collector
  const tx2 = await paymentProcessor.connect(admin).updateFeeCollector(newFeeCollector);
  await tx2.wait();
  console.log("✅ Fee collector updated to:", newFeeCollector);

  // Update Fee Percentage
  const tx3 = await paymentProcessor.connect(admin).updateFeePercentage(newFeePercentage);
  await tx3.wait();
  console.log("✅ Platform fee percentage updated to:", newFeePercentage, "basis points");
}

main().catch((error) => {
  console.error("❌ Error executing admin actions:", error);
  process.exitCode = 1;
});
