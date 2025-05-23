// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title PaymentProcessor
 * @dev Contract for processing BNB payments for FlowSync
 */
contract PaymentProcessor {
    address public owner;
    address public feeCollector;
    uint256 public feePercentage; // Fee in basis points (1/100 of a percent)
    
    // Payment status enum
    enum PaymentStatus { Pending, Completed, Refunded, Failed }
    
    // Payment structure
    struct Payment {
        uint256 id;
        address payer;
        uint256 amount;
        uint256 timestamp;
        PaymentStatus status;
        string metadata; // JSON string with additional payment data
    }
    
    // Mapping from payment ID to Payment
    mapping(uint256 => Payment) public payments;
    uint256 public nextPaymentId;
    
    // Events
    event PaymentReceived(uint256 indexed paymentId, address indexed payer, uint256 amount, string metadata);
    event PaymentUpdated(uint256 indexed paymentId, PaymentStatus status);
    event FeePercentageUpdated(uint256 oldFee, uint256 newFee);
    event FeeCollectorUpdated(address oldCollector, address newCollector);
    
    /**
     * @dev Constructor to set the contract owner and initial parameters
     * @param _feeCollector Address that will receive fees
     * @param _feePercentage Fee percentage in basis points (1% = 100)
     */
    constructor(address _feeCollector, uint256 _feePercentage) {
        owner = msg.sender;
        feeCollector = _feeCollector;
        feePercentage = _feePercentage;
        nextPaymentId = 1;
    }
    
    /**
     * @dev Modifier to restrict function access to owner only
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "PaymentProcessor: caller is not the owner");
        _;
    }
    
    /**
     * @dev Process a payment from a user
     * @param _metadata JSON string with additional payment information
     * @return paymentId The ID of the created payment
     */
    function processPayment(string memory _metadata) external payable returns (uint256) {
        require(msg.value > 0, "PaymentProcessor: payment amount must be greater than 0");
        
        uint256 paymentId = nextPaymentId++;
        
        // Calculate fee
        uint256 feeAmount = (msg.value * feePercentage) / 10000;
        uint256 remainingAmount = msg.value - feeAmount;
        
        // Create payment record
        payments[paymentId] = Payment({
            id: paymentId,
            payer: msg.sender,
            amount: msg.value,
            timestamp: block.timestamp,
            status: PaymentStatus.Completed,
            metadata: _metadata
        });
        
        // Transfer fee to fee collector
        if (feeAmount > 0) {
            (bool feeSuccess, ) = feeCollector.call{value: feeAmount}("");
            require(feeSuccess, "PaymentProcessor: fee transfer failed");
        }
        
        // Transfer remaining amount to owner
        (bool success, ) = owner.call{value: remainingAmount}("");
        require(success, "PaymentProcessor: payment transfer failed");
        
        emit PaymentReceived(paymentId, msg.sender, msg.value, _metadata);
        
        return paymentId;
    }
    
    /**
     * @dev Set a new fee percentage (owner only)
     * @param _feePercentage New fee percentage in basis points
     */
    function setFeePercentage(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= 1000, "PaymentProcessor: fee percentage cannot exceed 10%");
        
        emit FeePercentageUpdated(feePercentage, _feePercentage);
        feePercentage = _feePercentage;
    }
    
    /**
     * @dev Set a new fee collector address (owner only)
     * @param _feeCollector New fee collector address
     */
    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "PaymentProcessor: fee collector cannot be zero address");
        
        emit FeeCollectorUpdated(feeCollector, _feeCollector);
        feeCollector = _feeCollector;
    }
    
    /**
     * @dev Update payment status (owner only)
     * @param _paymentId Payment ID to update
     * @param _status New payment status
     */
    function updatePaymentStatus(uint256 _paymentId, PaymentStatus _status) external onlyOwner {
        require(payments[_paymentId].id == _paymentId, "PaymentProcessor: payment does not exist");
        
        payments[_paymentId].status = _status;
        emit PaymentUpdated(_paymentId, _status);
    }
    
    /**
     * @dev Get payment details
     * @param _paymentId Payment ID to query
     * @return Payment struct with payment details
     */
    function getPayment(uint256 _paymentId) external view returns (Payment memory) {
        require(payments[_paymentId].id == _paymentId, "PaymentProcessor: payment does not exist");
        return payments[_paymentId];
    }
    
    /**
     * @dev Transfer ownership of the contract (owner only)
     * @param _newOwner New owner address
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "PaymentProcessor: new owner cannot be zero address");
        owner = _newOwner;
    }
    
    /**
     * @dev Emergency withdrawal function (owner only)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "PaymentProcessor: no balance to withdraw");
        
        (bool success, ) = owner.call{value: balance}("");
        require(success, "PaymentProcessor: withdrawal failed");
    }
}
