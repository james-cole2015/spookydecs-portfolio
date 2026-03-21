"""
copy_prod_to_dev.py

Resets all dev DynamoDB tables to mirror prod exactly.

Steps per table:
  1. Backup current dev table to S3 (sd_table_migration_backups/{YYYY-MM}/{table}.json)
  2. Truncate dev table
  3. Copy prod records to dev (with URL/S3-key rewriting for images and finance)
  4. For images: copy S3 objects server-side (spooky-decs-shared-assets, /prod/ → /dev/)
  5. Verify: count prod vs dev

Usage:
    python copy_prod_to_dev.py [--region us-east-2] [--dry-run] [--table TABLE_PAIR]
    python copy_prod_to_dev.py --restore 2026-03 [--region us-east-2]
    python copy_prod_to_dev.py --restore 2026-03 --table sd_items_records [--region us-east-2]

Examples:
    python copy_prod_to_dev.py                        # full reset
    python copy_prod_to_dev.py --dry-run              # preview only
    python copy_prod_to_dev.py --table sd_items_records  # one table only
    python copy_prod_to_dev.py --restore 2026-03      # restore from March backup
"""

import argparse
import json
import sys
from datetime import datetime, timezone

import boto3
from botocore.exceptions import ClientError
from decimal import Decimal


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

REGION         = 'us-east-2'
S3_BUCKET      = 'spooky-decs-shared-assets'
BACKUP_BUCKET  = 'sd-table-migration-backups'

# (prod_table, dev_table, pk, sk_or_None, transform)
# transform: None | 'image' | 'finance'
TABLES = [
    ('sd_items_records_prod',          'sd_items_records_dev',          'id',            None,                 None),
    ('sd_images_records_prod',         'sd_images_records_dev',         'photo_id',      None,                 'image'),
    ('sd_maintenance_records_prod',    'sd_maintenance_records_dev',    'record_id',     None,                 None),
    ('sd_maintenance_schedules_prod',  'sd_maintenance_schedules_dev',  'schedule_id',   None,                 None),
    ('sd_deployments_records_prod',    'sd_deployments_records_dev',    'deployment_id', 'deployment_item_id', None),
    ('sd_ideas_records_prod',          'sd_ideas_records_dev',          'id',            None,                 None),
    ('sd_finance_records_prod',        'sd_finance_records_dev',        'cost_id',       'cost_date',          'finance'),
    ('sd_workbench_records_prod',      'sd_workbench_records_dev',      'season_id',     'workbench_item_id',  None),
    ('sd_inspector_rules_prod',        'sd_inspector_rules_dev',        'rule_id',       None,                 None),
    ('sd_inspector_violations_prod',   'sd_inspector_violations_dev',   'violation_id',  None,                 None),
]


# ---------------------------------------------------------------------------
# DynamoDB helpers
# ---------------------------------------------------------------------------

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def scan_all(table):
    """Full table scan; yields pages of items."""
    last_key = None
    while True:
        kwargs = {'ConsistentRead': True}
        if last_key:
            kwargs['ExclusiveStartKey'] = last_key
        resp = table.scan(**kwargs)
        yield resp.get('Items', [])
        last_key = resp.get('LastEvaluatedKey')
        if not last_key:
            break


def count_items(resource, table_name):
    total = 0
    for page in scan_all(resource.Table(table_name)):
        total += len(page)
    return total


def truncate_table(resource, table_name, pk, sk, dry_run):
    """Delete all items from a table. Returns count deleted."""
    table = resource.Table(table_name)
    deleted = 0
    for page in scan_all(table):
        if dry_run:
            deleted += len(page)
            continue
        with table.batch_writer() as batch:
            for item in page:
                key = {pk: item[pk]}
                if sk:
                    key[sk] = item[sk]
                batch.delete_item(Key=key)
        deleted += len(page)
    return deleted


def batch_write(table, items):
    with table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)


# ---------------------------------------------------------------------------
# Transform helpers
# ---------------------------------------------------------------------------

def _swap_stage(value):
    """Replace /prod/ with /dev/ in an S3 key or CloudFront URL."""
    if value and isinstance(value, str):
        return value.replace('/prod/', '/dev/', 1)
    return value


def rewrite_image_record(item):
    """Rewrite s3_key, thumb_s3_key, cloudfront_url, thumb_cloudfront_url."""
    item = dict(item)
    for field in ('s3_key', 'thumb_s3_key', 'cloudfront_url', 'thumb_cloudfront_url'):
        if field in item:
            item[field] = _swap_stage(item[field])
    return item


def rewrite_finance_record(item):
    """Rewrite receipt_s3_key and its cloudfront_url if present."""
    item = dict(item)
    if 'receipt_s3_key' in item:
        item['receipt_s3_key'] = _swap_stage(item['receipt_s3_key'])
    if 'receipt_cloudfront_url' in item:
        item['receipt_cloudfront_url'] = _swap_stage(item['receipt_cloudfront_url'])
    return item


TRANSFORMS = {
    'image':   rewrite_image_record,
    'finance': rewrite_finance_record,
}


# ---------------------------------------------------------------------------
# S3 helpers
# ---------------------------------------------------------------------------

def copy_image_s3(s3_client, prod_key, dry_run):
    """Server-side copy of a single S3 object from prod path to dev path."""
    dev_key = _swap_stage(prod_key)
    if prod_key == dev_key:
        return  # nothing to do
    if dry_run:
        return
    try:
        s3_client.copy_object(
            Bucket=S3_BUCKET,
            CopySource={'Bucket': S3_BUCKET, 'Key': prod_key},
            Key=dev_key,
        )
    except ClientError as e:
        code = e.response['Error']['Code']
        if code in ('NoSuchKey', '404'):
            print(f'    [WARN] S3 object not found: {prod_key}')
        else:
            raise


def backup_table_to_s3(s3_client, resource, table_name, month_prefix, backup_bucket, dry_run):
    """Scan table and upload all records as JSON to S3."""
    key = f'{month_prefix}/{table_name}.json'
    print(f'  Backing up → s3://{backup_bucket}/{key}')
    if dry_run:
        return

    all_items = []
    for page in scan_all(resource.Table(table_name)):
        all_items.extend(page)

    body = json.dumps(all_items, cls=DecimalEncoder)
    s3_client.put_object(
        Bucket=backup_bucket,
        Key=key,
        Body=body.encode('utf-8'),
        ContentType='application/json',
    )
    print(f'    Saved {len(all_items)} records.')


def restore_table_from_s3(s3_client, resource, table_name, month_prefix, backup_bucket, dry_run):
    """Download backup JSON from S3 and batch-write into dev table."""
    key = f'{month_prefix}/{table_name}.json'
    print(f'  Restoring from s3://{backup_bucket}/{key}')
    if dry_run:
        return

    try:
        obj = s3_client.get_object(Bucket=backup_bucket, Key=key)
    except ClientError as e:
        if e.response['Error']['Code'] in ('NoSuchKey', '404'):
            print(f'    [SKIP] Backup not found: {key}')
            return
        raise

    items = json.loads(obj['Body'].read().decode('utf-8'))
    # Convert floats back to Decimal for DynamoDB
    items = json.loads(json.dumps(items), parse_float=Decimal)

    table = resource.Table(table_name)
    written = 0
    chunk = []
    for item in items:
        chunk.append(item)
        if len(chunk) == 25:
            batch_write(table, chunk)
            written += len(chunk)
            chunk = []
    if chunk:
        batch_write(table, chunk)
        written += len(chunk)

    print(f'    Restored {written} records into {table_name}.')


# ---------------------------------------------------------------------------
# Per-table copy
# ---------------------------------------------------------------------------

def copy_table(resource, s3_client, prod_name, dev_name, pk, sk, transform_key, backup_bucket, dry_run):
    """
    Full copy of one prod table → dev table:
      - backup dev
      - truncate dev
      - scan prod, apply transform, write to dev
      - for image tables: copy S3 objects
      - verify counts
    """
    transform_fn = TRANSFORMS.get(transform_key)
    month_prefix = datetime.now(timezone.utc).strftime('%Y-%m')

    # Backup
    backup_table_to_s3(s3_client, resource, dev_name, month_prefix, backup_bucket, dry_run)

    # Truncate dev
    deleted = truncate_table(resource, dev_name, pk, sk, dry_run)
    print(f'  Truncated {dev_name}: {deleted} records removed.')

    # Copy prod → dev
    prod_table = resource.Table(prod_name)
    dev_table  = resource.Table(dev_name)
    written    = 0
    s3_copies  = 0
    s3_skipped = 0

    for page in scan_all(prod_table):
        transformed_page = []
        for item in page:
            if transform_fn:
                item = transform_fn(item)
            transformed_page.append(item)

            # S3 copy for images
            if transform_key == 'image':
                for field in ('s3_key', 'thumb_s3_key'):
                    prod_key = item.get(field)  # already rewritten to /dev/ by transform
                    if prod_key:
                        # derive original prod key from the now-rewritten dev key
                        original_prod_key = prod_key.replace('/dev/', '/prod/', 1)
                        copy_image_s3(s3_client, original_prod_key, dry_run)
                        if not dry_run:
                            s3_copies += 1
                        else:
                            s3_skipped += 1

        if not dry_run:
            batch_write(dev_table, transformed_page)
        written += len(transformed_page)

    label = '[DRY RUN] Would write' if dry_run else 'Written'
    print(f'  {label} {written} records to {dev_name}.')
    if transform_key == 'image':
        count = s3_skipped if dry_run else s3_copies
        verb = 'Would copy' if dry_run else 'Copied'
        print(f'  {verb} {count} S3 objects.')

    # Verify
    if not dry_run:
        prod_count = count_items(resource, prod_name)
        dev_count  = count_items(resource, dev_name)
        ok = prod_count == dev_count
        status = '[OK]' if ok else '[FAIL]'
        print(f'  Verify: prod={prod_count}  dev={dev_count}  {status}')
        return ok
    return True


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description='Reset dev DynamoDB tables from prod.')
    parser.add_argument('--region',        default=REGION,        help='AWS region')
    parser.add_argument('--backup-bucket', default=BACKUP_BUCKET, help='S3 bucket for backups')
    parser.add_argument('--dry-run',       action='store_true',   help='Preview without writing')
    parser.add_argument('--table',         metavar='TABLE',       help='Restrict to one table pair (e.g. sd_items_records)')
    parser.add_argument('--restore',       metavar='YYYY-MM',     help='Restore dev tables from a backup month')
    args = parser.parse_args()

    backup_bucket = args.backup_bucket
    resource   = boto3.resource('dynamodb', region_name=args.region)
    s3_client  = boto3.client('s3',        region_name=args.region)

    # Filter tables if --table specified
    tables = TABLES
    if args.table:
        name = args.table.replace('_prod', '').replace('_dev', '')
        tables = [t for t in TABLES if name in t[0] or name in t[1]]
        if not tables:
            print(f'No table pair matching "{args.table}". Available pairs:')
            for t in TABLES:
                print(f'  {t[0].replace("_prod", "")}')
            sys.exit(1)

    if args.dry_run:
        print('=== DRY RUN — no changes will be made ===\n')

    # ---- RESTORE MODE ----
    if args.restore:
        print(f'Restoring from backup: s3://{backup_bucket}/{args.restore}/')
        for prod_name, dev_name, pk, sk, transform_key in tables:
            print(f'\n[{dev_name}]')
            restore_table_from_s3(s3_client, resource, dev_name, args.restore, backup_bucket, args.dry_run)
        print('\nRestore complete.')
        return

    # ---- COPY MODE ----
    month_str = datetime.now(timezone.utc).strftime('%Y-%m')
    print(f'Prod → Dev reset | {len(tables)} tables | backup prefix: {month_str}')
    if args.dry_run:
        print()

    failures = []
    for prod_name, dev_name, pk, sk, transform_key in tables:
        sep = '=' * 65
        print(f'\n{sep}')
        print(f'  {prod_name}  →  {dev_name}')
        print(sep)
        ok = copy_table(resource, s3_client, prod_name, dev_name, pk, sk, transform_key, backup_bucket, args.dry_run)
        if not ok:
            failures.append(dev_name)

    print(f'\n{"=" * 65}')
    if failures:
        print(f'  COMPLETE WITH FAILURES: {failures}')
        sys.exit(1)
    else:
        verb = 'DRY RUN complete' if args.dry_run else 'Reset complete'
        print(f'  {verb}. All {len(tables)} tables OK.')


if __name__ == '__main__':
    main()
