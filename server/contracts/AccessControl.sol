// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AccessControl
 * @dev Contract for managing role-based access control
 */
contract AccessControl {
    address public owner;
    
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");
    bytes32 public constant PAYMENT_PROCESSOR_ROLE = keccak256("PAYMENT_PROCESSOR_ROLE");
    
    // Role assignments
    mapping(bytes32 => mapping(address => bool)) private _roles;
    
    // Role management events
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    /**
     * @dev Constructor sets the original owner of the contract
     */
    constructor() {
        owner = msg.sender;
        _grantRole(ADMIN_ROLE, msg.sender);
        
        emit OwnershipTransferred(address(0), msg.sender);
    }
    
    /**
     * @dev Modifier to restrict function access to contract owner
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "AccessControl: caller is not the owner");
        _;
    }
    
    /**
     * @dev Modifier to restrict function access to specific role
     */
    modifier onlyRole(bytes32 role) {
        require(hasRole(role, msg.sender), "AccessControl: caller does not have required role");
        _;
    }
    
    /**
     * @dev Modifier for arbiter role
     */
    modifier onlyArbiter() {
        require(hasRole(ARBITER_ROLE, msg.sender), "AccessControl: caller is not an arbiter");
        _;
    }
    
    /**
     * @dev Check if an account has a specific role
     * @param role The role to check
     * @param account The account to check
     * @return bool True if the account has the role, False otherwise
     */
    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[role][account];
    }
    
    /**
     * @dev Grant a role to an account
     * @param role The role to grant
     * @param account The account to receive the role
     */
    function grantRole(bytes32 role, address account) public onlyOwner {
        _grantRole(role, account);
    }
    
    /**
     * @dev Internal function to grant a role
     * @param role The role to grant
     * @param account The account to receive the role
     */
    function _grantRole(bytes32 role, address account) internal {
        if (!hasRole(role, account)) {
            _roles[role][account] = true;
            emit RoleGranted(role, account, msg.sender);
        }
    }
    
    /**
     * @dev Revoke a role from an account
     * @param role The role to revoke
     * @param account The account to revoke the role from
     */
    function revokeRole(bytes32 role, address account) public onlyOwner {
        if (hasRole(role, account)) {
            _roles[role][account] = false;
            emit RoleRevoked(role, account, msg.sender);
        }
    }
    
    /**
     * @dev Transfer ownership of the contract
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "AccessControl: new owner is the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
        _grantRole(ADMIN_ROLE, newOwner);
    }
}