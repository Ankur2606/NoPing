const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');

/**
 * @route   GET /api/services
 * @desc    Get all connected services
 * @access  Private
 */
router.get('/', async (req, res) => {
  try {
    const uid = req.user.uid;
    
    const servicesRef = db.collection('services').doc(uid).collection('userServices');
    const servicesSnapshot = await servicesRef.get();
    
    const services = [];
    servicesSnapshot.forEach(doc => {
      // Exclude sensitive auth data from response
      const serviceData = doc.data();
      const { authData, ...safeData } = serviceData;
      
      services.push({
        id: doc.id,
        ...safeData
      });
    });
    
    return res.status(200).json({ services });
  } catch (error) {
    console.error('Error fetching services:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/services/connect/:type
 * @desc    Connect a new service
 * @access  Private
 */
router.post('/connect/:type', async (req, res) => {
  try {
    const uid = req.user.uid;
    const { type } = req.params;
    const serviceData = req.body;
    
    // Validate service type
    const validTypes = ['email', 'slack', 'teams', 'task'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid service type. Must be one of: ${validTypes.join(', ')}`
      });
    }
    
    // Generate a service ID
    const serviceId = `${type}-${Date.now()}`;
    
    // Prepare service document
    const newService = {
      type,
      name: serviceData.name || type,
      isConnected: true,
      lastSynced: admin.firestore.FieldValue.serverTimestamp(),
      errorMessage: '',
      authData: serviceData.authData || {}
    };
    
    // Save to Firestore
    await db.collection('services')
      .doc(uid)
      .collection('userServices')
      .doc(serviceId)
      .set(newService);
    
    // Return success without auth data
    const { authData, ...safeData } = newService;
    
    return res.status(201).json({
      success: true,
      service: {
        id: serviceId,
        ...safeData,
        lastSynced: new Date().toISOString() // For immediate response
      },
      error: null
    });
  } catch (error) {
    console.error('Error connecting service:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/services/:id
 * @desc    Disconnect a service
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const uid = req.user.uid;
    const serviceId = req.params.id;
    
    // Check if service exists
    const serviceRef = db.collection('services')
      .doc(uid)
      .collection('userServices')
      .doc(serviceId);
    
    const serviceDoc = await serviceRef.get();
    if (!serviceDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }
    
    // Delete the service
    await serviceRef.delete();
    
    return res.status(200).json({
      success: true,
      error: null
    });
  } catch (error) {
    console.error('Error disconnecting service:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route   POST /api/services/:id/sync
 * @desc    Manually sync a service
 * @access  Private
 */
router.post('/:id/sync', async (req, res) => {
  try {
    const uid = req.user.uid;
    const serviceId = req.params.id;
    
    // Check if service exists
    const serviceRef = db.collection('services')
      .doc(uid)
      .collection('userServices')
      .doc(serviceId);
    
    const serviceDoc = await serviceRef.get();
    if (!serviceDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }
    
    const serviceData = serviceDoc.data();
    
    // In a real implementation, you would trigger a sync operation with the service API
    // For this mock implementation, we'll just update the lastSynced timestamp
    
    const now = admin.firestore.FieldValue.serverTimestamp();
    await serviceRef.update({
      lastSynced: now,
      errorMessage: '' // Clear any previous errors
    });
    
    return res.status(200).json({
      success: true,
      lastSynced: new Date().toISOString(), // For immediate response
      error: null
    });
  } catch (error) {
    console.error('Error syncing service:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;