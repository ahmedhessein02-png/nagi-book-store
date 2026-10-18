import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('transfer', ROOT / 'migration/transfer.py')
t = importlib.util.module_from_spec(spec)
spec.loader.exec_module(t)


class TransferTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.db = self.root / 'source.sqlite'
        self.objects = self.root / 'objects'
        self.objects.mkdir()
        (self.objects / 'cover').write_bytes(b'original cover bytes')
        self.meta = self.root / 'metadata.json'
        self.meta.write_text(json.dumps({'cover': {'httpMetadata': {'contentType': 'image/png'}, 'customMetadata': {}}}))
        with sqlite3.connect(self.db) as db:
            for sql in sorted((ROOT / 'drizzle').glob('*.sql')):
                db.executescript(sql.read_text())
            db.execute("INSERT INTO orders(id,name,mobile,city,address,items,total,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)", ('order-1', 'کوردی', '+964 1234567', 'Duhok', 'Address', json.dumps([{'id': 'deleted-book', 'title': 'Historical title', 'price': 9000, 'originalPrice': 10000, 'quantity': 2}]), 18000, 'date', 'date'))
            db.execute("INSERT INTO inquiries VALUES(?,?,?,?,?,?)", ('q1', 'Name', '1234567', 'Question', 'new', 'date'))
            db.execute("INSERT INTO managed_books VALUES(?,?,?)", ('book-1', json.dumps({'id':'book-1','price':10000,'discountType':'fixed','discountValue':1000,'published':False,'image':'api/book-images/cover'}), 'date'))
            db.execute("INSERT INTO admin_credentials VALUES(1,'owner','unchanged-hash','unchanged-salt','revision')")
            db.execute("INSERT INTO admin_sessions VALUES('token-hash','revision',123)")
            db.execute("CREATE TABLE future_records(id INTEGER PRIMARY KEY, value BLOB)")
            db.execute("INSERT INTO future_records VALUES(1,?)", (b'\x00\xff',))
        self.bundle = self.root / 'bundle'

    def export(self):
        return t.export(self.db, self.objects, self.meta, self.bundle)

    def test_roundtrip_all_records_and_assets(self):
        before = t.digest(self.db)
        report = self.export()
        target = self.root / 'restored'
        self.assertEqual(report, t.restore(self.bundle, target))
        self.assertEqual(before, t.digest(self.db))
        self.assertEqual(t.inventory(self.bundle), t.inventory(target))
        self.assertEqual(report['tables']['orders']['count'], 1)
        self.assertEqual(report['tables']['future_records']['count'], 1)
        with t.connect(target / 'database.sqlite') as db:
            self.assertEqual(db.execute('SELECT password_hash FROM admin_credentials').fetchone()[0], 'unchanged-hash')
        with self.assertRaises(ValueError):
            t.restore(self.bundle, target)

    def test_corruption_rejected(self):
        self.export()
        (self.bundle / 'objects/cover').write_bytes(b'changed')
        with self.assertRaises(ValueError):
            t.restore(self.bundle, self.root / 'target')
        self.assertFalse((self.root / 'target').exists())

    def test_database_tampering_rejected(self):
        self.export()
        with sqlite3.connect(self.bundle / 'database.sqlite') as db:
            db.execute("UPDATE orders SET mobile='changed'")
        with self.assertRaises(ValueError):
            t.verify(self.bundle)

    def test_missing_asset_and_metadata_rejected(self):
        (self.objects / 'cover').unlink()
        with self.assertRaises(ValueError):
            self.export()
        self.meta.write_text('{}')
        with self.assertRaises(ValueError):
            self.export()
        self.assertFalse(self.bundle.exists())

    def test_existing_output_untouched(self):
        self.bundle.mkdir()
        (self.bundle / 'keep').write_text('keep')
        with self.assertRaises(ValueError):
            self.export()
        self.assertEqual((self.bundle / 'keep').read_text(), 'keep')

    def test_malformed_product_rejected(self):
        with sqlite3.connect(self.db) as db:
            db.execute("UPDATE managed_books SET data='{}'")
        with self.assertRaises(ValueError):
            self.export()

    def test_legacy_anomalies_reported_without_rewriting(self):
        with sqlite3.connect(self.db) as db:
            db.execute("UPDATE orders SET total=1,name=''")
        report = self.export()
        self.assertEqual(report['warnings']['order_total_mismatches'], 1)
        self.assertEqual(report['warnings']['blank_customer_fields'], 1)
        self.assertEqual(report['warnings']['legacy_payment_or_region'], 1)

    def test_links_rejected(self):
        (self.objects / 'link').symlink_to(self.db)
        with self.assertRaises(ValueError):
            self.export()


if __name__ == '__main__':
    unittest.main()
