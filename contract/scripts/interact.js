const { ethers } = require("hardhat");

async function main() {
  const [owner, payer, feeCollector, newPayee] = await ethers.getSigners();

  const AccessControlFactory = await ethers.getContractFactory("AccessControl");
  const accessControl = await AccessControlFactory.deploy();
  await accessControl.deployed();

  const PaymentProcessorFactory = await ethers.getContractFactory("PaymentProcessor");
  const paymentProcessor = await PaymentProcessorFactory.deploy(
    accessControl.address,
    owner.address
  );
  await paymentProcessor.deployed();

  await paymentProcessor.updateFeeCollector(feeCollector.address);

  // Process a payment
  const paymentAmount = ethers.utils.parseEther("1.0");
  await paymentProcessor.connect(payer).processPayment("test-reference", "{}", { value: paymentAmount });

  // Store and check payment details
  const details = await paymentProcessor.getPaymentDetails(0);
  console.log("Payment Details:", details);

  // Update fee percentage
  await paymentProcessor.updateFeePercentage(300); // 3%

  // Process another payment with updated fee
  await paymentProcessor.connect(payer).processPayment("new-fee", "{}", { value: paymentAmount });

  // Update fee collector and verify
  await paymentProcessor.updateFeeCollector(newPayee.address);
  console.log("Updated Fee Collector:", await paymentProcessor.feeCollector());

  // Update payee address and process payment
  await paymentProcessor.updatePayeeAddress(newPayee.address);
  console.log("Updated Payee Address:", await paymentProcessor.payeeAddress());
  await paymentProcessor.connect(payer).processPayment("new-payee", "{}", { value: paymentAmount });

  // Grant refund role and refund a payment
  const PAYMENT_PROCESSOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PAYMENT_PROCESSOR_ROLE"));
  await accessControl.grantRole(PAYMENT_PROCESSOR_ROLE, owner.address);
  await paymentProcessor.refundPayment(0, { value: paymentAmount });

  // Get user payment history
  const history = await paymentProcessor.getUserPayments(payer.address);
  console.log("User Payment History:", history);
}

main().catch(console.error);
