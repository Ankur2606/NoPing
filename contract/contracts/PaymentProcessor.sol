// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AccessControl.sol";

/**
 * @title PaymentProcessor
 * @dev Contract for processing payments on the BNB Chain
 */
contract PaymentProcessor {
    AccessControl private _accessControl;
    
    // Payment status enum
    enum PaymentStatus { Pending, Completed, Failed, Refunded }
    
    // Payment struct to store all payment details
    struct Payment {
        uint256 id;
        address payer;
        address payee;
        uint256 amount;
        uint256 timestamp;
        string referencer;
        PaymentStatus status;
        string metadata; // Additional payment details in JSON format
    }
    
    // Mappings to store payment data
    mapping(uint256 => Payment) public payments;
    mapping(address => uint256[]) public userPayments;
    
    uint256 public paymentCount;
    uint256 public platformFeePercentage; // Basis points (e.g., 250 = 2.5%)
    address public feeCollector;
    
    // Events
    event PaymentCreated(uint256 indexed paymentId, address indexed payer, address indexed payee, uint256 amount);
    event PaymentCompleted(uint256 indexed paymentId, uint256 amount);
    event PaymentFailed(uint256 indexed paymentId, string reason);
    event PaymentRefunded(uint256 indexed paymentId, uint256 amount);
    event FeePercentageUpdated(uint256 oldPercentage, uint256 newPercentage);
    event FeeCollectorUpdated(address oldCollector, address newCollector);
    
    /**
     * @dev Constructor
     * @param accessControlAddress Address of the AccessControl contract
     * @param initialPayeeAddress Address that will receive all payments (can be updated by owner)
     */
    constructor(address accessControlAddress, address initialPayeeAddress) {
        require(accessControlAddress != address(0), "Invalid AccessControl address");
        require(initialPayeeAddress != address(0), "Invalid payee address");
        _accessControl = AccessControl(accessControlAddress);
        paymentCount = 0;
        platformFeePercentage = 250; // Default 2.5%
        feeCollector = msg.sender;
        payeeAddress = initialPayeeAddress;
    }
    
    /**
     * @dev Modifier to restrict access to contract owner
     */
    modifier onlyOwner() {
        require(msg.sender == _accessControl.owner(), "Caller is not the owner");
        _;
    }
    
    /**
     * @dev Modifier to restrict access to payment processor role
     */
    modifier onlyPaymentProcessor() {
        require(
            _accessControl.hasRole(keccak256("PAYMENT_PROCESSOR_ROLE"), msg.sender) || 
            msg.sender == _accessControl.owner(),
            "Caller is not authorized for payment processing"
        );
        _;
    }
    
    address public payeeAddress;
    
    /**
     * @dev Process a payment
     * @param referencer String referencer for the payment
     * @param metadata Additional payment details
     */
    function processPayment(
        string calldata referencer,
        string calldata metadata
    ) external payable {
        require(msg.value > 0, "Payment amount must be greater than 0");
        
        uint256 paymentId = paymentCount++;
        
        // Calculate fee
        uint256 feeAmount = (msg.value * platformFeePercentage) / 10000;
        uint256 payeeAmount = msg.value - feeAmount;
        
        // Store payment details
        payments[paymentId] = Payment({
            id: paymentId,
            payer: msg.sender,
            payee: payeeAddress,
            amount: msg.value,
            timestamp: block.timestamp,
            referencer: referencer,
            status: PaymentStatus.Completed,
            metadata: metadata
        });
        
        // Add to user's payment history
        userPayments[msg.sender].push(paymentId);
        userPayments[payeeAddress].push(paymentId);
        
        // Transfer funds
        (bool feeSuccess, ) = feeCollector.call{value: feeAmount}("");
        require(feeSuccess, "Fee transfer failed");
        
        (bool payeeSuccess, ) = payeeAddress.call{value: payeeAmount}("");
        
        if (payeeSuccess) {
            emit PaymentCompleted(paymentId, msg.value);
        } else {
            payments[paymentId].status = PaymentStatus.Failed;
            emit PaymentFailed(paymentId, "Transfer to payee failed");
            
            // Refund the payer if payee payment failed
            (bool refundSuccess, ) = msg.sender.call{value: payeeAmount}("");
            require(refundSuccess, "Refund failed");
        }
        
        emit PaymentCreated(paymentId, msg.sender, payeeAddress, msg.value);
    }
    
    /**
     * @dev Get user's payment history
     * @param user Address of the user
     * @return uint256[] Array of payment IDs
     */
    function getUserPayments(address user) external view returns (uint256[] memory) {
        return userPayments[user];
    }
    
    /**
     * @dev Get payment details
     * @param paymentId ID of the payment
     * @return Payment struct with payment details
     */
    function getPaymentDetails(uint256 paymentId) external view returns (Payment memory) {
        require(paymentId < paymentCount, "Payment does not exist");
        return payments[paymentId];
    }
    
    /**
     * @dev Update platform fee percentage (basis points)
     * @param newFeePercentage New fee percentage (e.g., 250 = 2.5%)
     */
    function updateFeePercentage(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 1000, "Fee percentage cannot exceed 10%");
        
        emit FeePercentageUpdated(platformFeePercentage, newFeePercentage);
        platformFeePercentage = newFeePercentage;
    }
    
    /**
     * @dev Update fee collector address
     * @param newFeeCollector Address of the new fee collector
     */
    function updateFeeCollector(address newFeeCollector) external onlyOwner {
        require(newFeeCollector != address(0), "Invalid fee collector address");
        
        emit FeeCollectorUpdated(feeCollector, newFeeCollector);
        feeCollector = newFeeCollector;
    }
    
    // Event for payee address updates
    event PayeeAddressUpdated(address oldPayee, address newPayee);
    
    /**
     * @dev Update payee address (receiver of all payments)
     * @param newPayeeAddress Address of the new payment receiver
     */
    function updatePayeeAddress(address newPayeeAddress) external onlyOwner {
        require(newPayeeAddress != address(0), "Invalid payee address");
        
        emit PayeeAddressUpdated(payeeAddress, newPayeeAddress);
        payeeAddress = newPayeeAddress;
    }
    
    /**
     * @dev Manual refund for a payment (emergency use)
     * @param paymentId ID of the payment to refund
     */
    function refundPayment(uint256 paymentId) external payable onlyPaymentProcessor {
        require(paymentId < paymentCount, "Payment does not exist");
        Payment storage payment = payments[paymentId];
        
        require(payment.status == PaymentStatus.Completed, "Payment is not in completed state");
        require(msg.value >= payment.amount, "Refund amount must be at least the payment amount");
        
        payment.status = PaymentStatus.Refunded;
        
        (bool success, ) = payment.payer.call{value: msg.value}("");
        require(success, "Refund transfer failed");
        
        emit PaymentRefunded(paymentId, msg.value);
    }
}