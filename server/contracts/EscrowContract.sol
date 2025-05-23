// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./AccessControl.sol";

/**
 * @title EscrowContract
 * @dev Contract for holding funds in escrow for FlowSync payments
 */
contract EscrowContract {
    address public owner;
    AccessControl public accessControl;
    
    // Escrow status enum
    enum EscrowStatus { Created, Funded, Released, Refunded, Disputed, Resolved }
    
    // Escrow structure
    struct Escrow {
        uint256 id;
        address payer;
        address payee;
        uint256 amount;
        uint256 createdAt;
        uint256 releasedAt;
        EscrowStatus status;
        string metadata; // JSON string with additional escrow data
    }
    
    // Mapping escrow ID to Escrow
    mapping(uint256 => Escrow) public escrows;
    uint256 public nextEscrowId;
    
    // Events
    event EscrowCreated(uint256 indexed escrowId, address indexed payer, address indexed payee, uint256 amount);
    event EscrowFunded(uint256 indexed escrowId, address indexed payer, uint256 amount);
    event EscrowReleased(uint256 indexed escrowId, address indexed payee, uint256 amount);
    event EscrowRefunded(uint256 indexed escrowId, address indexed payer, uint256 amount);
    event EscrowDisputed(uint256 indexed escrowId, string reason);
    event EscrowResolved(uint256 indexed escrowId, EscrowStatus resolution);
    
    /**
     * @dev Constructor to set the contract owner and AccessControl contract
     * @param _accessControlAddress Address of the AccessControl contract
     */
    constructor(address _accessControlAddress) {
        owner = msg.sender;
        accessControl = AccessControl(_accessControlAddress);
        nextEscrowId = 1;
    }
    
    /**
     * @dev Modifier to restrict function access to owner only
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "EscrowContract: caller is not the owner");
        _;
    }
    
    /**
     * @dev Modifier to restrict function access to payment manager role
     */
    modifier onlyPaymentManager() {
        require(accessControl.hasRole(accessControl.PAYMENT_MANAGER_ROLE(), msg.sender), 
                "EscrowContract: caller does not have payment manager role");
        _;
    }
    
    /**
     * @dev Create a new escrow agreement
     * @param _payee Address that will receive funds
     * @param _metadata JSON string with additional escrow data
     * @return escrowId The ID of the created escrow
     */
    function createEscrow(address _payee, string memory _metadata) external payable returns (uint256) {
        require(_payee != address(0), "EscrowContract: payee cannot be zero address");
        require(msg.value > 0, "EscrowContract: escrow amount must be greater than 0");
        
        uint256 escrowId = nextEscrowId++;
        
        // Create escrow record
        escrows[escrowId] = Escrow({
            id: escrowId,
            payer: msg.sender,
            payee: _payee,
            amount: msg.value,
            createdAt: block.timestamp,
            releasedAt: 0,
            status: EscrowStatus.Funded,
            metadata: _metadata
        });
        
        emit EscrowCreated(escrowId, msg.sender, _payee, msg.value);
        emit EscrowFunded(escrowId, msg.sender, msg.value);
        
        return escrowId;
    }
    
    /**
     * @dev Release funds from escrow to payee
     * @param _escrowId Escrow ID to release
     */
    function releaseEscrow(uint256 _escrowId) external {
        Escrow storage escrow = escrows[_escrowId];
        
        require(escrow.id == _escrowId, "EscrowContract: escrow does not exist");
        require(escrow.status == EscrowStatus.Funded, "EscrowContract: escrow not in funded state");
        require(
            msg.sender == escrow.payer || 
            msg.sender == owner || 
            accessControl.hasRole(accessControl.PAYMENT_MANAGER_ROLE(), msg.sender),
            "EscrowContract: caller not authorized to release escrow"
        );
        
        escrow.status = EscrowStatus.Released;
        escrow.releasedAt = block.timestamp;
        
        // Transfer funds to payee
        (bool success, ) = escrow.payee.call{value: escrow.amount}("");
        require(success, "EscrowContract: release transfer failed");
        
        emit EscrowReleased(_escrowId, escrow.payee, escrow.amount);
    }
    
    /**
     * @dev Refund escrow to payer
     * @param _escrowId Escrow ID to refund
     */
    function refundEscrow(uint256 _escrowId) external onlyPaymentManager {
        Escrow storage escrow = escrows[_escrowId];
        
        require(escrow.id == _escrowId, "EscrowContract: escrow does not exist");
        require(escrow.status == EscrowStatus.Funded || escrow.status == EscrowStatus.Disputed, 
                "EscrowContract: escrow not in refundable state");
        
        escrow.status = EscrowStatus.Refunded;
        
        // Transfer funds back to payer
        (bool success, ) = escrow.payer.call{value: escrow.amount}("");
        require(success, "EscrowContract: refund transfer failed");
        
        emit EscrowRefunded(_escrowId, escrow.payer, escrow.amount);
    }
    
    /**
     * @dev Mark an escrow as disputed
     * @param _escrowId Escrow ID to dispute
     * @param _reason Reason for dispute
     */
    function disputeEscrow(uint256 _escrowId, string memory _reason) external {
        Escrow storage escrow = escrows[_escrowId];
        
        require(escrow.id == _escrowId, "EscrowContract: escrow does not exist");
        require(escrow.status == EscrowStatus.Funded, "EscrowContract: escrow not in funded state");
        require(
            msg.sender == escrow.payer || 
            msg.sender == escrow.payee,
            "EscrowContract: only payer or payee can dispute escrow"
        );
        
        escrow.status = EscrowStatus.Disputed;
        
        emit EscrowDisputed(_escrowId, _reason);
    }
    
    /**
     * @dev Resolve a disputed escrow
     * @param _escrowId Escrow ID to resolve
     * @param _resolution Final status for the escrow (Released or Refunded)
     */
    function resolveDispute(uint256 _escrowId, EscrowStatus _resolution) external onlyPaymentManager {
        Escrow storage escrow = escrows[_escrowId];
        
        require(escrow.id == _escrowId, "EscrowContract: escrow does not exist");
        require(escrow.status == EscrowStatus.Disputed, "EscrowContract: escrow not in disputed state");
        require(
            _resolution == EscrowStatus.Released || 
            _resolution == EscrowStatus.Refunded,
            "EscrowContract: invalid resolution status"
        );
        
        if (_resolution == EscrowStatus.Released) {
            // Transfer funds to payee
            (bool success, ) = escrow.payee.call{value: escrow.amount}("");
            require(success, "EscrowContract: resolution release transfer failed");
            
            emit EscrowReleased(_escrowId, escrow.payee, escrow.amount);
        } else {
            // Transfer funds back to payer
            (bool success, ) = escrow.payer.call{value: escrow.amount}("");
            require(success, "EscrowContract: resolution refund transfer failed");
            
            emit EscrowRefunded(_escrowId, escrow.payer, escrow.amount);
        }
        
        escrow.status = EscrowStatus.Resolved;
        escrow.releasedAt = block.timestamp;
        
        emit EscrowResolved(_escrowId, _resolution);
    }
    
    /**
     * @dev Get escrow details
     * @param _escrowId Escrow ID to query
     * @return Escrow struct with escrow details
     */
    function getEscrow(uint256 _escrowId) external view returns (Escrow memory) {
        require(escrows[_escrowId].id == _escrowId, "EscrowContract: escrow does not exist");
        return escrows[_escrowId];
    }
    
    /**
     * @dev Transfer ownership of the contract (owner only)
     * @param _newOwner New owner address
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "EscrowContract: new owner cannot be zero address");
        owner = _newOwner;
    }
    
    /**
     * @dev Emergency withdrawal function (owner only)
     * @notice This should only be used in critical situations!
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "EscrowContract: no balance to withdraw");
        
        (bool success, ) = owner.call{value: balance}("");
        require(success, "EscrowContract: withdrawal failed");
    }
}
