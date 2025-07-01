const ConfigManager = require('../Core/ConfigManager');

function isPrivilegedUser(userId) {
    const config = ConfigManager.getConfig();
    const ownerIds = config.ownerIDs || [];
    const devIds = config.devIDs || [];
    return ownerIds.includes(userId) || devIds.includes(userId);
}

module.exports = {
    isPrivilegedUser,
};