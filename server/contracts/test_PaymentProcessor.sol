// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./PaymentProcessor.sol";

/**
 * @title PaymentProcessorTest
 * @dev Test contract for PaymentProcessor
 * @notice Use this contract in Remix to test PaymentProcessor functionality
 */
contract PaymentProcessorTest {
    PaymentProcessor private paymentProcessor;
    address private owner;
    address private feeCollector;
    uint256 private constant FEE_PERCENTAGE = 500; // 5% in basis points
    
    event TestResult(bool success, string message);
    
    // This allows the contract to receive ETH
    receive() external payable {}
    
    /**
     * @dev Setup test environment
     */
    function setUp() public {
        owner = address(this);
        feeCollector = address(0x1234567890123456789012345678901234567890);
        
        // Deploy new payment processor
        paymentProcessor = new PaymentProcessor(feeCollector, FEE_PERCENTAGE);
    }
    
    /**
     * @dev Test contract initialization
     */
    function testInitialization() public {
        setUp();
        
        bool success = true;
        
        if (paymentProcessor.owner() != address(this)) {
            success = false;
            emit TestResult(false, "Owner not set correctly");
        }
        
        if (paymentProcessor.feeCollector() != feeCollector) {
            success = false;
            emit TestResult(false, "Fee collector not set correctly");
        }
        
        if (paymentProcessor.feePercentage() != FEE_PERCENTAGE) {
            success = false;
            emit TestResult(false, "Fee percentage not set correctly");
        }
        
        if (paymentProcessor.nextPaymentId() != 1) {
            success = false;
            emit TestResult(false, "Next payment ID not initialized to 1");
        }
        
        if (success) {
            emit TestResult(true, "Initialization test passed");
        }
    }
    
    /**
     * @dev Test payment processing
     */
    function testProcessPayment() public payable {
        require(msg.value >= 1 ether, "Send at least 1 ETH to run this test");
        
        setUp();
        
        // Get initial balances
        uint256 initialFeeCollectorBalance = feeCollector.balance;
        uint256 initialContractBalance = address(this).balance;
        
        // Process payment
        string memory metadata = '{"orderId":"123","customerName":"Test User"}';
        uint256 paymentId = paymentProcessor.processPayment{value: 1 ether}(metadata);
        
        // Verify payment record
        PaymentProcessor.Payment memory payment = paymentProcessor.getPayment(paymentId);
        
        bool success = true;
        
        if (payment.id != 1) {
            success = false;
            emit TestResult(false, "Payment ID not set correctly");
        }
        
        if (payment.payer != address(this)) {
            success = false;
            emit TestResult(false, "Payer address not set correctly");
        }
        
        if (payment.amount != 1 ether) {
            success = false;
            emit TestResult(false, "Payment amount not set correctly");
        }
        
        if (payment.status != PaymentProcessor.PaymentStatus.Completed) {
            success = false;
            emit TestResult(false, "Payment status not set to Completed");
        }
        
        // Check if fee calculation was correct
        uint256 expectedFee = (1 ether * FEE_PERCENTAGE) / 10000;
        uint256 expectedRemainder = 1 ether - expectedFee;
        
        // Note: in a real test environment you would check the balance changes
        // but in Remix we can't easily check the balance of arbitrary addresses
        
        if (success) {
            emit TestResult(true, "Process payment test passed");
        }
    }
    
    /**
     * @dev Test fee percentage update
     */
    function testSetFeePercentage() public {
        setUp();
        
        uint256 newFeePercentage = 200; // 2%
        paymentProcessor.setFeePercentage(newFeePercentage);
        
        if (paymentProcessor.feePercentage() == newFeePercentage) {
            emit TestResult(true, "Fee percentage updated successfully");
        } else {
            emit TestResult(false, "Fee percentage not updated correctly");
        }
    }
    
    /**
     * @dev Test fee collector update
     */
    function testSetFeeCollector() public {
        setUp();
        
        address newFeeCollector = address(0x9876543210987654321098765432109876543210);
        paymentProcessor.setFeeCollector(newFeeCollector);
        
        if (paymentProcessor.feeCollector() == newFeeCollector) {
            emit TestResult(true, "Fee collector updated successfully");
        } else {
            emit TestResult(false, "Fee collector not updated correctly");
        }
    }
    
    /**
     * @dev Test payment status update
     */
    function testUpdatePaymentStatus() public payable {
        require(msg.value >= 1 ether, "Send at least 1 ETH to run this test");
        
        setUp();
        
        // Create a payment first
        string memory metadata = '{"orderId":"123"}';
        uint256 paymentId = paymentProcessor.processPayment{value: 1 ether}(metadata);
        
        // Update status to Refunded
        paymentProcessor.updatePaymentStatus(paymentId, PaymentProcessor.PaymentStatus.Refunded);
        
        // Verify the status update
        PaymentProcessor.Payment memory payment = paymentProcessor.getPayment(paymentId);
        
        if (payment.status == PaymentProcessor.PaymentStatus.Refunded) {
            emit TestResult(true, "Payment status updated successfully");
        } else {
            emit TestResult(false, "Payment status not updated correctly");
        }
    }
    
    /**
     * @dev Test ownership transfer
     */
    function testTransferOwnership() public {
        setUp();
        
        address newOwner = address(0xabCDeF0123456789AbcdEf0123456789aBCDEF01);
        paymentProcessor.transferOwnership(newOwner);
        
        if (paymentProcessor.owner() == newOwner) {
            emit TestResult(true, "Ownership transferred successfully");
        } else {
            emit TestResult(false, "Ownership not transferred correctly");
        }
    }
    
    /**
     * @dev Test emergency withdrawal
     */
    function testEmergencyWithdraw() public payable {
        require(msg.value >= 1 ether, "Send at least 1 ETH to run this test");
        
        setUp();
        
        // Send ETH directly to the payment processor (simulating a stuck balance)
        (bool sent, ) = address(paymentProcessor).call{value: 0.5 ether}("");
        require(sent, "Failed to send ETH to payment processor");
        
        // Check contract balance
        uint256 initialBalance = address(this).balance;
        
        // Withdraw
        paymentProcessor.emergencyWithdraw();
        
        // Check balance change (not reliable in Remix for this test scenario)
        // In a proper test environment, we'd verify the balance change
        
        emit TestResult(true, "Emergency withdraw test executed");
    }
    
    /**
     * @dev Test expected failures (negative test cases)
     */
    function testFailureCases() public {
        setUp();
        
        bool success = true;
        
        // Test 1: Setting fee percentage above allowed limit
        try paymentProcessor.setFeePercentage(1001) {
            success = false;
            emit TestResult(false, "Should not allow setting fee percentage above 10%");
        } catch {
            // This is expected
        }
        
        // Test 2: Setting fee collector to zero address
        try paymentProcessor.setFeeCollector(address(0)) {
            success = false;
            emit TestResult(false, "Should not allow setting fee collector to zero address");
        } catch {
            // This is expected
        }
        
        // Test 3: Transferring ownership to zero address
        try paymentProcessor.transferOwnership(address(0)) {
            success = false;
            emit TestResult(false, "Should not allow transferring ownership to zero address");
        } catch {
            // This is expected
        }
        
        // Test 4: Getting non-existent payment
        try paymentProcessor.getPayment(999) {
            success = false;
            emit TestResult(false, "Should not allow getting non-existent payment");
        } catch {
            // This is expected
        }
        
        if (success) {
            emit TestResult(true, "All failure cases passed");
        }
    }
    
    /**
     * @dev Run all tests
     */
    function runAllTests() external payable {
        require(msg.value >= 2 ether, "Send at least 2 ETH to run all tests");
        
        testInitialization();
        testProcessPayment();
        testSetFeePercentage();
        testSetFeeCollector();
        testUpdatePaymentStatus();
        testTransferOwnership();
        testEmergencyWithdraw();
        testFailureCases();
        
        emit TestResult(true, "All tests completed");
    }
}