const { app } = require('electron');
const path = require('path');

app.whenReady().then(() => {
    const userData = app.getPath('userData');
    const dbPath = path.join(userData, 'database.db');
    console.log('\n--- ELECTRON PATHS ---');
    console.log('UserData:', userData);
    console.log('DB Path :', dbPath);
    console.log('----------------------\n');
    app.quit();
});
