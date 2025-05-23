const { ethers } = require("hardhat");

async function main() {
  // This script sets up a test scenario with sample payments
  const [owner, feeCollector, user1, user2] = await ethers.getSigners();
  
  console.log("Setting up test scenario with accounts:");
  console.log("- Owner:", owner.address);
  console.log("- Fee Collector:", feeCollector.address);
  console.log("- Test User 1:", user1.address);
  console.log("- Test User 2:", user2.address);

  // Deploy PaymentProcessor
  const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
  const feePercentage = 200; // 2%
  const paymentProcessor = await PaymentProcessor.deploy(feeCollector.address, feePercentage);
  await paymentProcessor.deployed();
  console.log("PaymentProcessor deployed to:", paymentProcessor.address);

  // Process a few test payments
  const payment1Amount = ethers.utils.parseEther("0.1"); // 0.1 BNB
  const payment1Metadata = JSON.stringify({
    orderId: "TEST001",
    service: "standard_subscription",
    duration: "monthly",
    userId: "user123"
  });
  
  const payment2Amount = ethers.utils.parseEther("0.25"); // 0.25 BNB
  const payment2Metadata = JSON.stringify({
    orderId: "TEST002",
    service: "premium_subscription",
    duration: "quarterly",
    userId: "user456"
  });

  console.log("Processing test payments...");
  
  // Payment 1 from user1
  const tx1 = await paymentProcessor.connect(user1).processPayment(payment1Metadata, {
    value: payment1Amount
  });
  await tx1.wait();
  console.log(`Payment 1 processed - ID: 1, Amount: 0.1 BNB, From: ${user1.address}`);
  
  // Payment 2 from user2
  const tx2 = await paymentProcessor.connect(user2).processPayment(payment2Metadata, {
    value: payment2Amount
  });
  await tx2.wait();
  console.log(`Payment 2 processed - ID: 2, Amount: 0.25 BNB, From: ${user2.address}`);

  // Display payment records
  const payment1 = await paymentProcessor.getPayment(1);
  const payment2 = await paymentProcessor.getPayment(2);
  
  console.log("\nPayment Records:");
  console.log("Payment 1:", {
    id: payment1.id.toString(),
    payer: payment1.payer,
    amount: ethers.utils.formatEther(payment1.amount),
    timestamp: new Date(payment1.timestamp.toNumber() * 1000).toLocaleString(),
    status: ["Pending", "Completed", "Refunded", "Failed"][payment1.status],
    metadata: payment1.metadata
  });
  
  console.log("Payment 2:", {
    id: payment2.id.toString(),
    payer: payment2.payer,
    amount: ethers.utils.formatEther(payment2.amount),
    timestamp: new Date(payment2.timestamp.toNumber() * 1000).toLocaleString(),
    status: ["Pending", "Completed", "Refunded", "Failed"][payment2.status],
    metadata: payment2.metadata
  });

  // Check fee distribution
  const feeCollectorBalance = await ethers.provider.getBalance(feeCollector.address);
  console.log(`\nFee collector balance: ${ethers.utils.formatEther(feeCollectorBalance)} BNB`);
  
  console.log("\nTest scenario setup complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
