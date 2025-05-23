import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2 } from "lucide-react";
import { subscriptionApi } from '@/services/api';
import { SUBSCRIPTION_TIERS } from '@/services/subscriptionConstants';

/**
 * Component for displaying subscription plans
 */
const SubscriptionPlans = ({ onPlanSelect, currentSubscription }) => {
  const [selectedTier, setSelectedTier] = useState('PRO');
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [plans, setPlans] = useState([]);
  const [bnbPriceUsd, setBnbPriceUsd] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Fetch subscription plans from backend
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const response = await subscriptionApi.getSubscriptionPlans();
        if (response.success) {
          setPlans(response.plans);
          setBnbPriceUsd(response.bnbPriceUsd);
        }
      } catch (error) {
        console.error("Error fetching subscription plans:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlans();
  }, []);
  
  // Pre-select current subscription if available
  useEffect(() => {
    if (currentSubscription && currentSubscription.status === 'active') {
      setSelectedTier(currentSubscription.tier);
      setSelectedPeriod(currentSubscription.billingPeriod.toLowerCase());
    }
  }, [currentSubscription]);
  
  // Handle tier selection
  const handleTierChange = (tier) => {
    setSelectedTier(tier);
  };
  
  // Handle period selection
  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
  };
  
  // Check if the plan is already active
  const isCurrentActivePlan = (tierId, period) => {
    return (
      currentSubscription && 
      currentSubscription.status === 'active' && 
      currentSubscription.tier === tierId && 
      currentSubscription.billingPeriod.toLowerCase() === period.toLowerCase()
    );
  };

  // Handle plan selection
  const handlePlanSelection = () => {
    if (onPlanSelect) {
      const selectedPlan = plans.find(plan => plan.id === selectedTier.toLowerCase());
      if (selectedPlan) {
        onPlanSelect({
          tier: selectedTier,
          period: selectedPeriod,
          price: selectedPlan.pricing[selectedPeriod]?.bnb || 0
        });
      }
    }
  };
  
  // Get price for selected tier and period
  const getPrice = (tierId, period) => {
    if (loading || !plans.length) return '...';
    const plan = plans.find(p => p.id === tierId.toLowerCase());
    return plan?.pricing?.[period]?.bnb || 0;
  };
  
  // Get USD price for selected tier and period
  const getUsdPrice = (tierId, period) => {
    if (loading || !plans.length) return '...';
    const plan = plans.find(p => p.id === tierId.toLowerCase());
    return plan?.pricing?.[period]?.usd || 0;
  };
  
  // Get annual saving percentage
  const getAnnualSaving = (tierId) => {
    if (loading || !plans.length) return 0;
    const plan = plans.find(p => p.id === tierId.toLowerCase());
    if (!plan?.pricing) return 0;
    
    const monthlyPrice = plan.pricing.monthly?.bnb * 12;
    const annualPrice = plan.pricing.annual?.bnb;
    
    if (!monthlyPrice || !annualPrice) return 0;
    return Math.round((1 - (annualPrice / monthlyPrice)) * 100);
  };
  
  // Get features for a specific plan
  const getPlanFeatures = (planId) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return [];
    
    const featuresList = [];
    
    // Message limit
    if (plan.features.messageLimit === -1) {
      featuresList.push('Unlimited messages');
    } else {
      featuresList.push(`${plan.features.messageLimit.toLocaleString()} messages per month`);
    }
    
    // Task limit
    if (plan.features.taskLimit === -1) {
      featuresList.push('Unlimited tasks');
    } else {
      featuresList.push(`Up to ${plan.features.taskLimit.toLocaleString()} tasks`);
    }
    
    // Service limit
    if (plan.features.serviceLimit === -1) {
      featuresList.push('Unlimited services');
    } else {
      featuresList.push(`Up to ${plan.features.serviceLimit.toLocaleString()} services`);
    }
    
    // Add other features
    if (plan.features.audioTranscriptions) {
      featuresList.push('Audio transcriptions');
    }
    
    if (plan.features.prioritySupport) {
      featuresList.push('Priority support');
    }
    
    if (plan.features.aiPrioritization) {
      featuresList.push('AI message prioritization');
    }
    
    return featuresList;
  };
  
  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-3 text-lg">Loading subscription plans...</span>
        </div>
      ) : (
        <>
          <div className="flex justify-center gap-4 mb-8">
            <RadioGroup 
              defaultValue="monthly" 
              value={selectedPeriod}
              onValueChange={handlePeriodChange}
              className="flex items-center space-x-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly">Monthly</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="annual" id="annual" />
                <Label htmlFor="annual">Annual</Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.id}
                className={`border-2 ${selectedTier === plan.id.toUpperCase() ? 'border-blue-400' : 'border-gray-200'}`}
              >
                <CardHeader>
                  {plan.popular && (
                    <div className="bg-blue-100 text-blue-800 text-xs font-semibold py-1 px-2 rounded-full w-fit">
                      {plan.highlight || 'MOST POPULAR'}
                    </div>
                  )}
                  <CardTitle className={plan.popular ? "mt-2" : ""}>{plan.displayName}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{getPrice(plan.id, selectedPeriod)}</span>
                    <span className="text-muted-foreground ml-1">BNB</span>
                    <span className="text-muted-foreground ml-1">
                      /{selectedPeriod === 'monthly' ? 'month' : 'year'}
                    </span>
                    
                    {plan.id !== 'free' && selectedPeriod === 'annual' && (
                      <div className="text-sm text-green-600 font-medium mt-1">
                        Save {getAnnualSaving(plan.id)}% with annual billing
                      </div>
                    )}
                    
                    {bnbPriceUsd > 0 && plan.id !== 'free' && (
                      <div className="text-xs text-muted-foreground mt-1">
                        ~${getUsdPrice(plan.id, selectedPeriod)} USD
                      </div>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <ul className="space-y-2">
                    {getPlanFeatures(plan.id).map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    variant={selectedTier === plan.id.toUpperCase() ? "default" : "outline"} 
                    className="w-full"
                    onClick={() => handleTierChange(plan.id.toUpperCase())}
                    disabled={isCurrentActivePlan(plan.id, selectedPeriod)}
                  >
                    {isCurrentActivePlan(plan.id, selectedPeriod) 
                      ? 'Currently Active' 
                      : selectedTier === plan.id.toUpperCase() 
                        ? 'Selected' 
                        : 'Select Plan'
                    }
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          <div className="flex justify-center mt-8">
            <Button size="lg" onClick={handlePlanSelection}>
              {currentSubscription ? 'Update Subscription' : 'Continue to Payment'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default SubscriptionPlans;
