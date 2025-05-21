const { db } = require('../config/firebase');

/**
 * Create or update OAuth token for a user
 * @param {string} userId - Firebase user ID
 * @param {Object} tokenData - Token data containing access_token, refresh_token, etc.
 * @param {string} provider - OAuth provider name (google, github, etc)
 * @param {Array} scopes - Array of authorized scopes
 * @returns {Promise<Object>} - Created/Updated token document
 */
const saveOAuthToken = async (userId, tokenData, provider, scopes) => {
  try {
    const tokenRef = db.collection('oauth_tokens').doc(userId);
    const tokenDoc = await tokenRef.get();
    
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (tokenData.expires_in * 1000));
    
    const providerData = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      id_token: tokenData.id_token,
      scopes: scopes || [],
      expires_at: expiresAt,
      created_at: now,
      updated_at: now
    };
    
    if (tokenDoc.exists) {
      // Update the existing tokens
      const existingData = tokenDoc.data();
      const updatedProviders = {
        ...existingData.providers,
        [provider]: providerData
      };
      
      await tokenRef.update({
        providers: updatedProviders,
        updated_at: now
      });
      
      return {
        userId,
        provider,
        scopes,
        success: true
      };
    } else {
      // Create new token document
      await tokenRef.set({
        user_id: userId,
        providers: {
          [provider]: providerData
        },
        created_at: now,
        updated_at: now
      });
      
      return {
        userId,
        provider,
        scopes,
        success: true
      };
    }
  } catch (error) {
    console.error('Error saving OAuth token:', error);
    throw error;
  }
};

/**
 * Get OAuth token for a user and provider
 * @param {string} userId - Firebase user ID
 * @param {string} provider - OAuth provider name
 * @returns {Promise<Object|null>} - Token data or null if not found
 */
const getOAuthToken = async (userId, provider) => {
  try {
    const tokenRef = db.collection('oauth_tokens').doc(userId);
    const tokenDoc = await tokenRef.get();
    
    if (!tokenDoc.exists) {
      return null;
    }
    
    const tokenData = tokenDoc.data();
    
    if (!tokenData.providers || !tokenData.providers[provider]) {
      return null;
    }
    
    const providerToken = tokenData.providers[provider];
    
    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(providerToken.expires_at._seconds * 1000);
    const isExpired = now > expiresAt;
    
    return {
      ...providerToken,
      isExpired,
      provider
    };
  } catch (error) {
    console.error('Error getting OAuth token:', error);
    throw error;
  }
};

/**
 * Delete OAuth token for a user and provider
 * @param {string} userId - Firebase user ID
 * @param {string} provider - OAuth provider name
 * @returns {Promise<boolean>} - Success status
 */
const deleteOAuthToken = async (userId, provider) => {
  try {
    const tokenRef = db.collection('oauth_tokens').doc(userId);
    const tokenDoc = await tokenRef.get();
    
    if (!tokenDoc.exists) {
      return false;
    }
    
    const tokenData = tokenDoc.data();
    
    if (!tokenData.providers || !tokenData.providers[provider]) {
      return false;
    }
    
    const updatedProviders = { ...tokenData.providers };
    delete updatedProviders[provider];
    
    await tokenRef.update({
      providers: updatedProviders,
      updated_at: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting OAuth token:', error);
    throw error;
  }
};

/**
 * Get all users with valid tokens for a specific provider
 * Used for cron jobs to process all users
 * @param {string} provider - OAuth provider name
 * @returns {Promise<Array>} - Array of user IDs and token data
 */
const getUsersWithValidTokens = async (provider) => {
  try {
    const now = new Date();
    
    // Get all tokens for the given provider
    const tokensSnapshot = await db
      .collection('oauth_tokens')
      .where(`providers.${provider}`, '!=', null)
      .get();
    
    if (tokensSnapshot.empty) {
      return [];
    }
    
    const usersWithTokens = [];
    
    tokensSnapshot.forEach(doc => {
      const data = doc.data();
      const userId = doc.id;
      
      if (data.providers && data.providers[provider]) {
        const tokenData = data.providers[provider];
        const expiresAt = new Date(tokenData.expires_at._seconds * 1000);
        
        // Only include non-expired tokens
        if (now < expiresAt) {
          usersWithTokens.push({
            userId,
            tokenData
          });
        }
      }
    });
    
    return usersWithTokens;
  } catch (error) {
    console.error('Error getting users with valid tokens:', error);
    throw error;
  }
};

module.exports = {
  saveOAuthToken,
  getOAuthToken,
  deleteOAuthToken,
  getUsersWithValidTokens
};
