// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AccessControl.sol";

/**
 * @title SubscriptionManager
 * @dev Contract for managing subscription-based services on the BNB Chain
 */
contract SubscriptionManager {
    AccessControl private _accessControl;
    
    // Subscription status enum
    enum SubscriptionStatus { Active, Expired, Canceled, Paused }
    
    // Subscription plan struct
    struct SubscriptionPlan {
        uint256 id;
        string name;
        string description;
        uint256 price;
        uint256 durationInDays;
        bool isActive;
        string features;
    }
    
    // User subscription struct
    struct UserSubscription {
        uint256 id;
        address subscriber;
        uint256 planId;
        uint256 startDate;
        uint256 endDate;
        SubscriptionStatus status;
        uint256 lastPaymentDate;
        uint256 nextPaymentDate;
        bool autoRenew;
    }
    
    // Mappings to store subscription data
    mapping(uint256 => SubscriptionPlan) public subscriptionPlans;
    mapping(uint256 => UserSubscription) public userSubscriptions;
    mapping(address => uint256[]) public subscriberSubscriptions;
    
    uint256 public planCount;
    uint256 public subscriptionCount;
    address public treasury;
    
    // Events
    event PlanCreated(uint256 indexed planId, string name, uint256 price);
    event PlanUpdated(uint256 indexed planId, string name, uint256 price);
    event PlanDeactivated(uint256 indexed planId);
    event SubscriptionCreated(uint256 indexed subscriptionId, address indexed subscriber, uint256 indexed planId);
    event SubscriptionRenewed(uint256 indexed subscriptionId, uint256 newEndDate);
    event SubscriptionCanceled(uint256 indexed subscriptionId);
    event SubscriptionPaused(uint256 indexed subscriptionId);
    event SubscriptionResumed(uint256 indexed subscriptionId);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    
    /**
     * @dev Constructor
     * @param accessControlAddress Address of the AccessControl contract
     */
    constructor(address accessControlAddress) {
        require(accessControlAddress != address(0), "Invalid AccessControl address");
        _accessControl = AccessControl(accessControlAddress);
        planCount = 0;
        subscriptionCount = 0;
        treasury = msg.sender;
    }
    
    /**
     * @dev Modifier to restrict access to contract owner
     */
    modifier onlyOwner() {
        require(msg.sender == _accessControl.owner(), "Caller is not the owner");
        _;
    }
    
    /**
     * @dev Modifier to restrict access to subscription manager role
     */
    modifier onlySubscriptionManager() {
        require(
            _accessControl.hasRole(keccak256("ADMIN_ROLE"), msg.sender) || 
            msg.sender == _accessControl.owner(),
            "Caller is not authorized for subscription management"
        );
        _;
    }
    
    /**
     * @dev Create a new subscription plan
     * @param name Plan name
     * @param description Plan description
     * @param price Plan price in wei
     * @param durationInDays Duration in days
     * @param features JSON string with plan features
     */
    function createSubscriptionPlan(
        string calldata name,
        string calldata description,
        uint256 price,
        uint256 durationInDays,
        string calldata features
    ) external onlySubscriptionManager {
        require(bytes(name).length > 0, "Plan name cannot be empty");
        require(durationInDays > 0, "Duration must be greater than 0");
        
        uint256 planId = planCount++;
        
        subscriptionPlans[planId] = SubscriptionPlan({
            id: planId,
            name: name,
            description: description,
            price: price,
            durationInDays: durationInDays,
            isActive: true,
            features: features
        });
        
        emit PlanCreated(planId, name, price);
    }
    
    /**
     * @dev Update an existing subscription plan
     * @param planId ID of the plan to update
     * @param name Plan name
     * @param description Plan description
     * @param price Plan price in wei
     * @param durationInDays Duration in days
     * @param features JSON string with plan features
     */
    function updateSubscriptionPlan(
        uint256 planId,
        string calldata name,
        string calldata description,
        uint256 price,
        uint256 durationInDays,
        string calldata features
    ) external onlySubscriptionManager {
        require(planId < planCount, "Plan does not exist");
        require(bytes(name).length > 0, "Plan name cannot be empty");
        require(durationInDays > 0, "Duration must be greater than 0");
        
        SubscriptionPlan storage plan = subscriptionPlans[planId];
        
        plan.name = name;
        plan.description = description;
        plan.price = price;
        plan.durationInDays = durationInDays;
        plan.features = features;
        
        emit PlanUpdated(planId, name, price);
    }
    
    /**
     * @dev Deactivate a subscription plan
     * @param planId ID of the plan to deactivate
     */
    function deactivateSubscriptionPlan(uint256 planId) external onlySubscriptionManager {
        require(planId < planCount, "Plan does not exist");
        
        subscriptionPlans[planId].isActive = false;
        
        emit PlanDeactivated(planId);
    }
    
    /**
     * @dev Subscribe to a plan
     * @param planId ID of the plan to subscribe to
     * @param autoRenew Whether to auto-renew the subscription
     */
    function subscribe(uint256 planId, bool autoRenew) external payable {
        require(planId < planCount, "Plan does not exist");
        SubscriptionPlan storage plan = subscriptionPlans[planId];
        
        require(plan.isActive, "Subscription plan is not active");
        require(msg.value >= plan.price, "Insufficient payment");
        
        uint256 subscriptionId = subscriptionCount++;
        uint256 startDate = block.timestamp;
        uint256 endDate = startDate + (plan.durationInDays * 1 days);
        
        userSubscriptions[subscriptionId] = UserSubscription({
            id: subscriptionId,
            subscriber: msg.sender,
            planId: planId,
            startDate: startDate,
            endDate: endDate,
            status: SubscriptionStatus.Active,
            lastPaymentDate: startDate,
            nextPaymentDate: autoRenew ? endDate : 0,
            autoRenew: autoRenew
        });
        
        subscriberSubscriptions[msg.sender].push(subscriptionId);
        
        // Transfer payment to treasury
        (bool success, ) = treasury.call{value: msg.value}("");
        require(success, "Payment transfer failed");
        
        emit SubscriptionCreated(subscriptionId, msg.sender, planId);
    }
    
    /**
     * @dev Renew an existing subscription
     * @param subscriptionId ID of the subscription to renew
     */
    function renewSubscription(uint256 subscriptionId) external payable {
        require(subscriptionId < subscriptionCount, "Subscription does not exist");
        UserSubscription storage subscription = userSubscriptions[subscriptionId];
        
        require(
            subscription.subscriber == msg.sender || 
            _accessControl.hasRole(keccak256("ADMIN_ROLE"), msg.sender) ||
            msg.sender == _accessControl.owner(),
            "Not authorized to renew this subscription"
        );
        
        SubscriptionPlan storage plan = subscriptionPlans[subscription.planId];
        require(plan.isActive, "Subscription plan is no longer active");
        require(msg.value >= plan.price, "Insufficient payment");
        
        subscription.lastPaymentDate = block.timestamp;
        
        // If subscription expired, start fresh from now
        if (subscription.endDate < block.timestamp || subscription.status != SubscriptionStatus.Active) {
            subscription.startDate = block.timestamp;
            subscription.status = SubscriptionStatus.Active;
        }
        
        // Add duration to the end date
        subscription.endDate = subscription.endDate > block.timestamp ? 
                             subscription.endDate + (plan.durationInDays * 1 days) :
                             block.timestamp + (plan.durationInDays * 1 days);
                             
        if (subscription.autoRenew) {
            subscription.nextPaymentDate = subscription.endDate;
        }
        
        // Transfer payment to treasury
        (bool success, ) = treasury.call{value: msg.value}("");
        require(success, "Payment transfer failed");
        
        emit SubscriptionRenewed(subscriptionId, subscription.endDate);
    }
    
    /**
     * @dev Cancel a subscription
     * @param subscriptionId ID of the subscription to cancel
     */
    function cancelSubscription(uint256 subscriptionId) external {
        require(subscriptionId < subscriptionCount, "Subscription does not exist");
        UserSubscription storage subscription = userSubscriptions[subscriptionId];
        
        require(
            subscription.subscriber == msg.sender || 
            _accessControl.hasRole(keccak256("ADMIN_ROLE"), msg.sender) ||
            msg.sender == _accessControl.owner(),
            "Not authorized to cancel this subscription"
        );
        
        subscription.status = SubscriptionStatus.Canceled;
        subscription.autoRenew = false;
        subscription.nextPaymentDate = 0;
        
        emit SubscriptionCanceled(subscriptionId);
    }
    
    /**
     * @dev Pause a subscription (temporary pause)
     * @param subscriptionId ID of the subscription to pause
     */
    function pauseSubscription(uint256 subscriptionId) external {
        require(subscriptionId < subscriptionCount, "Subscription does not exist");
        UserSubscription storage subscription = userSubscriptions[subscriptionId];
        
        require(
            subscription.subscriber == msg.sender || 
            _accessControl.hasRole(keccak256("ADMIN_ROLE"), msg.sender) ||
            msg.sender == _accessControl.owner(),
            "Not authorized to pause this subscription"
        );
        
        require(subscription.status == SubscriptionStatus.Active, "Subscription is not active");
        
        subscription.status = SubscriptionStatus.Paused;
        
        emit SubscriptionPaused(subscriptionId);
    }
    
    /**
     * @dev Resume a paused subscription
     * @param subscriptionId ID of the subscription to resume
     */
    function resumeSubscription(uint256 subscriptionId) external {
        require(subscriptionId < subscriptionCount, "Subscription does not exist");
        UserSubscription storage subscription = userSubscriptions[subscriptionId];
        
        require(
            subscription.subscriber == msg.sender || 
            _accessControl.hasRole(keccak256("ADMIN_ROLE"), msg.sender) ||
            msg.sender == _accessControl.owner(),
            "Not authorized to resume this subscription"
        );
        
        require(subscription.status == SubscriptionStatus.Paused, "Subscription is not paused");
        require(subscription.endDate > block.timestamp, "Subscription has expired");
        
        subscription.status = SubscriptionStatus.Active;
        
        emit SubscriptionResumed(subscriptionId);
    }
    
    /**
     * @dev Get all subscription IDs for a subscriber
     * @param subscriber Address of the subscriber
     * @return uint256[] Array of subscription IDs
     */
    function getSubscriberSubscriptions(address subscriber) external view returns (uint256[] memory) {
        return subscriberSubscriptions[subscriber];
    }
    
    /**
     * @dev Get subscription details
     * @param subscriptionId ID of the subscription
     * @return UserSubscription struct with subscription details
     */
    function getSubscriptionDetails(uint256 subscriptionId) external view returns (UserSubscription memory) {
        require(subscriptionId < subscriptionCount, "Subscription does not exist");
        return userSubscriptions[subscriptionId];
    }
    
    /**
     * @dev Check if a subscription is active
     * @param subscriptionId ID of the subscription
     * @return bool True if active, False otherwise
     */
    function isSubscriptionActive(uint256 subscriptionId) external view returns (bool) {
        require(subscriptionId < subscriptionCount, "Subscription does not exist");
        UserSubscription storage subscription = userSubscriptions[subscriptionId];
        
        return (subscription.status == SubscriptionStatus.Active && subscription.endDate >= block.timestamp);
    }
    
    /**
     * @dev Get all plan IDs
     * @return uint256 Number of plans
     */
    function getPlanCount() external view returns (uint256) {
        return planCount;
    }
    
    /**
     * @dev Update treasury address
     * @param newTreasury Address of the new treasury
     */
    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }
}