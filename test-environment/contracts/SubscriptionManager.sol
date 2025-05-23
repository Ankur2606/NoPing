// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./PaymentProcessor.sol";

/**
 * @title SubscriptionManager
 * @dev Contract for managing subscriptions paid in BNB
 */
contract SubscriptionManager {
    address public owner;
    PaymentProcessor public paymentProcessor;
    
    // Subscription tier enum
    enum SubscriptionTier { Free, Pro, Enterprise }
    
    // Billing period enum
    enum BillingPeriod { Monthly, Annual }
    
    // Subscription structure
    struct Subscription {
        uint256 id;
        address subscriber;
        SubscriptionTier tier;
        BillingPeriod billingPeriod;
        uint256 startDate;
        uint256 endDate;
        uint256 lastPaymentId;
        bool autoRenew;
        bool active;
    }
    
    // Price structure
    struct PricePoint {
        uint256 monthlyPrice; // Price in wei
        uint256 annualPrice;  // Price in wei
    }
    
    // Mapping subscription tiers to prices
    mapping(SubscriptionTier => PricePoint) public subscriptionPrices;
    
    // Mapping from address to subscription
    mapping(address => Subscription) public subscriptions;
    
    // Mapping from address to subscription history
    mapping(address => Subscription[]) public subscriptionHistory;
    
    // Subscription count
    uint256 public nextSubscriptionId;
    
    // Events
    event SubscriptionCreated(uint256 indexed subscriptionId, address indexed subscriber, SubscriptionTier tier, BillingPeriod period, uint256 endDate);
    event SubscriptionCancelled(uint256 indexed subscriptionId, address indexed subscriber);
    event SubscriptionRenewed(uint256 indexed subscriptionId, address indexed subscriber, uint256 newEndDate);
    event SubscriptionTierChanged(uint256 indexed subscriptionId, address indexed subscriber, SubscriptionTier oldTier, SubscriptionTier newTier);
    event PriceUpdated(SubscriptionTier tier, uint256 monthlyPrice, uint256 annualPrice);
    
    /**
     * @dev Constructor to set the contract owner and payment processor
     * @param _paymentProcessorAddress Address of the PaymentProcessor contract
     */
    constructor(address _paymentProcessorAddress) {
        owner = msg.sender;
        paymentProcessor = PaymentProcessor(_paymentProcessorAddress);
        nextSubscriptionId = 1;
        
        // Set initial prices (in wei)
        // Pro tier: 0.05 BNB monthly / 0.5 BNB annually
        subscriptionPrices[SubscriptionTier.Pro] = PricePoint({
            monthlyPrice: 50000000000000000, // 0.05 BNB in wei
            annualPrice: 500000000000000000  // 0.5 BNB in wei
        });
        
        // Enterprise tier: 0.2 BNB monthly / 2.0 BNB annually
        subscriptionPrices[SubscriptionTier.Enterprise] = PricePoint({
            monthlyPrice: 200000000000000000, // 0.2 BNB in wei
            annualPrice: 2000000000000000000  // 2.0 BNB in wei
        });
        
        // Free tier is always 0
        subscriptionPrices[SubscriptionTier.Free] = PricePoint({
            monthlyPrice: 0,
            annualPrice: 0
        });
    }
    
    /**
     * @dev Modifier to restrict function access to owner only
     */
    modifier onlyOwner() {
        require(msg.sender == owner, "SubscriptionManager: caller is not the owner");
        _;
    }
    
    /**
     * @dev Purchase a subscription
     * @param _tier Subscription tier to purchase
     * @param _period Billing period (monthly or annual)
     * @param _autoRenew Whether to auto-renew the subscription
     * @return subscriptionId The ID of the created subscription
     */
    function purchaseSubscription(SubscriptionTier _tier, BillingPeriod _period, bool _autoRenew) external payable returns (uint256) {
        // Check if tier is valid
        require(_tier == SubscriptionTier.Free || _tier == SubscriptionTier.Pro || _tier == SubscriptionTier.Enterprise, 
                "SubscriptionManager: invalid tier");
        
        // Calculate required payment amount
        uint256 requiredAmount = _period == BillingPeriod.Monthly ? 
                                subscriptionPrices[_tier].monthlyPrice : 
                                subscriptionPrices[_tier].annualPrice;
        
        // Free tier doesn't need payment
        if (_tier != SubscriptionTier.Free) {
            require(msg.value >= requiredAmount, "SubscriptionManager: insufficient payment amount");
        }
        
        uint256 subscriptionId = nextSubscriptionId++;
        uint256 duration = _period == BillingPeriod.Monthly ? 30 days : 365 days;
        uint256 endDate = block.timestamp + duration;
        uint256 paymentId = 0;
        
        // For paid tiers, process payment
        if (_tier != SubscriptionTier.Free && msg.value > 0) {
            string memory metadata = string(abi.encodePacked(
                '{"subscriptionId":"', _uint2str(subscriptionId), 
                '","tier":"', _tierToString(_tier),
                '","period":"', _periodToString(_period), '"}'
            ));
            
            // Forward payment to the payment processor
            paymentId = paymentProcessor.processPayment{value: msg.value}(metadata);
        }
        
        // Archive current subscription to history if exists
        if (subscriptions[msg.sender].id > 0 && subscriptions[msg.sender].active) {
            subscriptionHistory[msg.sender].push(subscriptions[msg.sender]);
            subscriptions[msg.sender].active = false;
        }
        
        // Create new subscription
        subscriptions[msg.sender] = Subscription({
            id: subscriptionId,
            subscriber: msg.sender,
            tier: _tier,
            billingPeriod: _period,
            startDate: block.timestamp,
            endDate: endDate,
            lastPaymentId: paymentId,
            autoRenew: _autoRenew,
            active: true
        });
        
        emit SubscriptionCreated(subscriptionId, msg.sender, _tier, _period, endDate);
        return subscriptionId;
    }
    
    /**
     * @dev Cancel subscription
     */
    function cancelSubscription() external {
        require(subscriptions[msg.sender].active, "SubscriptionManager: no active subscription");
        
        // Move to history
        subscriptionHistory[msg.sender].push(subscriptions[msg.sender]);
        
        // Mark as inactive
        subscriptions[msg.sender].active = false;
        subscriptions[msg.sender].autoRenew = false;
        
        emit SubscriptionCancelled(subscriptions[msg.sender].id, msg.sender);
    }
    
    /**
     * @dev Change subscription tier
     * @param _newTier New subscription tier
     * @param _newPeriod New billing period
     * @return Required additional payment to upgrade, or 0 if downgrading
     */
    function changeTier(SubscriptionTier _newTier, BillingPeriod _newPeriod) external view returns (uint256) {
        require(subscriptions[msg.sender].active, "SubscriptionManager: no active subscription");
        
        SubscriptionTier currentTier = subscriptions[msg.sender].tier;
        BillingPeriod currentPeriod = subscriptions[msg.sender].billingPeriod;
        
        // If moving to free, no payment needed
        if (_newTier == SubscriptionTier.Free) {
            return 0;
        }
        
        // Calculate remaining time on current subscription
        uint256 remainingTime = subscriptions[msg.sender].endDate - block.timestamp;
        
        // Get current and new prices
        uint256 currentPrice = currentPeriod == BillingPeriod.Monthly ? 
                              subscriptionPrices[currentTier].monthlyPrice : 
                              subscriptionPrices[currentTier].annualPrice;
        
        uint256 newPrice = _newPeriod == BillingPeriod.Monthly ? 
                          subscriptionPrices[_newTier].monthlyPrice : 
                          subscriptionPrices[_newTier].annualPrice;
        
        // Calculate prorated current value
        uint256 periodDuration = currentPeriod == BillingPeriod.Monthly ? 30 days : 365 days;
        uint256 proratedCurrentValue = (currentPrice * remainingTime) / periodDuration;
        
        // Calculate required new payment (newPrice - proratedCurrentValue)
        // If downgrading, no additional payment needed
        if (newPrice <= proratedCurrentValue) {
            return 0;
        } else {
            return newPrice - proratedCurrentValue;
        }
    }
    
    /**
     * @dev Process tier change payment
     * @param _newTier New subscription tier
     * @param _newPeriod New billing period
     * @param _autoRenew Whether to auto-renew the subscription
     */
    function processTierChange(SubscriptionTier _newTier, BillingPeriod _newPeriod, bool _autoRenew) external payable {
        require(subscriptions[msg.sender].active, "SubscriptionManager: no active subscription");
        
        SubscriptionTier oldTier = subscriptions[msg.sender].tier;
        uint256 requiredAmount = this.changeTier(_newTier, _newPeriod);
        
        // Check payment amount
        if (requiredAmount > 0) {
            require(msg.value >= requiredAmount, "SubscriptionManager: insufficient payment for tier change");
        }
        
        uint256 paymentId = 0;
        
        // Process payment if needed
        if (requiredAmount > 0 && msg.value > 0) {
            string memory metadata = string(abi.encodePacked(
                '{"subscriptionId":"', _uint2str(subscriptions[msg.sender].id), 
                '","action":"tier_change",',
                '"oldTier":"', _tierToString(oldTier),
                '","newTier":"', _tierToString(_newTier),
                '","period":"', _periodToString(_newPeriod), '"}'
            ));
            
            // Forward payment to payment processor
            paymentId = paymentProcessor.processPayment{value: msg.value}(metadata);
        }
        
        // Calculate new end date
        uint256 duration = _newPeriod == BillingPeriod.Monthly ? 30 days : 365 days;
        uint256 newEndDate = block.timestamp + duration;
        
        // Update subscription
        subscriptions[msg.sender].tier = _newTier;
        subscriptions[msg.sender].billingPeriod = _newPeriod;
        subscriptions[msg.sender].startDate = block.timestamp;
        subscriptions[msg.sender].endDate = newEndDate;
        
        if (requiredAmount > 0) {
            subscriptions[msg.sender].lastPaymentId = paymentId;
        }
        
        subscriptions[msg.sender].autoRenew = _autoRenew;
        
        emit SubscriptionTierChanged(subscriptions[msg.sender].id, msg.sender, oldTier, _newTier);
    }
    
    /**
     * @dev Get subscription details for a user
     * @param _user Address of the user
     * @return Subscription struct with subscription details
     */
    function getSubscription(address _user) external view returns (Subscription memory) {
        return subscriptions[_user];
    }
    
    /**
     * @dev Get subscription history for a user
     * @param _user Address of the user
     * @return Array of subscription structs
     */
    function getSubscriptionHistory(address _user) external view returns (Subscription[] memory) {
        return subscriptionHistory[_user];
    }
    
    /**
     * @dev Update subscription prices (owner only)
     * @param _tier Tier to update
     * @param _monthlyPrice New monthly price in wei
     * @param _annualPrice New annual price in wei
     */
    function updatePrices(SubscriptionTier _tier, uint256 _monthlyPrice, uint256 _annualPrice) external onlyOwner {
        subscriptionPrices[_tier] = PricePoint({
            monthlyPrice: _monthlyPrice,
            annualPrice: _annualPrice
        });
        
        emit PriceUpdated(_tier, _monthlyPrice, _annualPrice);
    }
    
    /**
     * @dev Transfer ownership of the contract (owner only)
     * @param _newOwner New owner address
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "SubscriptionManager: new owner cannot be zero address");
        owner = _newOwner;
    }
    
    /**
     * @dev Check if a user's subscription is active and not expired
     * @param _user Address of the user
     * @return bool Whether the subscription is active and not expired
     */
    function isActiveSubscription(address _user) external view returns (bool) {
        return subscriptions[_user].active && subscriptions[_user].endDate >= block.timestamp;
    }
    
    /**
     * @dev Convert uint to string (helper function)
     * @param _value Value to convert
     * @return string representation
     */
    function _uint2str(uint256 _value) internal pure returns (string memory) {
        if (_value == 0) {
            return "0";
        }
        
        uint256 temp = _value;
        uint256 digits;
        
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (_value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(_value % 10)));
            _value /= 10;
        }
        
        return string(buffer);
    }
    
    /**
     * @dev Convert tier enum to string (helper function)
     * @param _tier Tier enum
     * @return string representation
     */
    function _tierToString(SubscriptionTier _tier) internal pure returns (string memory) {
        if (_tier == SubscriptionTier.Free) return "Free";
        if (_tier == SubscriptionTier.Pro) return "Pro";
        if (_tier == SubscriptionTier.Enterprise) return "Enterprise";
        return "Unknown";
    }
    
    /**
     * @dev Convert period enum to string (helper function)
     * @param _period Period enum
     * @return string representation
     */
    function _periodToString(BillingPeriod _period) internal pure returns (string memory) {
        if (_period == BillingPeriod.Monthly) return "Monthly";
        if (_period == BillingPeriod.Annual) return "Annual";
        return "Unknown";
    }
}
