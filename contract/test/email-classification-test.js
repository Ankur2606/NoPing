const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Email Classification Contracts", function () {
  let accessControl;
  let emailClassificationStorage;
  let emailBatchStorage;
  let owner;
  let backend;
  let user1;
  let user2;
  let BACKEND_ROLE;

  beforeEach(async function () {
    // Get signers
    [owner, backend, user1, user2] = await ethers.getSigners();
    
    // Deploy contracts
    const AccessControl = await ethers.getContractFactory("AccessControl");
    accessControl = await AccessControl.deploy();
    
    const EmailClassificationStorage = await ethers.getContractFactory("EmailClassificationStorage");
    emailClassificationStorage = await EmailClassificationStorage.deploy(accessControl.address);
    
    const EmailBatchStorage = await ethers.getContractFactory("EmailBatchStorage");
    emailBatchStorage = await EmailBatchStorage.deploy(accessControl.address);
    
    // Define roles
    BACKEND_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BACKEND_ROLE"));
    
    // Grant backend role to the backend account
    await accessControl.grantRole(BACKEND_ROLE, backend.address);
  });

  describe("EmailClassificationStorage", function () {
    it("Should allow backend to add a classification", async function () {
      const emailId = "email-123";
      const label = 0; // FLOW_CRITICAL
      const reasoning = "This email requires immediate attention";
      
      await expect(
        emailClassificationStorage.connect(backend).addClassification(
          user1.address, 
          emailId, 
          label, 
          reasoning
        )
      ).to.emit(emailClassificationStorage, "ClassificationAdded")
       .withArgs(user1.address, emailId, label);
    });
    
    it("Should not allow non-backend to add a classification", async function () {
      const emailId = "email-456";
      const label = 1; // FLOW_ACTION
      const reasoning = "This email requires action";
      
      await expect(
        emailClassificationStorage.connect(user1).addClassification(
          user1.address, 
          emailId, 
          label, 
          reasoning
        )
      ).to.be.revertedWith("Caller is not authorized as backend");
    });
    
    it("Should allow user to read their own classifications", async function () {
      const emailId = "email-789";
      const label = 2; // FLOW_INFO
      const reasoning = "This email is informational";
      
      // Backend adds classification for user1
      await emailClassificationStorage.connect(backend).addClassification(
        user1.address, 
        emailId, 
        label, 
        reasoning
      );
      
      // User1 reads their classifications
      const classifications = await emailClassificationStorage.connect(user1).getUserClassifications();
      
      expect(classifications.length).to.equal(1);
      expect(classifications[0].emailId).to.equal(emailId);
      expect(classifications[0].label).to.equal(label);
      expect(classifications[0].reasoning).to.equal(reasoning);
      expect(classifications[0].isDeleted).to.equal(false);
    });
    
    it("Should update existing classification", async function () {
      const emailId = "email-update";
      const label1 = 0; // FLOW_CRITICAL
      const reasoning1 = "Initial reasoning";
      const label2 = 1; // FLOW_ACTION
      const reasoning2 = "Updated reasoning";
      
      // Add initial classification
      await emailClassificationStorage.connect(backend).addClassification(
        user1.address, emailId, label1, reasoning1
      );
      
      // Update the classification
      await expect(
        emailClassificationStorage.connect(backend).addClassification(
          user1.address, emailId, label2, reasoning2
        )
      ).to.emit(emailClassificationStorage, "ClassificationUpdated")
       .withArgs(user1.address, emailId, label2);
      
      // Check the updated classification
      const result = await emailClassificationStorage.connect(user1).getClassification(emailId);
      expect(result.label).to.equal(label2);
      expect(result.reasoning).to.equal(reasoning2);
    });
    
    it("Should allow backend to delete a classification", async function () {
      const emailId = "email-delete";
      const label = 0;
      const reasoning = "To be deleted";
      
      // Add classification
      await emailClassificationStorage.connect(backend).addClassification(
        user1.address, emailId, label, reasoning
      );
      
      // Delete the classification
      await expect(
        emailClassificationStorage.connect(backend).deleteClassification(user1.address, emailId)
      ).to.emit(emailClassificationStorage, "ClassificationDeleted")
       .withArgs(user1.address, emailId);
      
      // The deleted classification should not appear in the user's list
      const classifications = await emailClassificationStorage.connect(user1).getUserClassifications();
      expect(classifications.length).to.equal(0);
    });
  });

  describe("EmailBatchStorage", function () {
    it("Should store a batch of classifications", async function () {
      const emailIds = ["batch-email-1", "batch-email-2", "batch-email-3"];
      const labels = [0, 1, 2]; // CRITICAL, ACTION, INFO
      const reasonings = ["Reason 1", "Reason 2", "Reason 3"];
      
      await expect(
        emailBatchStorage.connect(backend).storeBatch(
          user1.address,
          emailIds,
          labels,
          reasonings
        )
      ).to.emit(emailBatchStorage, "BatchCreated")
       .withArgs(user1.address, 1, 3);
    });
    
    it("Should let user retrieve their batches", async function () {
      const emailIds = ["batch-email-4", "batch-email-5"];
      const labels = [0, 1];
      const reasonings = ["Reason 4", "Reason 5"];
      
      // Backend stores batch for user1
      await emailBatchStorage.connect(backend).storeBatch(
        user1.address,
        emailIds,
        labels,
        reasonings
      );
      
      // User1 retrieves their batch IDs
      const batchIds = await emailBatchStorage.connect(user1).getUserBatches();
      expect(batchIds.length).to.equal(1);
      expect(batchIds[0]).to.equal(1);
      
      // User1 retrieves classifications from the batch
      const classifications = await emailBatchStorage.connect(user1).getBatchClassifications(1);
      expect(classifications.length).to.equal(2);
      expect(classifications[0].emailId).to.equal(emailIds[0]);
      expect(classifications[0].label).to.equal(labels[0]);
      expect(classifications[0].reasoning).to.equal(reasonings[0]);
    });
    
    it("Should not allow users to access others' batches", async function () {
      const emailIds = ["batch-email-6"];
      const labels = [0];
      const reasonings = ["Reason 6"];
      
      // Backend stores batch for user1
      await emailBatchStorage.connect(backend).storeBatch(
        user1.address,
        emailIds,
        labels,
        reasonings
      );
      
      // User2 should not be able to access user1's batches
      await expect(
        emailBatchStorage.connect(user2).getBatchClassifications(1)
      ).to.be.revertedWith("Not authorized to access this batch");
    });
    
    it("Should allow users to find their specific classifications", async function () {
      const emailIds = ["batch-email-7", "batch-email-8"];
      const labels = [0, 1];
      const reasonings = ["Reason 7", "Reason 8"];
      
      // Backend stores batch for user1
      await emailBatchStorage.connect(backend).storeBatch(
        user1.address,
        emailIds,
        labels,
        reasonings
      );
      
      // User1 retrieves a specific classification
      const result = await emailBatchStorage.connect(user1).getMyClassification("batch-email-8");
      expect(result[0]).to.equal(true); // exists
      expect(result[1]).to.equal(1); // label
      expect(result[2]).to.equal("Reason 8"); // reasoning
    });
    
    it("Should return recent classifications for a user", async function () {
      // Add first batch for user1
      await emailBatchStorage.connect(backend).storeBatch(
        user1.address,
        ["email-1", "email-2"],
        [0, 1],
        ["Reason 1", "Reason 2"]
      );
      
      // Add second batch for user1
      await emailBatchStorage.connect(backend).storeBatch(
        user1.address,
        ["email-3", "email-4", "email-5"],
        [2, 0, 1],
        ["Reason 3", "Reason 4", "Reason 5"]
      );
      
      // Backend retrieves recent classifications for user1
      const recent = await emailBatchStorage.connect(backend).getRecentClassifications(
        user1.address,
        0, // start from most recent batch
        4  // get up to 4 classifications
      );
      
      expect(recent.length).to.equal(4);
      // Should return classifications from most recent batch first
      expect(recent[0].emailId).to.equal("email-3");
      expect(recent[1].emailId).to.equal("email-4");
      expect(recent[2].emailId).to.equal("email-5");
      // Then from older batches
      expect(recent[3].emailId).to.equal("email-1");
    });
  });
});
