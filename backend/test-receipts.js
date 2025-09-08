require('dotenv').config();
const mongoose = require('mongoose');
const Receipt = require('./models/Receipt');

async function testQuery() {
  try {
    // الاتصال بقاعدة البيانات
    await mongoose.connect("mongodb+srv://alnaqeeb:Naqeeb2025@billscluster.xwtpihw.mongodb.net/BillsDB?retryWrites=true&w=majority&appName=BillsCluster", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ متصل بقاعدة البيانات');

    // تحديد نطاق التواريخ للتجربة
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-12-31');
    endDate.setUTCHours(23, 59, 59, 999);

    // الاستعلام عن السندات
    const receipts = await Receipt.find({
      date: { $gte: startDate, $lte: endDate },
    }).limit(10);

    if (receipts.length === 0) {
      console.log('⚠️ لا توجد سندات بين هذه التواريخ');
    } else {
      console.log(`🔎 تم العثور على ${receipts.length} سند (أول 10):`);
      receipts.forEach(r => {
        console.log({
          number: r.receiptNumber,
          amount: r.amount,
          date: r.date,
          collector: r.collectorId,
        });
      });
    }

    process.exit();
  } catch (err) {
    console.error('❌ خطأ:', err);
    process.exit(1);
  }
}

testQuery();
