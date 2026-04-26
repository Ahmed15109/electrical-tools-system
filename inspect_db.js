const sqlite3 = require('sqlite3').verbose();
const path = require('path');


const dbPath = path.join(process.cwd(), 'database.sqlite');
console.log('Inspecting database at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Failed to connect to database:', err.message);
        process.exit(1);
    }
});

db.serialize(() => {

    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
        if (err) throw err;
        console.log('\n--- TABLES ---');
        console.table(tables);
    });


    db.all("PRAGMA table_info(customers)", [], (err, columns) => {
        if (err) throw err;
        console.log('\n--- CUSTOMERS COLUMNS ---');
        console.table(columns);
    });


    db.all("PRAGMA index_list(customers)", [], (err, indexes) => {
        if (err) throw err;
        console.log('\n--- CUSTOMERS INDEXES ---');
        console.table(indexes);


        indexes.forEach(idx => {
            db.all(`PRAGMA index_info('${idx.name}')`, [], (err, info) => {
                if (err) throw err;
                console.log(`\nIndex: ${idx.name} | Unique: ${idx.unique}`);
                console.table(info);
            });
        });
    });
});

setTimeout(() => db.close(), 2000);
