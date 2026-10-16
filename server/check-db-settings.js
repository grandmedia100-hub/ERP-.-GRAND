const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// الاتصال بقاعدة البيانات
const dbPath = path.join(__dirname, 'mediahive.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err.message);
        process.exit(1);
    }
    console.log('✅ تم الاتصال بقاعدة البيانات');
    checkSettings();
});

// فحص إعدادات قاعدة البيانات
function checkSettings() {
    console.log('\n📊 فحص إعدادات قاعدة البيانات SQLite:\n');
    console.log('━'.repeat(60));

    // فحص journal_mode (يجب أن يكون WAL)
    db.get('PRAGMA journal_mode;', (err, row) => {
        if (err) {
            console.error('❌ خطأ:', err.message);
        } else {
            const mode = row ? row.journal_mode : 'غير معروف';
            const status = mode === 'wal' ? '✅' : '❌';
            console.log(`${status} journal_mode: ${mode.toUpperCase()} ${mode === 'wal' ? '(مُفعّل)' : '(غير مُفعّل!)'}`);
        }
    });

    // فحص synchronous
    db.get('PRAGMA synchronous;', (err, row) => {
        if (err) {
            console.error('❌ خطأ:', err.message);
        } else {
            const levels = { 0: 'OFF', 1: 'NORMAL', 2: 'FULL', 3: 'EXTRA' };
            const value = row ? row.synchronous : -1;
            const level = levels[value] || 'غير معروف';
            const status = value === 1 ? '✅' : '⚠️';
            console.log(`${status} synchronous: ${level} (${value})`);
        }
    });

    // فحص cache_size
    db.get('PRAGMA cache_size;', (err, row) => {
        if (err) {
            console.error('❌ خطأ:', err.message);
        } else {
            const size = row ? row.cache_size : 0;
            const sizeInMB = Math.abs(size) * 1.5 / 1024; // تقريبي
            const status = Math.abs(size) >= 10000 ? '✅' : '⚠️';
            console.log(`${status} cache_size: ${size} (~${sizeInMB.toFixed(2)} MB)`);
        }
    });

    // فحص temp_store
    db.get('PRAGMA temp_store;', (err, row) => {
        if (err) {
            console.error('❌ خطأ:', err.message);
        } else {
            const stores = { 0: 'DEFAULT', 1: 'FILE', 2: 'MEMORY' };
            const value = row ? row.temp_store : -1;
            const store = stores[value] || 'غير معروف';
            const status = value === 2 ? '✅' : '⚠️';
            console.log(`${status} temp_store: ${store} (${value})`);
        }
    });

    // فحص حجم قاعدة البيانات
    setTimeout(() => {
        db.get('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();', (err, row) => {
            if (err) {
                console.error('❌ خطأ:', err.message);
            } else {
                const sizeInMB = row ? (row.size / (1024 * 1024)).toFixed(2) : 0;
                console.log(`📦 حجم قاعدة البيانات: ${sizeInMB} MB`);
            }

            console.log('━'.repeat(60));
            console.log('\n💡 التوصيات:');
            console.log('   • journal_mode يجب أن يكون WAL');
            console.log('   • synchronous يجب أن يكون NORMAL (1)');
            console.log('   • cache_size يجب أن يكون 10000 أو أكثر');
            console.log('   • temp_store يجب أن يكون MEMORY (2)');
            console.log('\n✅ إذا كانت جميع العلامات خضراء، فالتحسينات مُطبّقة بنجاح!\n');

            db.close();
        });
    }, 500);
}
