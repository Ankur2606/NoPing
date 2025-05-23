const { db } = require('../config/firebase');
const { google } = require('googleapis');
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
    let expiresAt = new Date(now.getTime() + (tokenData.expires_in * 1000));
    if(tokenData.refresh_token_expires_in){
      expiresAt = new Date(now.getTime() + (tokenData.refresh_token_expires_in * 1000));
    }
    
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
 * Get OAuth token and refresh if expired
 * @param {string} userId - Firebase user ID
 * @param {string} provider - OAuth provider name
 * @returns {Promise<Object|null>} - Valid token or null
 */
const getValidOAuthToken = async (userId, provider) => {
  try {
    // Get the current token
    const token = await getOAuthToken(userId, provider);
    
    // If no token found or provider isn't supported
    if (!token) return null;
    
    // If token is still valid, return it
    if (!token.isExpired) return token;
    
    // Token is expired, need to refresh
    console.log(`Token expired for user ${userId}. Refreshing...`);
    
    // For Google OAuth (add other providers as needed)
    if (provider === 'google' && token.refresh_token) {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      // Set refresh token and refresh
      oauth2Client.setCredentials({
        refresh_token: token.refresh_token
      });
      
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Save the refreshed token
      await saveOAuthToken(
        userId, 
        credentials, 
        provider, 
        token.scopes || []
      );
      
      // Return the refreshed token
      return {
        ...credentials,
        isExpired: false,
        provider
      };
    }
    
    // For other providers, implement similar refresh logic
    
    return null;
  } catch (error) {
    console.error('Error refreshing OAuth token:', error);
    throw error;
  }
};

/**
 * Updated function to get users with valid tokens, refreshing expired ones
 * @param {string} provider - OAuth provider name
 * @returns {Promise<Array>} - Array of user IDs and token data
 */
const getUsersWithValidTokens = async (provider) => {
  try {
    // Get all tokens for the given provider
    const tokensSnapshot = await db
      .collection('oauth_tokens')
      .where(`providers.${provider}`, '!=', null)
      .get();
    
    if (tokensSnapshot.empty) {
      return [];
    }
    
    const usersWithTokens = [];
    const now = new Date();
    
    // Process each token document
    for (const doc of tokensSnapshot.docs) {
      const data = doc.data();
      const userId = doc.id;
      
      if (data.providers && data.providers[provider]) {
        const tokenData = data.providers[provider];
        const expiresAt = new Date(tokenData.expires_at._seconds * 1000);
        
        // Check if token is expired
        if (now >= expiresAt) {
          // Try to refresh the token
          try {
            const refreshedToken = await getValidOAuthToken(userId, provider);
            if (refreshedToken) {
              usersWithTokens.push({
                userId,
                tokenData: refreshedToken
              });
            }
          } catch (err) {
            console.error(`Failed to refresh token for user ${userId}:`, err);
          }
        } else {
          // Token is still valid
          usersWithTokens.push({
            userId,
            tokenData
          });
        }
      }
    }
    
    return usersWithTokens;
  } catch (error) {
    console.error('Error getting users with valid tokens:', error);
    throw error;
  }
};

// Update exports to include new function
module.exports = {
  saveOAuthToken,
  getOAuthToken,
  deleteOAuthToken,
  getUsersWithValidTokens,
  getValidOAuthToken
};