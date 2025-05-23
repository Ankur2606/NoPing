import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

/**
 * Component for connecting to Web3 wallets (MetaMask, Trust Wallet, etc.)
 */
const WalletConnect = ({ onConnect, onDisconnect, networkRequired = 56 }) => {
  const [wallet, setWallet] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [networkError, setNetworkError] = useState(false);
  
  // Network names mapping
  const networkNames = {
    1: "Ethereum Mainnet",
    56: "Binance Smart Chain",
    97: "BSC Testnet",
    137: "Polygon",
    80001: "Mumbai Testnet"
  };
  
  // Check if wallet is already connected
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            const chainId = parseInt(await window.ethereum.request({ method: 'eth_chainId' }), 16);
            
            setWallet({
              address: accounts[0],
              chainId,
              networkName: networkNames[chainId] || `Chain ID ${chainId}`
            });
            
            if (chainId !== networkRequired) {
              setNetworkError(true);
            } else if (onConnect) {
              onConnect(accounts[0], chainId);
            }
          }
        } catch (error) {
          console.error("Error checking wallet connection:", error);
        }
      }
    };
    
    checkWalletConnection();
    
    // Listen for account and chain changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [onConnect, networkRequired]);
  
  // Handle account changes
  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      // User has disconnected all accounts
      disconnect();
    } else {
      // Account changed
      setWallet(prev => ({ ...prev, address: accounts[0] }));
      if (!networkError && onConnect) {
        onConnect(accounts[0], wallet?.chainId);
      }
    }
  };
  
  // Handle chain/network changes
  const handleChainChanged = (chainIdHex) => {
    const chainId = parseInt(chainIdHex, 16);
    setWallet(prev => ({
      ...prev,
      chainId,
      networkName: networkNames[chainId] || `Chain ID ${chainId}`
    }));
    
    if (chainId !== networkRequired) {
      setNetworkError(true);
      if (onDisconnect) onDisconnect();
    } else {
      setNetworkError(false);
      if (wallet?.address && onConnect) {
        onConnect(wallet.address, chainId);
      }
    }
    
    // Force reload the page as recommended by MetaMask
    window.location.reload();
  };
  
  // Connect wallet
  const connect = async () => {
    setConnecting(true);
    setError(null);
    
    try {
      // Check if Web3 provider exists
      if (!window.ethereum) {
        throw new Error("No Web3 wallet detected. Please install MetaMask or another Web3 wallet.");
      }
      
      // Request accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainId = parseInt(await window.ethereum.request({ method: 'eth_chainId' }), 16);
      
      setWallet({
        address: accounts[0],
        chainId,
        networkName: networkNames[chainId] || `Chain ID ${chainId}`
      });
      
      // Check if on correct network
      if (chainId !== networkRequired) {
        setNetworkError(true);
        // Try to switch network
        try {
          await switchNetwork(networkRequired);
        } catch (switchError) {
          console.error("Error switching network:", switchError);
          // User declined network switch, but we still have the connection
        }
      } else if (onConnect) {
        onConnect(accounts[0], chainId);
      }
      
    } catch (err) {
      console.error("Error connecting wallet:", err);
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  };
  
  // Disconnect wallet (note: modern wallets don't truly support programmatic disconnect)
  const disconnect = () => {
    setWallet(null);
    setNetworkError(false);
    setError(null);
    if (onDisconnect) onDisconnect();
  };
  
  // Switch network
  const switchNetwork = async (chainId) => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      setNetworkError(false);
    } catch (error) {
      // Error code 4902 means the network is not added to wallet
      if (error.code === 4902 && chainId === 97) {
        try {
          await addBscNetwork();
        } catch (addError) {
          throw new Error("Could not add BSC Testnet network to your wallet.");
        }
      } else {
        throw error;
      }
    }
  };
  
  // Add BSC network to wallet
  const addBscNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0x61', // 97 in hex
            chainName: 'BSC Testnet',
            nativeCurrency: {
              name: 'BNB',
              symbol: 'BNB',
              decimals: 18
            },
            rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
            blockExplorerUrls: ['https://testnet.bscscan.com/']
          }
        ]
      });
    } catch (error) {
      console.error("Error adding BSC Testnet network:", error);
      throw error;
    }
  };
  
  return (
    <Card className="p-5 mb-6">
      <h3 className="text-lg font-semibold mb-3">Connect Wallet</h3>
      
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {networkError && (
        <Alert variant="warning" className="mb-4 bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-600">Wrong Network</AlertTitle>
          <AlertDescription className="text-yellow-600">
            Please switch to {networkNames[networkRequired]} to continue.
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 bg-yellow-100 hover:bg-yellow-200 border-yellow-300"
              onClick={() => switchNetwork(networkRequired)}
            >
              Switch Network
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {wallet ? (
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle2 className="text-green-500 h-5 w-5" />
            <span>Connected: {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
          </div>
          <div className="text-sm text-muted-foreground mb-4">
            Network: {wallet.networkName}
          </div>
          <Button 
            variant="outline" 
            onClick={disconnect}
          >
            Disconnect Wallet
          </Button>
        </div>
      ) : (
        <Button 
          onClick={connect} 
          disabled={connecting}
        >
          {connecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {connecting ? "Connecting..." : "Connect Wallet"}
        </Button>
      )}
    </Card>
  );
};

export default WalletConnect;
