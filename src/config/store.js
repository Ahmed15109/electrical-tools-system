const Store = require('electron-store');

const schema = {
  autoBackupEnabled: {
    type: 'boolean',
    default: true
  },
  maxBackups: {
    type: 'number',
    default: 10
  },
  backupPath: {
    type: ['string', 'null'],
    default: null
  },
  lastBackupDate: {
    type: ['string', 'null'],
    default: null
  }
};

const store = new Store({ schema });

module.exports = store;
