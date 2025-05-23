const { auth } = require("../config/firebase");

// Authentication middleware
const authenticateUser = async (req, res, next) => {
  try {

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    // console.log('Authorization header:', token);
    const decodedToken = await auth.verifyIdToken(token);
    // console.log('Decoded token:', decodedToken);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name
    };
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = authenticateUser;