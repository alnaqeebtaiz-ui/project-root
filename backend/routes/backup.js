// C:\Users\khalid\Downloads\project-root\backend\routes\backup.js
const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const Collector = require('../models/Collector');
const Deposit = require('../models/Deposit');
const Fund = require('../models/Fund');
const Notebook = require('../models/Notebook');
const Receipt = require('../models/Receipt');
const Subscriber = require('../models/Subscriber');
const User = require('../models/User');

function runQuery(db, query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) return reject(err);
            resolve(this);
        });
    });
}

function closeDb(db) {
    return new Promise((resolve) => {
        if (db) {
            db.close(err => {
                if (err) console.error("Failed to close DB:", err.message);
                resolve();
            });
        } else {
            resolve();
        }
    });
}

function cleanupFiles(files) {
    files.forEach(file => {
        if (fs.existsSync(file)) {
            try {
                fs.unlinkSync(file);
                console.log(`Cleaned up file: ${file}`);
            } catch (cleanupErr) {
                if (cleanupErr.code !== 'EBUSY') {
                    console.warn(`Failed to cleanup file ${file}:`, cleanupErr.message);
                } else {
                    console.warn(`File ${file} is busy, will try to cleanup later.`);
                }
            }
        }
    });
}

router.get('/download', authenticateToken, async (req, res) => {
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    const tempDir = path.join(__dirname, '..', 'temp'); 
    
    // 💡💡💡 تأكد من وجود مجلد temp قبل استخدامه
    if (!fs.existsSync(tempDir)) {
        console.log(`Creating temp directory: ${tempDir}`);
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const sqliteDbName = 'data.db';
    const dbPath = path.join(tempDir, `${timestamp}_${sqliteDbName}`);
    const zipFilename = `backup_${timestamp}.zip`;
    const zipPath = path.join(tempDir, zipFilename);
    let db = null;

    try {
        console.log("Starting backup process...");
        // 💡💡💡 قم بتعطيل هذا التنظيف مؤقتًا أيضاً للتأكد أن لا شيء يحذف الملف
        // cleanupFiles([dbPath, zipPath]);

        console.log(`Creating SQLite DB at: ${dbPath}`); // سجل مسار ملف SQLite
        db = new sqlite3.Database(dbPath);

        // 1. إنشاء الجداول في SQLite
        // ... (هذا الجزء لا يتغير) ...
        console.log("Creating SQLite tables...");
        await runQuery(db, `CREATE TABLE IF NOT EXISTS funds (
            _id TEXT PRIMARY KEY, 
            name TEXT, 
            fundCode TEXT, 
            description TEXT,
            createdAt TEXT,
            updatedAt TEXT
        )`);
        await runQuery(db, `CREATE TABLE IF NOT EXISTS collectors (
            _id TEXT PRIMARY KEY, 
            name TEXT, 
            collectorCode TEXT, 
            openingBalance REAL, 
            fundId TEXT,
            createdAt TEXT,
            updatedAt TEXT
        )`);
        await runQuery(db, `CREATE TABLE IF NOT EXISTS subscribers (
            _id TEXT PRIMARY KEY, 
            name TEXT, 
            address TEXT, 
            phone TEXT,
            createdAt TEXT,
            updatedAt TEXT
        )`);
        await runQuery(db, `CREATE TABLE IF NOT EXISTS receipts (
            _id TEXT PRIMARY KEY, 
            receiptNumber INTEGER, 
            amount REAL, 
            date TEXT, 
            collectorId TEXT, 
            subscriberId TEXT, 
            status TEXT,
            createdAt TEXT,
            updatedAt TEXT
        )`);
        await runQuery(db, `CREATE TABLE IF NOT EXISTS deposits (
            _id TEXT PRIMARY KEY, 
            amount REAL, 
            depositDate TEXT, 
            referenceNumber TEXT, 
            collectorId TEXT,
            createdAt TEXT,
            updatedAt TEXT
        )`);
        await runQuery(db, `CREATE TABLE IF NOT EXISTS notebooks (
            _id TEXT PRIMARY KEY, 
            startNumber INTEGER, 
            endNumber INTEGER, 
            collectorId TEXT, 
            missingReceipts TEXT, 
            pendingReceipts TEXT,
            createdAt TEXT,
            updatedAt TEXT
        )`);
        await runQuery(db, `CREATE TABLE IF NOT EXISTS users (
            _id TEXT PRIMARY KEY,
            name TEXT,
            email TEXT,
            password TEXT,
            role TEXT,
            date TEXT,
            createdAt TEXT,
            updatedAt TEXT
        )`);

        // 2. جلب البيانات من MongoDB وإدراجها في SQLite
        // ... (هذا الجزء لا يتغير) ...
        console.log("Fetching and inserting data into SQLite...");
        await runQuery(db, 'BEGIN TRANSACTION');

        const collections = [
            { model: Fund, tableName: 'funds', fields: ['name', 'fundCode', 'description'] },
            { model: Collector, tableName: 'collectors', fields: ['name', 'collectorCode', 'openingBalance', 'fund'], fk: { fund: 'fundId' } },
            { model: Subscriber, tableName: 'subscribers', fields: ['name', 'address', 'phone'] },
            { model: Receipt, tableName: 'receipts', fields: ['receiptNumber', 'amount', 'date', 'collector', 'subscriber', 'status'], fk: { collector: 'collectorId', subscriber: 'subscriberId' } },
            { model: Deposit, tableName: 'deposits', fields: ['amount', 'depositDate', 'referenceNumber', 'collector'], fk: { collector: 'collectorId' } },
            { model: Notebook, tableName: 'notebooks', fields: ['startNumber', 'endNumber', 'collectorId', 'missingReceipts', 'pendingReceipts'] },
            { model: User, tableName: 'users', fields: ['name', 'email', 'password', 'role', 'date']}
        ];

        for (const col of collections) {
            const data = await col.model.find().lean();
            if (data.length > 0) {
                console.log(`Exporting ${col.tableName} (${data.length} records)...`);
                for (const item of data) {
                    const fieldNames = ['_id'];
                    const fieldValues = [item._id.toString()];
                    const placeholders = ['?'];

                    for (const f of col.fields) {
                        let value = item[f];
                        let fieldName = f;

                        if (col.fk && col.fk[f]) {
                            fieldName = col.fk[f];
                            value = item[f] ? item[f].toString() : null;
                        } else if (f === 'missingReceipts' || f === 'pendingReceipts') {
                            value = JSON.stringify(item[f] || []);
                        } else if (value instanceof Date) {
                            value = value.toISOString();
                        } else if (typeof value === 'object' && value !== null) {
                            value = JSON.stringify(value);
                        }

                        fieldNames.push(fieldName);
                        fieldValues.push(value);
                        placeholders.push('?');
                    }

                    if (item.createdAt) {
                        fieldNames.push('createdAt');
                        fieldValues.push(item.createdAt.toISOString());
                        placeholders.push('?');
                    }
                    if (item.updatedAt) {
                        fieldNames.push('updatedAt');
                        fieldValues.push(item.updatedAt.toISOString());
                        placeholders.push('?');
                    }

                    const insertQuery = `INSERT INTO ${col.tableName} (${fieldNames.join(', ')}) VALUES (${placeholders.join(', ')})`;
                    await runQuery(db, insertQuery, fieldValues);
                }
            }
        }

        await runQuery(db, 'COMMIT');
        
        console.log("Closing SQLite database...");
        await closeDb(db);
        db = null; // تأكد أن db فارغ بعد الإغلاق

        // 💡💡💡 جزء إنشاء الملف المضغوط مع تحسينات تسجيل الأخطاء
        console.log(`Creating ZIP archive at: ${zipPath}`); // سجل مسار ملف ZIP
        await new Promise((resolve, reject) => {
            const output = fs.createWriteStream(zipPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => {
                console.log(`Archive created: ${zipFilename} (${archive.pointer()} total bytes)`);
                resolve();
            });
            output.on('error', (err) => { // 💡💡💡 تسجيل أي أخطاء في تيار الكتابة
                console.error('Output stream error:', err);
                reject(err);
            });
            archive.on('error', (err) => { // 💡💡💡 تسجيل أي أخطاء في الأرشفة
                console.error('Archiver error:', err);
                reject(err);
            });

            archive.pipe(output);
            archive.file(dbPath, { name: sqliteDbName });
            archive.finalize();
        });

        console.log("Sending ZIP file for download...");
        res.download(zipPath, zipFilename); 

    } catch (error) {
        console.error("Backup process failed:", error);
        if (!res.headersSent) {
            res.status(500).json({ msg: 'فشل في إنشاء النسخة الاحتياطية. يرجى مراجعة سجلات الخادم.', error: error.message });
        }
    } finally {
        // 💡💡💡 تأكد أن التنظيف معطل تماماً لهذه التجربة
        if (db) {
            console.log("Ensuring SQLite DB is closed in finally block (if not already).");
            await closeDb(db);
        }
        setTimeout(() => cleanupFiles([dbPath, zipPath]), 10000); 
        console.log(`Cleanup scheduled for ${dbPath} and ${zipPath} in 10 seconds.`);
    }
});

module.exports = router;