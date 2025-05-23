// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title AccessControl
 * @dev Contract for managing role-based access control for FlowSync contracts
 */
contract AccessControl {
    address public owner;
    
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAYMENT_MANAGER_ROLE = keccak256("PAYMENT_MANAGER_ROLE");
    bytes32 public constant SUBSCRIPTION_MANAGER_ROLE = keccak256("SUBSCRIPTION_MANAGER_ROLE");
    
    // Mapping from role to addresses that have that role
    mapping(bytes32 => mapping(address => bool)) private roles;
    
    // Events
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    /**
     * @dev Constructor to set the contract owner
     */
    constructor() {
        owner = msg.sender;
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    /**
     * @dev Modifier to restrict function access to owner only
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "AccessControl: caller is not the owner");
        _;
    }
    
    /**
     * @dev Modifier to restrict function access to specific role
     * @param role Role required to call the function
     */
    modifier onlyRole(bytes32 role) {
        require(hasRole(role, msg.sender), "AccessControl: caller does not have required role");
        _;
    }
    
    /**
     * @dev Check if an account has a specific role
     * @param role Role to check
     * @param account Address to check
     * @return bool Whether the account has the role
     */
    function hasRole(bytes32 role, address account) public view returns (bool) {
        return roles[role][account];
    }
    
    /**
     * @dev Grant a role to an account (admin role required)
     * @param role Role to grant
     * @param account Address to grant role to
     */
    function grantRole(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        _grantRole(role, account);
    }
    
    /**
     * @dev Revoke a role from an account (admin role required)
     * @param role Role to revoke
     * @param account Address to revoke role from
     */
    function revokeRole(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        _revokeRole(role, account);
    }
    
    /**
     * @dev Renounce a role (can only renounce your own roles)
     * @param role Role to renounce
     */
    function renounceRole(bytes32 role) external {
        _revokeRole(role, msg.sender);
    }
    
    /**
     * @dev Internal function to grant a role
     * @param role Role to grant
     * @param account Address to grant role to
     */
    function _grantRole(bytes32 role, address account) internal {
        if (!hasRole(role, account)) {
            roles[role][account] = true;
            emit RoleGranted(role, account, msg.sender);
        }
    }
    
    /**
     * @dev Internal function to revoke a role
     * @param role Role to revoke
     * @param account Address to revoke role from
     */
    function _revokeRole(bytes32 role, address account) internal {
        if (hasRole(role, account)) {
            roles[role][account] = false;
            emit RoleRevoked(role, account, msg.sender);
        }
    }
    
    /**
     * @dev Transfer ownership of the contract (owner only)
     * @param _newOwner New owner address
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "AccessControl: new owner cannot be zero address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
        _grantRole(ADMIN_ROLE, _newOwner);
    }
}
