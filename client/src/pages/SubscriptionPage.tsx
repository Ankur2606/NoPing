import React, { useState, useEffect } from 'react';
// import { Container } from "@/components/ui/container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { CheckCircle2, Calendar, Loader2, Receipt, Ban } from "lucide-react";
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { Container } from '@/components/ui/container';
import { Layout } from '@/components/layout/Layout';
import { subscriptionApi, paymentApi } from '@/services/api';
import SubscriptionPlans from '@/components/payment/SubscriptionPlans';
import Web3Payment from '@/components/payment/Web3Payment';

/**
 * Subscription management page
 */
const SubscriptionPage = () => {
  const [activeTab, setActiveTab] = useState("plans");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch current subscription
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setLoading(true);
        const response = await subscriptionApi.getCurrentSubscription();
        console.log("Current Subscription:", response);
        setCurrentSubscription(response.subscription);
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (currentUser) {
      fetchSubscription();
    }
  }, [currentUser]);

  // Fetch payment history when history tab is selected
  useEffect(() => {
    const fetchPaymentHistory = async () => {
      if (activeTab === "history" && currentUser) {
        try {
          setPaymentsLoading(true);
          const response = await paymentApi.getPaymentHistory();
          console.log("Payment History:", response);
          setPayments(response.payments || []);
        } catch (error) {
          console.error("Error fetching payment history:", error);
          toast({
            title: "Error",
            description: "Failed to load payment history. Please try again.",
            variant: "destructive",
          });
        } finally {
          setPaymentsLoading(false);
        }
      }
    };
    
    fetchPaymentHistory();
  }, [activeTab, currentUser, toast]);

  // Handle plan selection
  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setPaymentAmount(plan.price);
    setActiveTab("payment");
  };

  // Handle payment success
  const handlePaymentSuccess = async (paymentData) => {
    try {
      const apiFunction =currentSubscription ? subscriptionApi.changeTier:subscriptionApi.startSubscription;
      console.log("Payment Data:", paymentData);
      // const response = await apiFunction({
      //   tier: selectedPlan.tier.toLowerCase(),
      //   billingPeriod: selectedPlan.period.toUpperCase(),
      //   txnid: paymentData.txnhash,
      // })
      
      toast({
        title: "Subscription Updated",
        description: "Your subscription has been successfully updated.",
        variant: "default",
      });
      // console.log("Subscription updated successfully:", response);
      // Refresh subscription data
      // setCurrentSubscription(response.data);
      
      // Move to subscription tab
      setActiveTab("subscription");
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast({
        title: "Error",
        description: "Failed to update subscription. Please contact support.",
        variant: "destructive",
      });
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(date);
  };

  // Cancel subscription
  const handleCancelSubscription = async () => {
    try {
      setLoading(true);
      await axios.post(`${import.meta.env.VITE_API_BASE_URL}/subscriptions/cancel`);
      
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled.",
        variant: "default",
      });
      
      // Refresh subscription data
      const response = await subscriptionApi.cancelSubscription();
      setCurrentSubscription(response);
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
    <Container className="py-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Subscription Management</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-5">
            <TabsTrigger value="subscription">Your Subscription</TabsTrigger>
            <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
            {selectedPlan && <TabsTrigger value="payment">Payment</TabsTrigger>}
            <TabsTrigger value="history">Payment History</TabsTrigger>
          </TabsList>
          
          {/* Current Subscription Tab */}
          <TabsContent value="subscription">
            {loading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Your Current Subscription</CardTitle>
                  <CardDescription>
                    Details about your FlowSync subscription
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  {currentSubscription ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">
                            {currentSubscription.tier} Plan
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {currentSubscription.billingPeriod.toLowerCase() === 'monthly' ? 'Monthly' : 'Annual'} billing
                          </p>
                        </div>
                        <Badge variant={currentSubscription.status=='active' ? "default" : "destructive"}>
                          {currentSubscription.status=='active' ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      
                      <Separator />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-1">Billing Period</h4>
                          <p className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                            {currentSubscription.billingPeriod.toLowerCase() === 'monthly' ? 'Monthly' : 'Annual'}
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium mb-1">Next billing date</h4>
                          <p>{formatDate(currentSubscription.endDate)}</p>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium mb-1">Started on</h4>
                          <p>{formatDate(currentSubscription.startDate)}</p>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium mb-1">Auto-renew</h4>
                          <p>{currentSubscription.autoRenew ? 'Yes' : 'No'}</p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Features & Limits</h3>
                        <ul className="space-y-2">
                          {Object.entries(currentSubscription.features || {}).map(([key, feature]) => (
                            <li key={key} className="flex items-start">
                              <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                              <span>{key}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <h3 className="text-lg font-medium mb-2">No active subscription</h3>
                      <p className="text-muted-foreground mb-4">
                        You don't have an active subscription plan at the moment.
                      </p>
                      <Button onClick={() => setActiveTab("plans")}>
                        View Subscription Plans
                      </Button>
                    </div>
                  )}
                </CardContent>
                
                {currentSubscription && currentSubscription.active && (
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleCancelSubscription} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Cancel Subscription
                    </Button>
                    <Button onClick={() => setActiveTab("plans")}>
                      Change Plan
                    </Button>
                  </CardFooter>
                )}
              </Card>
            )}
          </TabsContent>
          
          {/* Subscription Plans Tab */}
          <TabsContent value="plans">
            <SubscriptionPlans
              onPlanSelect={handlePlanSelect}
              currentSubscription={currentSubscription}
            />
          </TabsContent>
          
          {/* Payment Tab */}
          <TabsContent value="payment">
            {selectedPlan && (
              <div>
                <h2 className="text-xl font-semibold mb-6">
                  Complete your payment for {selectedPlan.tier} plan
                </h2>
                
                <Web3Payment
                  amount={paymentAmount}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={(error) => console.error("Payment error:", error)}
                  metadata={{
                    userId: currentUser?.uid,
                    plan: selectedPlan.tier,
                    billingPeriod: selectedPlan.period
                  }}
                  subscriptionTier={selectedPlan.tier}
                  subscriptionPeriod={selectedPlan.period}
                />
              </div>
            )}
          </TabsContent>
          
          {/* Payment History Tab */}
          <TabsContent value="history">
            {paymentsLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>
                    View all your previous payments
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  {payments.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <p>No payment history found.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {payments.map((payment) => (
                        <div key={payment.id} className="p-4 border rounded-md shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-medium">
                                {payment.subscriptionTier || payment.metadata?.plan || 'Payment'} - {payment.billingPeriod || payment.metadata?.billingPeriod || 'One-time'}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(payment.createdAt || payment.date)}
                              </p>
                            </div>
                            <div>
                              <Badge variant={payment.status === 'completed' ? "default" : "destructive"}>
                                {payment.status === 'completed' ? "Completed" : "Failed"}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-lg font-semibold">
                              ${payment.amountUsd || payment.amount}
                              <span className="text-xs text-muted-foreground ml-1">
                                {payment.currency ? payment.currency.toUpperCase() : 'USD'}
                              </span>
                            </span>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Receipt className="h-4 w-4 mr-1" />
                              {payment.paymentMethod || payment.paymentGateway || 'Crypto'}
                            </div>
                          </div>
                          
                          {payment.txHash && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              <p className="truncate">Tx: {payment.txHash}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Container>
  </Layout>

  );
};

export default SubscriptionPage;
