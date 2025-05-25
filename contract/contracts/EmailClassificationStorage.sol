// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AccessControl.sol";

/**
 * @title EmailClassificationStorage
 * @dev Contract for storing email classification entries securely on opBNB
 * Each entry stores: reasoning, label, and emailId
 * Only the trusted backend can write entries
 * Only the intended user can read their own entries
 */
contract EmailClassificationStorage {
    AccessControl private _accessControl;
    
    // Email classification labels matching the application logic
    enum ClassificationLabel { FLOW_CRITICAL, FLOW_ACTION, FLOW_INFO }
    
    // Email classification entry struct
    struct EmailClassification {
        string emailId;        // Unique identifier for the email (source ID)
        ClassificationLabel label;  // Classification label
        string reasoning;      // Brief reasoning for classification
        uint256 timestamp;     // When the classification was created
        bool isDeleted;        // Soft delete flag
    }
    
    // Mapping from user address to their email classifications
    // user address => array of EmailClassification entries
    mapping(address => EmailClassification[]) private _userEmailClassifications;
    
    // Mapping to track if an email has been classified already (prevent duplicates)
    // user address => emailId => index in the array (plus 1, 0 means not exists)
    mapping(address => mapping(string => uint256)) private _emailClassificationIndex;
    
    // Events
    event ClassificationAdded(address indexed user, string emailId, uint8 label);
    event ClassificationUpdated(address indexed user, string emailId, uint8 label);
    event ClassificationDeleted(address indexed user, string emailId);
    
    // Roles
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    
    /**
     * @dev Constructor
     * @param accessControlAddress Address of the AccessControl contract
     */
    constructor(address accessControlAddress) {
        require(accessControlAddress != address(0), "Invalid AccessControl address");
        _accessControl = AccessControl(accessControlAddress);
    }
    
    /**
     * @dev Modifier to restrict access to contract owner
     */
    modifier onlyOwner() {
        require(msg.sender == _accessControl.owner(), "Caller is not the owner");
        _;
    }
    
    /**
     * @dev Modifier to restrict access to backend role
     */
    modifier onlyBackend() {
        require(
            _accessControl.hasRole(BACKEND_ROLE, msg.sender) || 
            msg.sender == _accessControl.owner(),
            "Caller is not authorized as backend"
        );
        _;
    }
    
    /**
     * @dev Add or update a classification entry for a user
     * @param user Address of the user who owns this email classification
     * @param emailId Unique identifier for the email
     * @param label Classification label (0=FLOW_CRITICAL, 1=FLOW_ACTION, 2=FLOW_INFO)
     * @param reasoning Brief reason for the classification
     * @return bool Success indicator
     */
    function addClassification(
        address user,
        string calldata emailId,
        uint8 label,
        string calldata reasoning
    ) external onlyBackend returns (bool) {
        require(user != address(0), "Invalid user address");
        require(bytes(emailId).length > 0, "Email ID cannot be empty");
        require(label <= uint8(ClassificationLabel.FLOW_INFO), "Invalid label");
        
        uint256 indexPlusOne = _emailClassificationIndex[user][emailId];
        
        if (indexPlusOne > 0) {
            // Update existing classification
            uint256 index = indexPlusOne - 1;
            
            // If marked as deleted, unmark it
            if (_userEmailClassifications[user][index].isDeleted) {
                _userEmailClassifications[user][index].isDeleted = false;
            }
            
            // Update the values
            _userEmailClassifications[user][index].label = ClassificationLabel(label);
            _userEmailClassifications[user][index].reasoning = reasoning;
            _userEmailClassifications[user][index].timestamp = block.timestamp;
            
            emit ClassificationUpdated(user, emailId, label);
        } else {
            // Add new classification
            EmailClassification memory newClassification = EmailClassification({
                emailId: emailId,
                label: ClassificationLabel(label),
                reasoning: reasoning,
                timestamp: block.timestamp,
                isDeleted: false
            });
            
            _userEmailClassifications[user].push(newClassification);
            _emailClassificationIndex[user][emailId] = _userEmailClassifications[user].length;
            
            emit ClassificationAdded(user, emailId, label);
        }
        
        return true;
    }
    
    /**
     * @dev Mark a classification as deleted (soft delete)
     * @param user Address of the user who owns this email classification
     * @param emailId Unique identifier for the email
     * @return bool Success indicator
     */
    function deleteClassification(
        address user,
        string calldata emailId
    ) external onlyBackend returns (bool) {
        require(user != address(0), "Invalid user address");
        
        uint256 indexPlusOne = _emailClassificationIndex[user][emailId];
        require(indexPlusOne > 0, "Classification not found");
        
        uint256 index = indexPlusOne - 1;
        _userEmailClassifications[user][index].isDeleted = true;
        
        emit ClassificationDeleted(user, emailId);
        return true;
    }
    
    /**
     * @dev Get all classifications for a calling user
     * @return EmailClassification[] Array of user's email classifications (excluding deleted ones)
     */
    function getUserClassifications() external view returns (EmailClassification[] memory) {
        // Count active (non-deleted) entries
        uint256 activeCount = 0;
        for (uint256 i = 0; i < _userEmailClassifications[msg.sender].length; i++) {
            if (!_userEmailClassifications[msg.sender][i].isDeleted) {
                activeCount++;
            }
        }
        
        // Create result array of active entries
        EmailClassification[] memory result = new EmailClassification[](activeCount);
        uint256 resultIndex = 0;
        
        for (uint256 i = 0; i < _userEmailClassifications[msg.sender].length; i++) {
            if (!_userEmailClassifications[msg.sender][i].isDeleted) {
                result[resultIndex] = _userEmailClassifications[msg.sender][i];
                resultIndex++;
            }
        }
        
        return result;
    }
    
    /**
     * @dev Check if a user has a classification for a specific email
     * @param emailId Unique identifier for the email
     * @return bool True if classification exists, false otherwise
     * @return uint8 Label value if exists
     * @return string Reasoning if exists
     */
    function hasClassification(string calldata emailId) external view returns (bool, uint8, string memory) {
        uint256 indexPlusOne = _emailClassificationIndex[msg.sender][emailId];
        
        if (indexPlusOne > 0) {
            uint256 index = indexPlusOne - 1;
            EmailClassification memory entry = _userEmailClassifications[msg.sender][index];
            
            if (!entry.isDeleted) {
                return (true, uint8(entry.label), entry.reasoning);
            }
        }
        
        return (false, 0, "");
    }
    
    /**
     * @dev Get single classification entry by email ID (only accessible by the user who owns it)
     * @param emailId Unique identifier for the email
     * @return EmailClassification Requested classification entry
     */
    function getClassification(string calldata emailId) external view returns (EmailClassification memory) {
        uint256 indexPlusOne = _emailClassificationIndex[msg.sender][emailId];
        require(indexPlusOne > 0, "Classification not found");
        
        uint256 index = indexPlusOne - 1;
        EmailClassification memory entry = _userEmailClassifications[msg.sender][index];
        require(!entry.isDeleted, "Classification has been deleted");
        
        return entry;
    }
    
    /**
     * @dev Get classification count for a user
     * @param user Address of the user
     * @return uint256 Count of active classifications
     */
    function getClassificationCount(address user) external view onlyBackend returns (uint256) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < _userEmailClassifications[user].length; i++) {
            if (!_userEmailClassifications[user][i].isDeleted) {
                activeCount++;
            }
        }
        return activeCount;
    }
}
