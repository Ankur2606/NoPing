// controllers/verifyCodeController.js

const { verificationCodes } = require("../utils/verificationCodes");

const verifyTelegramCode = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Verification code is required',
      });
    }

    const verification = verificationCodes.get(code);

    if (!verification) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code',
      });
    }

    if (verification.uid !== req.user.uid) {
      return res.status(403).json({
        success: false,
        error: 'Code is not valid for this user',
      });
    }

    if (new Date() > new Date(verification.expiresAt)) {
      verificationCodes.delete(code);
      return res.status(400).json({
        success: false,
        error: 'Verification code has expired',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Valid code, waiting for Telegram bot confirmation',
    });

  } catch (error) {
    console.error('Error verifying code:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports = verifyTelegramCode;
