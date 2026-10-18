#!/usr/bin/env python3
"""Offline, no-overwrite SQLite + bucket snapshot transfer. No network access."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import sqlite3
import tempfile

REQUIRED = {'orders', 'inquiries', 'managed_books', 'admin_credentials',
            'admin_sessions', 'admin_login_limits'}


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def connect(path):
    return sqlite3.connect(path.resolve().as_uri() + '?mode=ro', uri=True)


def inspect(path, objects):
    with connect(path) as db:
        db.execute('PRAGMA query_only=ON')
        if db.execute('PRAGMA integrity_check').fetchall() != [('ok',)]:
            raise ValueError('SQLite integrity check failed')
        if db.execute('PRAGMA foreign_key_check').fetchall():
            raise ValueError('Foreign key check failed')
        tables = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")]
        if not REQUIRED.issubset(tables):
            raise ValueError('Required tables missing; reconcile schema on a disposable copy first')
        report = {}
        for table in tables:
            quoted = '"' + table.replace('"', '""') + '"'
            rows = db.execute('SELECT * FROM ' + quoted).fetchall()
            # repr preserves SQLite types and binary values, including unknown tables.
            encoded = sorted(repr(row) for row in rows)
            report[table] = {'count': len(rows), 'sha256': hashlib.sha256(json.dumps(encoded).encode()).hexdigest()}
        db.row_factory = sqlite3.Row
        warnings = {'order_total_mismatches': 0, 'legacy_payment_or_region': 0,
                    'blank_customer_fields': 0}
        for row in db.execute('SELECT * FROM orders'):
            items = json.loads(row['items'])
            if not isinstance(items, list) or not items:
                raise ValueError('Invalid order items; source needs review')
            for item in items:
                if not isinstance(item, dict) or not {'id', 'title', 'quantity', 'price'} <= item.keys():
                    raise ValueError('Invalid order item shape')
                if type(item['quantity']) is not int or item['quantity'] < 1 or type(item['price']) is not int or item['price'] < 0:
                    raise ValueError('Invalid order item amounts')
            warnings['order_total_mismatches'] += row['total'] != row['delivery_fee'] + sum(i['price'] * i['quantity'] for i in items)
            warnings['legacy_payment_or_region'] += row['payment_method'] not in ('cash_on_delivery', 'fib') or row['delivery_region'] not in ('kurdistan', 'outside_kurdistan')
            warnings['blank_customer_fields'] += any(not row[k].strip() for k in ('name', 'mobile', 'city', 'address'))
        for row in db.execute('SELECT * FROM inquiries'):
            warnings['blank_customer_fields'] += any(not row[k].strip() for k in ('name', 'mobile'))
        for row in db.execute('SELECT * FROM managed_books'):
            book = json.loads(row['data'])
            if not isinstance(book, dict) or book.get('id') != row['id']:
                raise ValueError('Managed product identity mismatch')
            for field in ('image', 'imageFull'):
                image = book.get(field, '')
                if image.startswith('api/book-images/'):
                    key = image[len('api/book-images/'):]
                    if not key or Path(key).name != key or not (objects / key).is_file():
                        raise ValueError('Referenced uploaded cover missing')
        schema = db.execute("SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY type,name").fetchall()
        return {'tables': report, 'schema_sha256': hashlib.sha256(repr([tuple(x) for x in schema]).encode()).hexdigest(), 'warnings': warnings}


def inventory(root):
    result = {}
    for p in sorted(root.rglob('*')):
        if p.is_symlink():
            raise ValueError('Symbolic links are not supported')
        if p.is_file():
            result[p.relative_to(root).as_posix()] = digest(p)
    return result


def private_copy(source, destination):
    shutil.copytree(source, destination)
    for p in destination.rglob('*'):
        p.chmod(0o700 if p.is_dir() else 0o600)


def verify(bundle):
    manifest = json.loads((bundle / 'manifest.json').read_text())
    if manifest.get('version') != 1:
        raise ValueError('Unsupported snapshot version')
    actual = inventory(bundle)
    actual.pop('manifest.json', None)
    if actual != manifest['files']:
        raise ValueError('Snapshot files failed checksum verification')
    report = inspect(bundle / 'database.sqlite', bundle / 'objects')
    if report != manifest['database']:
        raise ValueError('Database counts/content/schema differ from manifest')
    return report


def publish_new(staging, output):
    # Exclusive mkdir refuses even an empty existing target. Never replace it.
    output.mkdir(mode=0o700)
    try:
        for p in staging.iterdir():
            shutil.move(str(p), str(output / p.name))
    except BaseException:
        shutil.rmtree(output)
        raise


def export(database, objects, metadata, output):
    if output.exists():
        raise ValueError('Destination already exists')
    if not objects.is_dir() or objects.is_symlink():
        raise ValueError('Provide a complete bucket export directory, even if empty')
    if output.resolve().is_relative_to(objects.resolve()):
        raise ValueError('Destination must be outside the source objects directory')
    inventory(objects)  # Reject links before copying.
    meta = json.loads(metadata.read_text())
    if not isinstance(meta, dict) or set(meta) != set(inventory(objects)):
        raise ValueError('Bucket metadata must contain exactly every exported object key')
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=output.parent) as tmp:
        stage = Path(tmp)
        with connect(database) as src, sqlite3.connect(stage / 'database.sqlite') as dst:
            src.backup(dst)  # Transactionally consistent SQLite backup, including WAL.
        (stage / 'database.sqlite').chmod(0o600)
        private_copy(objects, stage / 'objects')
        (stage / 'object-metadata.json').write_text(json.dumps(meta, sort_keys=True))
        (stage / 'object-metadata.json').chmod(0o600)
        manifest = {'version': 1, 'database': inspect(stage / 'database.sqlite', stage / 'objects'), 'files': inventory(stage)}
        (stage / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
        (stage / 'manifest.json').chmod(0o600)
        verify(stage)
        publish_new(stage, output)
    return manifest['database']


def restore(bundle, output):
    if output.exists():
        raise ValueError('Destination already exists; restore only to a new staging directory')
    if output.resolve().is_relative_to(bundle.resolve()):
        raise ValueError('Destination must be outside the snapshot')
    verify(bundle)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=output.parent) as tmp:
        stage = Path(tmp) / 'snapshot'
        private_copy(bundle, stage)
        report = verify(stage)
        publish_new(stage, output)
    return report


def main():
    os.umask(0o077)
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest='command', required=True)
    exp = sub.add_parser('export')
    for name in ('database', 'objects', 'metadata', 'output'):
        exp.add_argument('--' + name, required=True, type=Path)
    for name in ('verify', 'restore'):
        cmd = sub.add_parser(name)
        cmd.add_argument('--bundle', required=True, type=Path)
        if name == 'restore':
            cmd.add_argument('--output', required=True, type=Path)
    args = vars(p.parse_args())
    command = args.pop('command')
    try:
        report = globals()[command](**args)
        # Aggregate counts only: no customer data, password hashes, tokens or object keys.
        print(json.dumps({'counts': {k: v['count'] for k, v in report['tables'].items()}, 'warnings': report['warnings']}, indent=2))
    except Exception:
        p.exit(1, 'Transfer failed; no existing destination was changed. Check input integrity, schema, assets and destination.\n')


if __name__ == '__main__':
    main()
