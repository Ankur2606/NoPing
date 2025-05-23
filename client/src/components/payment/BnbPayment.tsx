/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import WalletConnect from "./WalletConnect";
import { QRCodeSVG } from 'qrcode.react';  // Changed to QRCodeSVG which is the correct named export
import axios from 'axios';
import { paymentApi } from '@/services/api';

// Add ethereum to the Window type for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * Component for handling BNB payments
 */
const BnbPayment = ({ 
  amount, 
  onPaymentSuccess, 
  onPaymentError,
  metadata = {},
  subscriptionTier,
  subscriptionPeriod
}) => {
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle, processing, success, error
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [verifyingTx, setVerifyingTx] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const { toast } = useToast();

  // Initialize payment intent
  useEffect(() => {
    if (amount >= 0) {
      createPaymentIntent();
    }
  }, [amount]);

  // Create payment intent on the server
  const createPaymentIntent = async () => {
    try {
      setPaymentStatus('processing');
      const response = await paymentApi.createBnbPaymentIntent({
          amount,
          metadata: {
              ...metadata,
            },
            tier: subscriptionTier,
            billingPeriod: subscriptionPeriod,
          amountUsd: 0
      })
    //   const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/payments/bnb/create`, {
    //     amount,
    //     metadata: {
    //       ...metadata,
    //       subscriptionTier,
    //       subscriptionPeriod
    //     }
    //   });

    console.log("Payment Intent Response:", response);
      
      setPaymentIntent(response.data);
      
      // Set expiration countdown
      if (response.data.expiresAt) {
        const expiresAt = new Date(response.data.expiresAt).getTime();
        const now = Date.now();
        const timeLeft = Math.floor((expiresAt - now) / 1000);
        setCountdown(timeLeft > 0 ? timeLeft : 0);
      }
      
      setPaymentStatus('idle');
    } catch (error) {
      console.error("Error creating payment intent:", error);
      setPaymentStatus('error');
      if (onPaymentError) {
        onPaymentError(error);
      }
      toast({
        title: "Error",
        description: "Failed to create payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle wallet connection
  const handleWalletConnect = (address) => {
    setWalletConnected(true);
    setWalletAddress(address);
  };

  // Handle wallet disconnection
  const handleWalletDisconnect = () => {
    setWalletConnected(false);
    setWalletAddress(null);
  };

  // Send payment from connected wallet
  const sendPaymentFromWallet = async () => {
    if (!walletConnected || !window.ethereum) {
      toast({
        title: "Error",
        description: "Wallet not connected.",
        variant: "destructive",
      });
      return;
    }

    try {
      setPaymentStatus('processing');
      
      // Prepare transaction
      const txParams = {
        to: paymentIntent.paymentAddress,
        from: walletAddress,
        value: `0x${(amount * 1e18).toString(16)}`, // Convert BNB to wei
      };

      // Request transaction
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [txParams],
      });
      
      toast({
        title: "Transaction Sent",
        description: "Please wait for confirmation...",
      });

      // Verify transaction on server
      await verifyTransaction(txHash);
      
    } catch (error) {
      console.error("Error sending payment:", error);
      setPaymentStatus('error');
      toast({
        title: "Transaction Failed",
        description: error.message,
        variant: "destructive",
      });
      if (onPaymentError) {
        onPaymentError(error);
      }
    }
  };

  // Verify transaction on server
  const verifyTransaction = async (txHash) => {
    try {
      setVerifyingTx(true);
      
      // Poll for transaction verification
      let verified = false;
      let attempts = 0;
      
      while (!verified && attempts < 10) {
        try {
          // Wait 3 seconds between attempts
          if (attempts > 0) {
            await new Promise(r => setTimeout(r, 3000));
          }
          
          const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/payments/bnb/verify`, {
            txHash,
            paymentId: paymentIntent.id,
            amount
          });
          
          if (response.data.verified) {
            verified = true;
            setPaymentStatus('success');
            if (onPaymentSuccess) {
              onPaymentSuccess(response.data);
            }
            toast({
              title: "Payment Successful",
              description: "Your transaction has been confirmed.",
              variant: "default",
            });
          }
        } catch (error) {
          console.log("Verification attempt failed, retrying...");
          attempts++;
        }
      }
      
      if (!verified) {
        throw new Error("Transaction verification timed out. It may take longer to process.");
      }
      
    } catch (error) {
      console.error("Error verifying transaction:", error);
      setPaymentStatus('error');
      toast({
        title: "Verification Error",
        description: error.message,
        variant: "destructive",
      });
      if (onPaymentError) {
        onPaymentError(error);
      }
    } finally {
      setVerifyingTx(false);
    }
  };

  // Copy address to clipboard
  const copyAddressToClipboard = () => {
    if (paymentIntent?.paymentAddress) {
      navigator.clipboard.writeText(paymentIntent.paymentAddress);
      toast({
        description: "Address copied to clipboard",
      });
    }
  };

  // Format countdown time
  const formatCountdown = (seconds) => {
    if (seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Countdown timer
  useEffect(() => {
    if (countdown === null) return;
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [countdown]);

  // Check if payment expired
  const isExpired = countdown === 0;

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Pay with BNB</CardTitle>
        <CardDescription>
          Send exactly {amount} BNB to complete your payment
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <WalletConnect
          onConnect={handleWalletConnect}
          onDisconnect={handleWalletDisconnect}
          networkRequired={97} // BSC Mainnet
        />
        
        {paymentIntent ? (
          <>
            {paymentStatus === 'success' ? (
              <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-md">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
                <h3 className="text-xl font-semibold text-green-700">Payment Successful!</h3>
                <p className="text-sm text-green-600 mt-2">
                  Your transaction has been confirmed and your subscription is now active.
                </p>
              </div>
            ) : (
              <>
                {isExpired ? (
                  <div className="text-center p-4 bg-red-50 rounded-md mb-4">
                    <p className="text-red-600 font-medium">This payment request has expired.</p>
                    <Button 
                      variant="outline" 
                      onClick={createPaymentIntent}
                      className="mt-2"
                    >
                      Create New Payment Request
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Payment expires in:</span>
                      <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                        {formatCountdown(countdown)}
                      </span>
                    </div>
                    
                    <div className="border rounded-md p-4 mb-4">
                      <div className="flex justify-center mb-4">
                        <QRCodeSVG  // Changed from QRCode to QRCodeSVG
                          value={`binance:${paymentIntent.paymentAddress}?amount=${amount}`}
                          size={180}
                          level="M"
                          includeMargin={true}
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium mb-1">Amount</p>
                          <div className="font-mono bg-gray-50 p-2 rounded flex justify-between items-center">
                            <span>{amount} BNB</span>
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium mb-1">Send to this address</p>
                          <div className="font-mono text-sm bg-gray-50 p-2 rounded flex justify-between items-center break-all">
                            <span>{paymentIntent.paymentAddress}</span>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0" 
                              onClick={copyAddressToClipboard}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-red-500 mt-1">
                            * Send only BNB on the BSC network
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        ) : (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col space-y-3">
        {paymentIntent && paymentStatus !== 'success' && !isExpired && (
          <>
            {walletConnected ? (
              <Button 
                className="w-full" 
                onClick={sendPaymentFromWallet} 
                disabled={paymentStatus === 'processing' || verifyingTx}
              >
                {(paymentStatus === 'processing' || verifyingTx) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {paymentStatus === 'processing' ? 'Processing...' : 
                  verifyingTx ? 'Verifying...' : 'Pay Now with Connected Wallet'}
              </Button>
            ) : (
              <p className="text-sm text-gray-500 text-center">
                Connect your wallet above to pay directly, or send BNB to the address manually.
              </p>
            )}
            
            <div className="text-xs text-gray-500 text-center">
              <a 
                href={`https://bscscan.com/address/${paymentIntent.paymentAddress}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center text-blue-600 hover:underline"
              >
                View on BSCScan <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          </>
        )}
      </CardFooter>
    </Card>
  );
};

export default BnbPayment;
