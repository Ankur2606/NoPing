// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AccessControl.sol";

/**
 * @title EscrowContract
 * @dev Contract for managing escrow transactions on the BNB Chain
 */
contract EscrowContract {
    AccessControl private _accessControl;
    
    // Escrow status enum
    enum EscrowStatus { Created, Funded, Approved, Disputed, Refunded, Completed }
    
    // Escrow transaction struct to store all details
    struct EscrowTransaction {
        uint256 id;
        address depositor;
        address beneficiary;
        uint256 amount;
        uint256 createdAt;
        uint256 completedAt;
        EscrowStatus status;
        string terms;
        string metadata;
    }
    
    // Mappings to store escrow data
    mapping(uint256 => EscrowTransaction) public escrows;
    mapping(address => uint256[]) public userEscrows;
    
    uint256 public escrowCount;
    uint256 public escrowFeePercentage; // Basis points (e.g., 100 = 1%)
    address public feeCollector;
    
    // Events
    event EscrowCreated(uint256 indexed escrowId, address indexed depositor, address indexed beneficiary, uint256 amount);
    event EscrowFunded(uint256 indexed escrowId, uint256 amount);
    event EscrowApproved(uint256 indexed escrowId);
    event EscrowDisputed(uint256 indexed escrowId);
    event EscrowRefunded(uint256 indexed escrowId, uint256 amount);
    event EscrowCompleted(uint256 indexed escrowId, uint256 amount);
    event EscrowFeePercentageUpdated(uint256 oldPercentage, uint256 newPercentage);
    event FeeCollectorUpdated(address oldCollector, address newCollector);
    
    /**
     * @dev Constructor
     * @param accessControlAddress Address of the AccessControl contract
     */
    constructor(address accessControlAddress) {
        require(accessControlAddress != address(0), "Invalid AccessControl address");
        _accessControl = AccessControl(accessControlAddress);
        escrowCount = 0;
        escrowFeePercentage = 100; // Default 1%
        feeCollector = msg.sender;
    }
    
    /**
     * @dev Modifier to restrict access to contract owner
     */
    modifier onlyOwner() {
        require(msg.sender == _accessControl.owner(), "Caller is not the owner");
        _;
    }
    
    /**
     * @dev Modifier to restrict access to arbiter role
     */
    modifier onlyArbiter() {
        require(
            _accessControl.hasRole(keccak256("ARBITER_ROLE"), msg.sender) || 
            msg.sender == _accessControl.owner(),
            "Caller is not an authorized arbiter"
        );
        _;
    }
    
    /**
     * @dev Create new escrow transaction
     * @param beneficiary Address of the beneficiary
     * @param terms String describing the terms of the escrow
     * @param metadata Additional escrow details
     */
    function createEscrow(
        address beneficiary,
        string calldata terms,
        string calldata metadata
    ) external payable {
        require(msg.value > 0, "Escrow amount must be greater than 0");
        require(beneficiary != address(0), "Invalid beneficiary address");
        require(beneficiary != msg.sender, "Beneficiary cannot be the same as depositor");
        
        uint256 escrowId = escrowCount++;
        
        // Store escrow details
        escrows[escrowId] = EscrowTransaction({
            id: escrowId,
            depositor: msg.sender,
            beneficiary: beneficiary,
            amount: msg.value,
            createdAt: block.timestamp,
            completedAt: 0,
            status: EscrowStatus.Funded,
            terms: terms,
            metadata: metadata
        });
        
        // Add to user's escrow history
        userEscrows[msg.sender].push(escrowId);
        userEscrows[beneficiary].push(escrowId);
        
        emit EscrowCreated(escrowId, msg.sender, beneficiary, msg.value);
        emit EscrowFunded(escrowId, msg.value);
    }
    
    /**
     * @dev Release funds to beneficiary (can be called by depositor or arbiter)
     * @param escrowId ID of the escrow
     */
    function releaseEscrow(uint256 escrowId) external {
        require(escrowId < escrowCount, "Escrow does not exist");
        EscrowTransaction storage escrow = escrows[escrowId];
        
        require(
            msg.sender == escrow.depositor || 
            _accessControl.hasRole(keccak256("ARBITER_ROLE"), msg.sender) ||
            msg.sender == _accessControl.owner(),
            "Not authorized to release escrow"
        );
        
        require(escrow.status == EscrowStatus.Funded, "Escrow is not in funded state");
        
        escrow.status = EscrowStatus.Completed;
        escrow.completedAt = block.timestamp;
        
        // Calculate fee
        uint256 feeAmount = (escrow.amount * escrowFeePercentage) / 10000;
        uint256 beneficiaryAmount = escrow.amount - feeAmount;
        
        // Transfer fee
        (bool feeSuccess, ) = feeCollector.call{value: feeAmount}("");
        require(feeSuccess, "Fee transfer failed");
        
        // Transfer to beneficiary
        (bool success, ) = escrow.beneficiary.call{value: beneficiaryAmount}("");
        require(success, "Beneficiary transfer failed");
        
        emit EscrowCompleted(escrowId, escrow.amount);
    }
    
    /**
     * @dev Refund to depositor (can only be called by arbiter)
     * @param escrowId ID of the escrow
     */
    function refundEscrow(uint256 escrowId) external onlyArbiter {
        require(escrowId < escrowCount, "Escrow does not exist");
        EscrowTransaction storage escrow = escrows[escrowId];
        
        require(escrow.status == EscrowStatus.Funded || escrow.status == EscrowStatus.Disputed, 
                "Escrow not in refundable state");
        
        escrow.status = EscrowStatus.Refunded;
        escrow.completedAt = block.timestamp;
        
        // Transfer back to depositor
        (bool success, ) = escrow.depositor.call{value: escrow.amount}("");
        require(success, "Depositor refund failed");
        
        emit EscrowRefunded(escrowId, escrow.amount);
    }
    
    /**
     * @dev Dispute an escrow (can be called by depositor or beneficiary)
     * @param escrowId ID of the escrow
     */
    function disputeEscrow(uint256 escrowId) external {
        require(escrowId < escrowCount, "Escrow does not exist");
        EscrowTransaction storage escrow = escrows[escrowId];
        
        require(
            msg.sender == escrow.depositor || msg.sender == escrow.beneficiary,
            "Not authorized to dispute escrow"
        );
        
        require(escrow.status == EscrowStatus.Funded, "Escrow is not in funded state");
        
        escrow.status = EscrowStatus.Disputed;
        
        emit EscrowDisputed(escrowId);
    }
    
    /**
     * @dev Get user's escrow history
     * @param user Address of the user
     * @return uint256[] Array of escrow IDs
     */
    function getUserEscrows(address user) external view returns (uint256[] memory) {
        return userEscrows[user];
    }
    
    /**
     * @dev Get escrow details
     * @param escrowId ID of the escrow
     * @return EscrowTransaction struct with escrow details
     */
    function getEscrowDetails(uint256 escrowId) external view returns (EscrowTransaction memory) {
        require(escrowId < escrowCount, "Escrow does not exist");
        return escrows[escrowId];
    }
    
    /**
     * @dev Update escrow fee percentage (basis points)
     * @param newFeePercentage New fee percentage (e.g., 100 = 1%)
     */
    function updateFeePercentage(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 500, "Fee percentage cannot exceed 5%");
        
        emit EscrowFeePercentageUpdated(escrowFeePercentage, newFeePercentage);
        escrowFeePercentage = newFeePercentage;
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
    
    /**
     * @dev Get escrow balance
     * @return uint256 Current contract balance
     */
    function getContractBalance() external view onlyOwner returns (uint256) {
        return address(this).balance;
    }
}