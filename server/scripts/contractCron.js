require("dotenv").config();
const { ethers } = require("ethers");
const { db } = require("../config/firebase");
const admin = require("firebase-admin");
// const cron = require("node-cron");

// Contract ABI - minimal needed for bulkSaveClassifications
const ABI = [
    "function bulkSaveClassifications(string userId, tuple(string emailId, string label, string reasoning)[] entries) public"
];

const config = {
    rpcUrl: process.env.OPBNB_TESTNET_RPC || "https://opbnb-testnet-rpc.bnbchain.org",
    contractAddress: process.env.EMAIL_CLASSIFICATION_CONTRACT_ADDRESS,
    privateKey: process.env.PRIVATE_KEY,
    gasLimit: process.env.GAS_LIMIT || "2000000",
    gasPrice: process.env.GAS_PRICE || "1000000000"
};

async function getMessagesLast24Hours(userId) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    // Firestore Timestamp from JS Date
    const timestamp24hAgo = admin.firestore.Timestamp.fromDate(oneDayAgo);

    // Query messages where createdAt >= 24 hours ago
    const messagesSnapshot = await db
        .collection("messages")
        .doc(userId)
        .collection("userMessages")
        .where("timestamp", ">=", timestamp24hAgo)
        .get();

    const messages = [];
    messagesSnapshot.forEach(doc => {
        const data = doc.data();
        // Format data for contract - adjust these fields based on your message structure
        messages.push({
            emailId: doc.id,
            label: data.label || "unknown",
            reasoning: data.reasoning || "no reasoning provided"
        });
    });

    return messages;
}

async function insertMessages() {
    try {
        const provider = new ethers.JsonRpcProvider(config.rpcUrl);
        const wallet = new ethers.Wallet(config.privateKey, provider);
        const contract = new ethers.Contract(config.contractAddress, ABI, wallet);

        const users = db.collection("users");
        const snapshot = await users.get();
        if (snapshot.empty) {
            console.log("No users found.");
            return;
        }

        for (const userDoc of snapshot.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();
            if (!userData.profile || !userData.profile.email) {
                console.log(`User ${userId} has no email profile, skipping...`);
                continue;
            }

            console.log(`Processing user: ${userId}`);
            const classifications = await getMessagesLast24Hours(userId);
            if (classifications.length > 0) {
                console.log(`Found ${classifications.length} classifications for user ${userId}`);

                console.log(`[${new Date().toISOString()}] Sending transaction to insert classifications...`);

                const tx = await contract.bulkSaveClassifications(userId, classifications, {
                    gasLimit: config.gasLimit,
                    gasPrice: config.gasPrice
                });

                console.log("Transaction hash:", tx.hash);
                await tx.wait();
                console.log("Transaction confirmed.");
            } else {
                console.log(`No classifications found for user ${userId}`);
            }
        }

    } catch (error) {
        console.error("Error inserting messages:", error);
    }
}

const startCronJob = async () => {
    try {
        console.log("Starting cron job to insert messages...");
        cron.schedule("0 0 * * *", () => {
          console.log(`[${new Date().toISOString()}] Running cron job...`);
          insertMessages();
        });
        console.log("Cron job completed successfully.");
    } catch (error) {
        console.error("Error in cron job:", error);
    }
};


module.exports = {
    insertMessages,
    startCronJob
};
