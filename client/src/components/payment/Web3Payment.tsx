import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Separator } from "@/components/ui/separator";
import PaymentProcessorABI from '../contracts/PaymentProcessor.sol/PaymentProcessor.json'
// Subscription functionality has been removed
// import SubscriptionManagerABI from '../../contracts/SubscriptionManager.json';

interface Web3PaymentProps {
  amount: number;
  onPaymentSuccess: (data: Record<string, unknown>) => void;
  onPaymentError: (error: unknown) => void;
  metadata: {
    userId: string;
    plan: string;
    billingPeriod: string;
  };
  subscriptionTier: string;
  subscriptionPeriod: string;
}

const Web3Payment: React.FC<Web3PaymentProps> = ({
  amount,
  onPaymentSuccess,
  onPaymentError,
  metadata,
  subscriptionTier,
  subscriptionPeriod,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  // Only using direct payment - subscription option removed
  const [paymentMethod, setPaymentMethod] = useState<'direct'>('direct');
  const [walletConnected, setWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);

  // Contract addresses - replace with your actual deployed contract addresses
  const PAYMENT_PROCESSOR_ADDRESS = import.meta.env.VITE_PAYMENT_PROCESSOR_ADDRESS || '';
//   const SUBSCRIPTION_MANAGER_ADDRESS = import.meta.env.VITE_SUBSCRIPTION_MANAGER_ADDRESS || '';
  
  useEffect(() => {
    // Check if wallet is already connected
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const accounts = await provider.listAccounts();
          
          if (accounts.length > 0) {
            setWalletConnected(true);
            setUserAddress(accounts[0]);
          }
        } catch (err) {
          console.error("Error checking wallet connection:", err);
        }
      }
    };
    
    checkConnection();
  }, []);

  // Connect to wallet
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        setLoading(true);
        
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        
        setWalletConnected(true);
        setUserAddress(address);
        setError(null);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error("Error connecting to wallet:", errorMsg);
        setError("Failed to connect wallet. " + errorMsg || "Please try again.");
        onPaymentError(err);
      } finally {
        setLoading(false);
      }
    } else {
      setError("MetaMask or compatible wallet not detected. Please install MetaMask to continue.");
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setWalletConnected(false);
    setUserAddress(null);
    setError(null);
  };

  // Process direct payment
  const processDirectPayment = async () => {
    if (!window.ethereum || !userAddress) {
      setError("Wallet not connected");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Create contract instance
      const paymentProcessor = new ethers.Contract(
        PAYMENT_PROCESSOR_ADDRESS,
        PaymentProcessorABI.abi,
        signer
      );
      
      // Convert amount to wei (BNB has 18 decimals)
      const amountInWei = ethers.utils.parseEther(amount.toString());
      
      // Create a metadata string with the subscription info
      const metadataStr = JSON.stringify({
        userId: metadata.userId,
        subscriptionTier: metadata.plan,
        billingPeriod: metadata.billingPeriod,
        timestamp: Date.now()
      });
      
      // Process the payment through the contract
      // Note: no need to specify payee address as it's fixed in the contract
      const tx = await paymentProcessor.processPayment(
        `subscription-${metadata.plan}-${Date.now()}`, // reference
        metadataStr, // metadata
        { value: amountInWei } // send the required BNB
      );
      
      setTxHash(tx.hash);
      
      // Wait for the transaction to be mined
      const receipt = await tx.wait();
      
      // Check if transaction was successful
      if (receipt.status === 1) {
        setSuccess(true);
        
        // Get the payment ID from the event
        const events = receipt.events?.filter(e => e.event === 'PaymentCreated');
        const paymentId = events && events[0]?.args?.paymentId.toString();
        
        // Pass payment details to parent component
        onPaymentSuccess({
          paymentId: paymentId,
          txHash: tx.hash,
          amount: amount,
          paymentMethod: 'BNB Smart Chain',
          status: 'completed'
        });
      } else {
        throw new Error("Transaction failed");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("Payment error:", errorMsg);
      setError(errorMsg || "Payment failed. Please try again.");
      onPaymentError(err);
    } finally {
      setLoading(false);
    }
  };

  // Process payment based on selected method
  const processPayment = () => {
    processDirectPayment();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pay with BNB</CardTitle>
          <CardDescription>
            Complete your payment using BNB on the BNB Smart Chain
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Payment Info */}
          <div className="space-y-4">
            <h3 className="font-medium">Payment Method</h3>
            <div className="p-3 bg-slate-50 rounded-md border border-slate-200">
              <div className="text-left">
                <div className="font-medium">Direct Payment</div>
                <div className="text-xs text-muted-foreground">
                  One-time payment using PaymentProcessor contract
                </div>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Payment Summary */}
          <div className="space-y-2">
            <h3 className="font-medium">Payment Summary</h3>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Subscription:</span>
              <span>{subscriptionTier} ({subscriptionPeriod})</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-bold">{amount} BNB</span>
            </div>
          </div>
          
          {/* Wallet Connection */}
          {!walletConnected ? (
            <Button 
              onClick={connectWallet}
              className="w-full"
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Connect Wallet
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 rounded-md border border-green-200">
                <p className="text-green-800 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Wallet connected: {userAddress?.substring(0, 6) + '...' + userAddress?.substring(userAddress.length - 4)}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={processPayment}
                  className="flex-1"
                  disabled={loading || success}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {success ? 'Payment Successful' : `Pay ${amount} BNB`}
                </Button>
                
                <Button 
                  onClick={disconnectWallet}
                  variant="outline"
                  disabled={loading}
                >
                  Disconnect
                </Button>
              </div>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Success Message */}
          {success && (
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Payment Successful!</AlertTitle>
              <AlertDescription>
                Your payment has been processed successfully.
                {txHash && (
                  <p className="mt-2 text-xs">
                    Transaction hash: {txHash.substring(0, 10) + '...' + txHash.substring(txHash.length - 6)}
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      <div className="text-center text-sm text-muted-foreground">
        <p>Your payment will be processed on the BNB Smart Chain through our secure smart contract.</p>
        <p className="mt-1">Make sure you have enough BNB in your wallet to cover the transaction.</p>
      </div>
    </div>
  );
};

export default Web3Payment;
