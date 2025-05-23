const { ethers } = require("hardhat");

/**
 * This script facilitates interaction with the PaymentProcessor contract
 * through a REPL interface, allowing for easy testing of contract functionality.
 */

async function main() {
  const [owner, feeCollector, user1, user2] = await ethers.getSigners();
  console.log("Available accounts:");
  console.log(`Owner: ${owner.address} (${ethers.utils.formatEther(await owner.getBalance())} ETH)`);
  console.log(`Fee Collector: ${feeCollector.address} (${ethers.utils.formatEther(await feeCollector.getBalance())} ETH)`);
  console.log(`User 1: ${user1.address} (${ethers.utils.formatEther(await user1.getBalance())} ETH)`);
  console.log(`User 2: ${user2.address} (${ethers.utils.formatEther(await user2.getBalance())} ETH)`);
  console.log("\n");

  // Get deployment info - you'd need to replace this with your actual deployed address
  // or use a deployment registry in production
  console.log("Loading deployed contracts...");
  
  const PaymentProcessor = await ethers.getContractFactory("PaymentProcessor");
  const AccessControl = await ethers.getContractFactory("AccessControl");

  // If you're using the script after deployment, get the deployed contracts:
  // Feel free to replace these addresses with your deployed contract addresses
  let deployedPaymentProcessor, deployedAccessControl;
  
  try {
    // Try to get deployment from a previous deploy.js run
    const deployments = require('../deployments.json');
    deployedPaymentProcessor = PaymentProcessor.attach(deployments.PaymentProcessor);
    deployedAccessControl = AccessControl.attach(deployments.AccessControl);
    console.log(`Using previously deployed PaymentProcessor at: ${deployments.PaymentProcessor}`);
    console.log(`Using previously deployed AccessControl at: ${deployments.AccessControl}`);
  } catch (error) {
    console.log("No deployment file found, deploying new contracts...");
    
    // Deploy AccessControl
    deployedAccessControl = await AccessControl.deploy();
    await deployedAccessControl.deployed();
    console.log(`Newly deployed AccessControl at: ${deployedAccessControl.address}`);
    
    // Deploy PaymentProcessor
    const feePercentage = 200; // 2%
    deployedPaymentProcessor = await PaymentProcessor.deploy(feeCollector.address, feePercentage);
    await deployedPaymentProcessor.deployed();
    console.log(`Newly deployed PaymentProcessor at: ${deployedPaymentProcessor.address}`);
    
    // Save deployment information
    const fs = require('fs');
    fs.writeFileSync(
      './deployments.json', 
      JSON.stringify({
        PaymentProcessor: deployedPaymentProcessor.address,
        AccessControl: deployedAccessControl.address
      }, null, 2)
    );
  }

  // Store contract instances in global variables for REPL access
  global.contracts = {
    PaymentProcessor: deployedPaymentProcessor,
    AccessControl: deployedAccessControl
  };
  
  global.accounts = {
    owner,
    feeCollector,
    user1,
    user2
  };
  
  global.utils = {
    eth: ethers.utils,
    parseEther: ethers.utils.parseEther,
    formatEther: ethers.utils.formatEther,
    getBalance: async (address) => {
      const balance = await ethers.provider.getBalance(address);
      return `${ethers.utils.formatEther(balance)} ETH`;
    },
    processPayment: async (user, amount, metadata) => {
      const tx = await deployedPaymentProcessor.connect(user).processPayment(
        metadata || JSON.stringify({orderId: Date.now().toString()}),
        { value: ethers.utils.parseEther(amount.toString()) }
      );
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "PaymentReceived");
      return {
        paymentId: event.args.paymentId.toNumber(),
        payer: event.args.payer,
        amount: ethers.utils.formatEther(event.args.amount) + " ETH",
        metadata: event.args.metadata,
        receipt
      };
    }
  };
  
  console.log("\n🔥 Interactive test environment ready!");
  console.log("\nAvailable globals:");
  console.log("- contracts.PaymentProcessor: The deployed PaymentProcessor instance");
  console.log("- contracts.AccessControl: The deployed AccessControl instance");
  console.log("- accounts.owner, accounts.feeCollector, accounts.user1, accounts.user2: Account signers");
  console.log("- utils.eth: Ethers utils");
  console.log("- utils.parseEther(eth): Convert ETH value to wei");
  console.log("- utils.formatEther(wei): Format wei value to ETH string");
  console.log("- utils.getBalance(address): Get balance of an address");
  console.log("- utils.processPayment(user, amountInEth, metadata): Process a payment");
  console.log("\nExample commands:");
  console.log(`
  // Process a payment of 0.1 ETH from user1
  await utils.processPayment(accounts.user1, 0.1, '{"service":"premium"}')
  
  // Check balances
  await utils.getBalance(accounts.feeCollector.address) 
  await utils.getBalance(accounts.owner.address)
  
  // Get payment details
  await contracts.PaymentProcessor.getPayment(1)
  
  // Update fee percentage (as owner)
  await contracts.PaymentProcessor.setFeePercentage(300) // 3%
  await contracts.PaymentProcessor.feePercentage()
  `);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
