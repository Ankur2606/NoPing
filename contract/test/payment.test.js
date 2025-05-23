const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaymentProcessor", function () {
  let accessControl, paymentProcessor;
  let owner, payer, feeCollector, newPayee;

  beforeEach(async () => {
    [owner, payer, feeCollector, newPayee] = await ethers.getSigners();

    const AccessControlFactory = await ethers.getContractFactory("AccessControl");
    accessControl = await AccessControlFactory.deploy();
    // Update deployment pattern to be compatible with older hardhat versions
    await accessControl.deployed();

    const PaymentProcessorFactory = await ethers.getContractFactory("PaymentProcessor");
    paymentProcessor = await PaymentProcessorFactory.deploy(
      accessControl.address,  // Use .address instead of getAddress()
      owner.address          // Use .address instead of getAddress()
    );
    await paymentProcessor.deployed();

    await paymentProcessor.updateFeeCollector(feeCollector.address);
  });

  it("should process a payment", async () => {
    const paymentAmount = ethers.utils.parseEther("1.0"); // Use ethers.utils.parseEther for older versions

    const tx = await paymentProcessor.connect(payer).processPayment(
      "test-reference",
      "{}",
      { value: paymentAmount }
    );

    await tx.wait();

    const userPayments = await paymentProcessor.getUserPayments(payer.address);
    expect(userPayments.length).to.equal(1);
  });
  
  it("should store correct payment details", async () => {
    const paymentAmount = ethers.utils.parseEther("1.0");
    const reference = "order-123";
    const metadata = '{"productId":"abc123"}';
    
    await paymentProcessor.connect(payer).processPayment(reference, metadata, { value: paymentAmount });
    
    const paymentId = 0; // First payment ID
    const paymentDetails = await paymentProcessor.getPaymentDetails(paymentId);
    
    expect(paymentDetails.id).to.equal(paymentId);
    expect(paymentDetails.payer).to.equal(payer.address);
    expect(paymentDetails.payee).to.equal(owner.address);
    expect(paymentDetails.amount).to.equal(paymentAmount);
    expect(paymentDetails.referencer).to.equal(reference);
    expect(paymentDetails.status).to.equal(1); // PaymentStatus.Completed (0=Pending, 1=Completed, 2=Failed, 3=Refunded)
    expect(paymentDetails.metadata).to.equal(metadata);
  });
  
  it("should calculate and transfer fees correctly", async () => {
    const paymentAmount = ethers.utils.parseEther("1.0");
    const feePercentage = 250; // 2.5%
    // Use BigNumber for calculations in older versions
    const expectedFeeAmount = paymentAmount.mul(feePercentage).div(10000);
    const expectedPayeeAmount = paymentAmount.sub(expectedFeeAmount);
    
    const feeCollectorBalanceBefore = await ethers.provider.getBalance(feeCollector.address);
    const payeeBalanceBefore = await ethers.provider.getBalance(owner.address);
    
    await paymentProcessor.connect(payer).processPayment("test-fee", "{}", { value: paymentAmount });
    
    const feeCollectorBalanceAfter = await ethers.provider.getBalance(feeCollector.address);
    const payeeBalanceAfter = await ethers.provider.getBalance(owner.address);
    
    // Check fee collector received correct fee
    expect(feeCollectorBalanceAfter.sub(feeCollectorBalanceBefore)).to.equal(expectedFeeAmount);
    
    // Check payee received correct amount
    expect(payeeBalanceAfter.sub(payeeBalanceBefore)).to.equal(expectedPayeeAmount);
  });
  
  it("should update fee percentage", async () => {
    const newFeePercentage = 300; // 3%
    
    await paymentProcessor.updateFeePercentage(newFeePercentage);
    
    expect(await paymentProcessor.platformFeePercentage()).to.equal(newFeePercentage);
    
    // Test with new fee percentage
    const paymentAmount = ethers.utils.parseEther("1.0");
    const expectedFeeAmount = paymentAmount.mul(newFeePercentage).div(10000);
    
    const feeCollectorBalanceBefore = await ethers.provider.getBalance(feeCollector.address);
    
    await paymentProcessor.connect(payer).processPayment("test-new-fee", "{}", { value: paymentAmount });
    
    const feeCollectorBalanceAfter = await ethers.provider.getBalance(feeCollector.address);
    
    expect(feeCollectorBalanceAfter.sub(feeCollectorBalanceBefore)).to.equal(expectedFeeAmount);
  });
  
  it("should update fee collector", async () => {
    const newFeeCollectorAddress = newPayee.address;
    
    await paymentProcessor.updateFeeCollector(newFeeCollectorAddress);
    
    expect(await paymentProcessor.feeCollector()).to.equal(newFeeCollectorAddress);
    
    // Test payment with new fee collector
    const paymentAmount = ethers.utils.parseEther("1.0");
    const feePercentage = await paymentProcessor.platformFeePercentage();
    const expectedFeeAmount = paymentAmount.mul(feePercentage).div(10000);
    
    const newFeeCollectorBalanceBefore = await ethers.provider.getBalance(newFeeCollectorAddress);
    
    await paymentProcessor.connect(payer).processPayment("test-new-collector", "{}", { value: paymentAmount });
    
    const newFeeCollectorBalanceAfter = await ethers.provider.getBalance(newFeeCollectorAddress);
    
    expect(newFeeCollectorBalanceAfter.sub(newFeeCollectorBalanceBefore)).to.equal(expectedFeeAmount);
  });
  
  it("should update payee address", async () => {
    const newPayeeAddress = newPayee.address;
    
    await paymentProcessor.updatePayeeAddress(newPayeeAddress);
    
    expect(await paymentProcessor.payeeAddress()).to.equal(newPayeeAddress);
    
    // Test payment with new payee
    const paymentAmount = ethers.utils.parseEther("1.0");
    const feePercentage = await paymentProcessor.platformFeePercentage();
    const expectedFeeAmount = paymentAmount.mul(feePercentage).div(10000);
    const expectedPayeeAmount = paymentAmount.sub(expectedFeeAmount);
    
    const newPayeeBalanceBefore = await ethers.provider.getBalance(newPayeeAddress);
    
    await paymentProcessor.connect(payer).processPayment("test-new-payee", "{}", { value: paymentAmount });
    
    const newPayeeBalanceAfter = await ethers.provider.getBalance(newPayeeAddress);
    
    expect(newPayeeBalanceAfter.sub(newPayeeBalanceBefore)).to.equal(expectedPayeeAmount);
  });
  
  it("should refund payment", async () => {
    // First process a payment
    const paymentAmount = ethers.utils.parseEther("1.0");
    await paymentProcessor.connect(payer).processPayment("refund-test", "{}", { value: paymentAmount });
    
    // Get initial balances
    const payerBalanceBefore = await ethers.provider.getBalance(payer.address);
    
    // Set up PAYMENT_PROCESSOR_ROLE for owner to refund
    const PAYMENT_PROCESSOR_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PAYMENT_PROCESSOR_ROLE"));
    await accessControl.grantRole(PAYMENT_PROCESSOR_ROLE, owner.address);
    
    // Refund the payment
    const paymentId = 0;
    await paymentProcessor.refundPayment(paymentId, { value: paymentAmount });
    
    // Verify refund was received
    const payerBalanceAfter = await ethers.provider.getBalance(payer.address);
    expect(payerBalanceAfter.sub(payerBalanceBefore)).to.equal(paymentAmount);
    
    // Verify payment status was updated
    const paymentDetails = await paymentProcessor.getPaymentDetails(paymentId);
    expect(paymentDetails.status).to.equal(3); // PaymentStatus.Refunded
  });
  
  it("should get user payment history", async () => {
    // Process multiple payments
    const paymentAmount = ethers.utils.parseEther("0.5");
    
    await paymentProcessor.connect(payer).processPayment("payment-1", "{}", { value: paymentAmount });
    await paymentProcessor.connect(payer).processPayment("payment-2", "{}", { value: paymentAmount });
    
    const userPayments = await paymentProcessor.getUserPayments(payer.address);
    
    expect(userPayments.length).to.equal(2);
    expect(userPayments[0]).to.equal(0);
    expect(userPayments[1]).to.equal(1);
  });
});
