const { Client } = require('@bnb-chain/greenfield-js-sdk');
const fs = require('fs');
const { ethers } = require('ethers');

const RPC_URL = 'https://gnfd-testnet-fullnode-tendermint-ap.bnbchain.org';
const CHAIN_ID = '5600';
const PRIVATE_KEY = 'a42c4cdd5730119ada581bdb01139bbb86e0e51fd789fb922f48762d3df29056'; // Replace with your private key
const BUCKET_NAME = 'bookit'; // Replace with your bucket name
const OBJECT_NAME = 'voice.mp3';
const FILE_PATH = './server/mp3/voice.mp3';

async function main() {
    // Initialize wallet and get address
    const wallet = new ethers.Wallet(PRIVATE_KEY);
    const address = wallet.address;
    console.log('Using address:', address);

    // Create client
    const client = Client.create(RPC_URL, CHAIN_ID);

    // Get storage providers
    const sps = await client.sp.getStorageProviders();
    const primarySp = sps[0]; // Select first storage provider
    const spEndpoint = primarySp.endpoint;
    const spAddress = primarySp.operatorAddress;

    // Check if bucket exists, create if not
    try {
        await client.bucket.headBucket(BUCKET_NAME);
        console.log('Bucket exists');
    } catch (error) {
        console.log('Bucket does not exist, creating...');
        const createBucketTx = await client.bucket.createBucket({
            bucketName: BUCKET_NAME,
            creator: address,
            visibility: 'public-read',
            chargedReadQuota: ethers.parseUnits('0', 0),
            paymentAddress: address,
            primarySpAddress: spAddress,
        }, {
            type: 'ECDSA',
            privateKey: PRIVATE_KEY,
        });
        await createBucketTx.broadcast({
            type: 'ECDSA',
            privateKey: PRIVATE_KEY,
        });
        console.log('Bucket created');
    }

    // Create object
    const fileBuffer = fs.readFileSync(FILE_PATH);
    const createObjectTx = await client.object.createObject({
        bucketName: BUCKET_NAME,
        objectName: OBJECT_NAME,
        creator: address,
        visibility: 'public-read',
        contentType: 'audio/mpeg',
        redundancyType: 'REDUNDANCY_EC_TYPE',
        payloadSize: fileBuffer.length,
        expectChecksums: [],
    }, {
        type: 'ECDSA',
        privateKey: PRIVATE_KEY,
    });
    const createObjectTxRes = await createObjectTx.broadcast({
        type: 'ECDSA',
        privateKey: PRIVATE_KEY,
    });

    // Upload object
    const uploadRes = await client.object.uploadObject({
        bucketName: BUCKET_NAME,
        objectName: OBJECT_NAME,
        body: {
            name: OBJECT_NAME,
            type: 'audio/mpeg',
            size: fileBuffer.length,
            content: fileBuffer,
        },
        txnHash: createObjectTxRes.transactionHash,
    }, {
        type: 'ECDSA',
        privateKey: PRIVATE_KEY,
    });
    console.log('Upload response:', uploadRes);

    // Get object URL
    const objectUrl = `${spEndpoint}/view/${BUCKET_NAME}/${OBJECT_NAME}`;
    console.log('Object URL:', objectUrl);

    // Fetch object programmatically
    const getObjectRes = await client.object.getObject({
        bucketName: BUCKET_NAME,
        objectName: OBJECT_NAME,
    }, {
        type: 'ECDSA',
        privateKey: PRIVATE_KEY,
    });
    console.log('Get object response:', getObjectRes);
}

main().catch(console.error);