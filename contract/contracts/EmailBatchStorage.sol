// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AccessControl.sol";

/**
 * @title EmailBatchStorage
 * @dev Contract for storing email classification entries in batches
 * Provides enhanced scalability by allowing batch operations
 * Optimized for gas efficiency on opBNB
 */
contract EmailBatchStorage {
    AccessControl private _accessControl;
    
    // Email classification labels
    enum ClassificationLabel { FLOW_CRITICAL, FLOW_ACTION, FLOW_INFO }
    
    // Email classification entry struct
    struct EmailClassification {
        string emailId;        // Unique identifier for the email
        ClassificationLabel label;  // Classification label
        string reasoning;      // Brief reasoning for classification
        uint256 timestamp;     // When the classification was created
    }
    
    // Batch struct to store multiple classifications in one transaction
    struct ClassificationBatch {
        uint256 batchId;       // Unique batch identifier
        address user;          // User who owns these classifications
        uint256 timestamp;     // When the batch was created
        uint256 count;         // Number of classifications in the batch
        bool exists;           // Flag to check if batch exists
    }
    
    // Counter for batch IDs
    uint256 private _nextBatchId;
    
    // Mapping from batch ID to its metadata
    mapping(uint256 => ClassificationBatch) private _batches;
    
    // Mapping from batch ID to its classifications
    mapping(uint256 => EmailClassification[]) private _batchClassifications;
    
    // Mapping from user address to their batch IDs
    mapping(address => uint256[]) private _userBatches;
    
    // Mapping for quick email lookups
    // user address => emailId => (batchId, position in batch)
    mapping(address => mapping(string => uint256[])) private _emailIndex;
    
    // Events
    event BatchCreated(address indexed user, uint256 indexed batchId, uint256 count);
    event BatchDeleted(address indexed user, uint256 indexed batchId);
    event ClassificationAdded(address indexed user, string emailId, uint8 label, uint256 batchId);
    
    // Constants
    uint256 public constant MAX_BATCH_SIZE = 100;
    bytes32 public constant BACKEND_ROLE = keccak256("BACKEND_ROLE");
    
    /**
     * @dev Constructor
     * @param accessControlAddress Address of the AccessControl contract
     */
    constructor(address accessControlAddress) {
        require(accessControlAddress != address(0), "Invalid AccessControl address");
        _accessControl = AccessControl(accessControlAddress);
        _nextBatchId = 1;
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
     * @dev Store a batch of email classifications for a user
     * @param user Address of the user who owns these classifications
     * @param emailIds Array of email IDs
     * @param labels Array of classification labels
     * @param reasonings Array of reasoning texts
     * @return uint256 ID of the created batch
     */
    function storeBatch(
        address user,
        string[] calldata emailIds,
        uint8[] calldata labels,
        string[] calldata reasonings
    ) external onlyBackend returns (uint256) {
        require(user != address(0), "Invalid user address");
        require(emailIds.length > 0, "Batch cannot be empty");
        require(emailIds.length == labels.length && emailIds.length == reasonings.length, "Input arrays must have the same length");
        require(emailIds.length <= MAX_BATCH_SIZE, "Batch size exceeds maximum limit");
        
        uint256 batchId = _nextBatchId++;
        
        // Create batch metadata
        _batches[batchId] = ClassificationBatch({
            batchId: batchId,
            user: user,
            timestamp: block.timestamp,
            count: emailIds.length,
            exists: true
        });
        
        // Add batch to user's list
        _userBatches[user].push(batchId);
        
        // Store each classification in the batch
        for (uint256 i = 0; i < emailIds.length; i++) {
            require(labels[i] <= uint8(ClassificationLabel.FLOW_INFO), "Invalid label");
            
            EmailClassification memory entry = EmailClassification({
                emailId: emailIds[i],
                label: ClassificationLabel(labels[i]),
                reasoning: reasonings[i],
                timestamp: block.timestamp
            });
            
            _batchClassifications[batchId].push(entry);
            
            // Update email index for fast lookups
            // Store [batchId, position] for each email
            uint256[] memory indexData = new uint256[](2);
            indexData[0] = batchId;
            indexData[1] = i;
            _emailIndex[user][emailIds[i]] = indexData;
            
            emit ClassificationAdded(user, emailIds[i], labels[i], batchId);
        }
        
        emit BatchCreated(user, batchId, emailIds.length);
        return batchId;
    }
    
    /**
     * @dev Get all batches for the calling user
     * @return uint256[] Array of batch IDs
     */
    function getUserBatches() external view returns (uint256[] memory) {
        return _userBatches[msg.sender];
    }
    
    /**
     * @dev Get all classifications from a specific batch (only accessible by the user who owns it)
     * @param batchId ID of the batch to fetch
     * @return EmailClassification[] Array of classifications in the batch
     */
    function getBatchClassifications(uint256 batchId) external view returns (EmailClassification[] memory) {
        require(_batches[batchId].exists, "Batch does not exist");
        require(_batches[batchId].user == msg.sender, "Not authorized to access this batch");
        
        return _batchClassifications[batchId];
    }
    
    /**
     * @dev Check if a user has a classification for a specific email
     * @param emailId Unique identifier for the email
     * @return bool True if classification exists, false otherwise
     * @return uint8 Label value if exists
     * @return string Reasoning if exists
     */
    function findClassification(address user, string calldata emailId) external view onlyBackend 
        returns (bool, uint8, string memory) {
        
        uint256[] memory indexData = _emailIndex[user][emailId];
        
        if (indexData.length == 2) {
            uint256 batchId = indexData[0];
            uint256 position = indexData[1];
            
            if (_batches[batchId].exists && position < _batchClassifications[batchId].length) {
                EmailClassification memory entry = _batchClassifications[batchId][position];
                return (true, uint8(entry.label), entry.reasoning);
            }
        }
        
        return (false, 0, "");
    }
    
    /**
     * @dev Get a single classification by email ID (only accessible by the user who owns it)
     * @param emailId Unique identifier for the email
     * @return bool True if classification exists, false otherwise
     * @return uint8 Label value if exists
     * @return string Reasoning if exists
     */
    function getMyClassification(string calldata emailId) external view 
        returns (bool, uint8, string memory) {
        
        uint256[] memory indexData = _emailIndex[msg.sender][emailId];
        
        if (indexData.length == 2) {
            uint256 batchId = indexData[0];
            uint256 position = indexData[1];
            
            if (_batches[batchId].exists && position < _batchClassifications[batchId].length) {
                EmailClassification memory entry = _batchClassifications[batchId][position];
                return (true, uint8(entry.label), entry.reasoning);
            }
        }
        
        return (false, 0, "");
    }
    
    /**
     * @dev Get batch info
     * @param batchId ID of the batch
     * @return ClassificationBatch Batch metadata
     */
    function getBatchInfo(uint256 batchId) external view returns (ClassificationBatch memory) {
        require(_batches[batchId].exists, "Batch does not exist");
        
        // Only owner, backend, or the user who owns the batch can access it
        bool isAuthorized = 
            msg.sender == _accessControl.owner() || 
            _accessControl.hasRole(BACKEND_ROLE, msg.sender) ||
            _batches[batchId].user == msg.sender;
            
        require(isAuthorized, "Not authorized to access this batch");
        
        return _batches[batchId];
    }
    
    /**
     * @dev Get recent classifications for a user
     * @param user Address of the user
     * @param startBatchId Starting batch ID (use 0 for most recent)
     * @param count Maximum number of classifications to retrieve
     * @return EmailClassification[] Array of most recent classifications
     */
    function getRecentClassifications(
        address user, 
        uint256 startBatchId,
        uint256 count
    ) external view onlyBackend returns (EmailClassification[] memory) {
        
        uint256[] memory batches = _userBatches[user];
        if (batches.length == 0) {
            return new EmailClassification[](0);
        }
        
        // Determine starting batch index
        uint256 startIndex;
        if (startBatchId == 0) {
            startIndex = batches.length - 1; // Start from the most recent batch
        } else {
            // Find the index of startBatchId
            for (uint256 i = 0; i < batches.length; i++) {
                if (batches[i] == startBatchId) {
                    startIndex = i;
                    break;
                }
            }
            // If not found, start from the most recent
            if (startIndex == 0 && batches[0] != startBatchId) {
                startIndex = batches.length - 1;
            }
        }
        
        // Count total available classifications
        uint256 totalAvailable = 0;
        uint256 batchesToCheck = 0;
        
        for (uint256 i = startIndex; i < batches.length && i >= 0; i--) {
            totalAvailable += _batches[batches[i]].count;
            batchesToCheck++;
            
            if (totalAvailable >= count || i == 0) {
                break;
            }
        }
        
        // Get the minimum of available and requested count
        uint256 resultCount = totalAvailable < count ? totalAvailable : count;
        EmailClassification[] memory result = new EmailClassification[](resultCount);
        
        // Fill the result array
        uint256 filled = 0;
        for (uint256 i = startIndex; filled < resultCount && i < batches.length && i >= 0; i--) {
            EmailClassification[] memory batchEntries = _batchClassifications[batches[i]];
            
            for (uint256 j = 0; j < batchEntries.length && filled < resultCount; j++) {
                result[filled] = batchEntries[j];
                filled++;
            }
            
            if (i == 0) break;
        }
        
        return result;
    }
    
    /**
     * @dev Get total classification count for a user
     * @param user Address of the user
     * @return uint256 Total count of classifications
     */
    function getUserClassificationCount(address user) external view onlyBackend returns (uint256) {
        uint256 total = 0;
        uint256[] memory batches = _userBatches[user];
        
        for (uint256 i = 0; i < batches.length; i++) {
            total += _batches[batches[i]].count;
        }
        
        return total;
    }
}
