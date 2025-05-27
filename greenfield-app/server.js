const express = require('express');
const { Client } = require('@bnb-chain/greenfield-js-sdk');
const { ethers } = require('ethers');

const app = express();
const port = 3000;

const RPC_URL = 'https://gnfd-testnet-fullnode-tendermint-ap.bnbchain.org';
const CHAIN_ID = '5600';
const PRIVATE_KEY = ''; // Replace with your private key
const BUCKET_NAME = 'bookit'; // Replace with your bucket name
const OBJECT_NAME = 'voice.mp3';

app.get('/voice.mp3', async(req, res) => {
    try {
        // Initialize client
        const client = Client.create(RPC_URL, CHAIN_ID);

        // Get object
        const getObjectRes = await client.object.getObject({
            bucketName: BUCKET_NAME,
            objectName: OBJECT_NAME,
        }, {
            type: 'ECDSA',
            privateKey: PRIVATE_KEY,
        });

        // Send response
        res.set('Content-Type', 'audio/mpeg');
        res.send(getObjectRes.content);
    } catch (error) {
        console.error('Error fetching file:', error);
        res.status(500).send('Error fetching file');
    }
});

// Serve static files from the server directory
app.use('/static', express.static('server'));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Access voice file at http://localhost:${port}/voice.mp3`);
});