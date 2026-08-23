const StoreSettings = require('../models/StoreSettings');

const DEFAULT_SETTINGS = {
  storeName: 'Blegab Luxury Wigs',
  supportEmail: 'support@blegab.com',
  storeAddress: 'Lagos, Nigeria',
  sessionTimeoutMinutes: 10080
};

/*
|--------------------------------------------------------------------------
| Get Store Settings
|--------------------------------------------------------------------------
| Returns the current store settings.
| If no settings document exists yet, one is created automatically.
*/
const getStoreSettings = async (req, res) => {
  try {
    let settings = await StoreSettings.findOne();

    if (!settings) {
      settings = await StoreSettings.create(DEFAULT_SETTINGS);
    }

    return res.status(200).json({
      success: true,
      settings: {
        id: settings._id,
        storeName: settings.storeName,
        supportEmail: settings.supportEmail,
        storeAddress: settings.storeAddress,
        sessionTimeoutMinutes: settings.sessionTimeoutMinutes
      }
    });
  } catch (error) {
    console.error('Get store settings error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to load store settings.'
    });
  }
};

/*
|--------------------------------------------------------------------------
| Update Store Settings
|--------------------------------------------------------------------------
| Updates the store profile and session timeout.
*/
const updateStoreSettings = async (req, res) => {
  try {
    const {
      storeName,
      supportEmail,
      storeAddress,
      sessionTimeoutMinutes
    } = req.body;

    if (
      storeName !== undefined &&
      typeof storeName !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Store name must be a string.'
      });
    }

    if (
      supportEmail !== undefined &&
      typeof supportEmail !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Support email must be a string.'
      });
    }

    if (
      storeAddress !== undefined &&
      typeof storeAddress !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Store address must be a string.'
      });
    }

    if (
  sessionTimeoutMinutes !== undefined &&
  sessionTimeoutMinutes !== null &&
  (
    typeof sessionTimeoutMinutes !== 'number' ||
    !Number.isFinite(sessionTimeoutMinutes) ||
    sessionTimeoutMinutes < 1
  )
) {
      return res.status(400).json({
        success: false,
        message: 'Session timeout must be a valid number of minutes.'
      });
    }

    let settings = await StoreSettings.findOne();

    if (!settings) {
      settings = new StoreSettings(DEFAULT_SETTINGS);
    }

    if (storeName !== undefined) {
      settings.storeName = storeName.trim();
    }

    if (supportEmail !== undefined) {
      settings.supportEmail = supportEmail.trim().toLowerCase();
    }

    if (storeAddress !== undefined) {
      settings.storeAddress = storeAddress.trim();
    }

    if (sessionTimeoutMinutes !== undefined) {
      settings.sessionTimeoutMinutes = sessionTimeoutMinutes;
    }

    await settings.save();

    return res.status(200).json({
      success: true,
      message: 'Store settings updated successfully.',
      settings: {
        id: settings._id,
        storeName: settings.storeName,
        supportEmail: settings.supportEmail,
        storeAddress: settings.storeAddress,
        sessionTimeoutMinutes: settings.sessionTimeoutMinutes
      }
    });
  } catch (error) {
    console.error('Update store settings error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to update store settings.'
    });
  }
};

module.exports = {
  getStoreSettings,
  updateStoreSettings
};