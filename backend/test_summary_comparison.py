"""
test_summary_comparison.py
==========================
Perbandingan hasil endpoint summary LAMA (in-memory Python) vs BARU (MongoDB aggregation).

Cara pakai:
    python test_summary_comparison.py [YYYY-MM]

Jika YYYY-MM tidak diberikan, digunakan bulan saat ini.

Prasyarat:
    pip install motor pymongo python-dotenv

Pastikan file .env di folder backend sudah berisi MONGODB_URI yang mengarah ke staging.
JANGAN jalankan ke database production.
"""

import asyncio
import sys
import os
from datetime import datetime, timezone
from pathlib import Path

# ── DINONAKTIFKAN ────────────────────────────────────────────────────────────
# Script ini TIDAK aman dijalankan begitu saja: ia membaca MONGO_URL dari .env yang
# targetnya belum terverifikasi (staging/production) dan memuat salinan logika yang
# sudah usang. Gunakan backend/test_summary_logic.py (data sintetis, tanpa database nyata).
if os.environ.get('I_CONFIRM_THIS_IS_STAGING_READONLY') != '1':
    sys.exit('Dinonaktifkan. Gunakan test_summary_logic.py. '
             '(Untuk memaksa: set I_CONFIRM_THIS_IS_STAGING_READONLY=1 SETELAH memverifikasi target DB adalah staging.)')

# Load env dari folder backend
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / '.env')

from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URI = os.environ.get('MONGO_URL', os.environ.get('MONGODB_URI', 'mongodb://localhost:27017'))
DB_NAME = os.environ.get('DB_NAME', 'sistem-absen')

client = AsyncIOMotorClient(MONGODB_URI)
db = client[DB_NAME]

TOLERANCE = 1e-6  # float comparison tolerance

# ─────────────────────────────────────────────────────────────────────────────
# CASHFLOW SUMMARY: logika LAMA (in-memory)
# ─────────────────────────────────────────────────────────────────────────────
async def cashflow_summary_old(month: str) -> dict:
    query = {'date': {'$regex': f'^{month}'}}
    cashflow_docs, print_jobs, projects, kasbon_docs = await asyncio.gather(
        db.cashflow.find(query, {'_id': 0}).to_list(None),
        db.print_jobs.find(query, {'_id': 0}).to_list(None),
        db.projects.find(query, {'_id': 0}).to_list(None),
        db.kasbon.find(query, {'_id': 0}).to_list(None),
    )
    manual_income = sum(float(d.get('amount') or 0) for d in cashflow_docs if d.get('type') == 'income')
    manual_expense = sum(float(d.get('amount') or 0) for d in cashflow_docs if d.get('type') == 'expense')
    manual_income_cash = sum(float(d.get('amount') or 0) for d in cashflow_docs if d.get('type') == 'income' and str(d.get('payment_method') or 'cash').lower() == 'cash')
    manual_expense_cash = sum(float(d.get('amount') or 0) for d in cashflow_docs if d.get('type') == 'expense' and str(d.get('payment_method') or 'cash').lower() == 'cash')
    print_cash = sum(float(j.get('total_price') or 0) for j in print_jobs if str(j.get('payment_method') or 'cash').lower() == 'cash')
    print_transfer = sum(float(j.get('total_price') or 0) for j in print_jobs if str(j.get('payment_method') or '').lower() == 'transfer')
    project_cash = sum(float(p.get('selling_price') or p.get('total_project_value') or 0) for p in projects if str(p.get('payment_method') or 'cash').lower() == 'cash')
    project_transfer = sum(float(p.get('selling_price') or p.get('total_project_value') or 0) for p in projects if str(p.get('payment_method') or '').lower() == 'transfer')
    kasbon_cash = sum(float(k.get('amount') or 0) for k in kasbon_docs if str(k.get('payment_method') or 'cash').lower() == 'cash')
    kasbon_transfer = sum(float(k.get('amount') or 0) for k in kasbon_docs if str(k.get('payment_method') or '').lower() == 'transfer')
    total_kasbon = kasbon_cash + kasbon_transfer
    total_income = manual_income + print_cash + print_transfer + project_cash + project_transfer
    total_expense = manual_expense + kasbon_cash
    manual_balance = manual_income_cash - manual_expense_cash
    return {
        'total_income': total_income, 'total_expense': total_expense,
        'balance': total_income - total_expense,
        'manual_income': manual_income, 'manual_expense': manual_expense,
        'manual_balance': manual_balance,
        'print_job_cash': print_cash, 'print_job_transfer': print_transfer,
        'print_job_total': print_cash + print_transfer,
        'project_cash': project_cash, 'project_transfer': project_transfer,
        'project_total': project_cash + project_transfer,
        'total_kasbon': total_kasbon, 'kasbon_cash': kasbon_cash,
        'kasbon_transfer': kasbon_transfer,
    }

# ─────────────────────────────────────────────────────────────────────────────
# CASHFLOW SUMMARY: logika BARU (aggregation)
# ─────────────────────────────────────────────────────────────────────────────
async def cashflow_summary_new(month: str) -> dict:
    date_filter = {'$regex': f'^{month}'}

    cashflow_pipeline = [
        {'$match': {'date': date_filter}},
        {'$addFields': {
            '_type':   '$type',
            '_amt':    {'$ifNull': ['$amount', 0]},
            '_method': {'$toLower': {'$ifNull': ['$payment_method', 'cash']}},
        }},
        {'$group': {
            '_id': None,
            'income':       {'$sum': {'$cond': [{'$eq': ['$_type', 'income']}, '$_amt', 0]}},
            'expense':      {'$sum': {'$cond': [{'$eq': ['$_type', 'expense']}, '$_amt', 0]}},
            'income_cash':  {'$sum': {'$cond': [
                {'$and': [{'$eq': ['$_type', 'income']}, {'$eq': ['$_method', 'cash']}]},
                '$_amt', 0,
            ]}},
            'expense_cash': {'$sum': {'$cond': [
                {'$and': [{'$eq': ['$_type', 'expense']}, {'$eq': ['$_method', 'cash']}]},
                '$_amt', 0,
            ]}},
        }},
    ]
    print_jobs_pipeline = [
        {'$match': {'date': date_filter}},
        {'$addFields': {
            '_amt':    {'$ifNull': ['$total_price', 0]},
            '_method': {'$toLower': {'$ifNull': ['$payment_method', 'cash']}},
        }},
        {'$group': {
            '_id': None,
            'print_cash':     {'$sum': {'$cond': [{'$ne': ['$_method', 'transfer']}, '$_amt', 0]}},
            'print_transfer': {'$sum': {'$cond': [{'$eq': ['$_method', 'transfer']}, '$_amt', 0]}},
        }},
    ]
    projects_pipeline = [
        {'$match': {'date': date_filter}},
        {'$addFields': {
            '_val':    {'$ifNull': ['$selling_price', {'$ifNull': ['$total_project_value', 0]}]},
            '_method': {'$toLower': {'$ifNull': ['$payment_method', 'cash']}},
        }},
        {'$group': {
            '_id': None,
            'project_cash':     {'$sum': {'$cond': [{'$ne': ['$_method', 'transfer']}, '$_val', 0]}},
            'project_transfer': {'$sum': {'$cond': [{'$eq': ['$_method', 'transfer']}, '$_val', 0]}},
        }},
    ]
    kasbon_pipeline = [
        {'$match': {'date': date_filter}},
        {'$addFields': {
            '_amt':    {'$ifNull': ['$amount', 0]},
            '_method': {'$toLower': {'$ifNull': ['$payment_method', 'cash']}},
        }},
        {'$group': {
            '_id': None,
            'kasbon_cash':     {'$sum': {'$cond': [{'$ne': ['$_method', 'transfer']}, '$_amt', 0]}},
            'kasbon_transfer': {'$sum': {'$cond': [{'$eq': ['$_method', 'transfer']}, '$_amt', 0]}},
        }},
    ]

    cf_res, pj_res, proj_res, kb_res = await asyncio.gather(
        db.cashflow.aggregate(cashflow_pipeline).to_list(None),
        db.print_jobs.aggregate(print_jobs_pipeline).to_list(None),
        db.projects.aggregate(projects_pipeline).to_list(None),
        db.kasbon.aggregate(kasbon_pipeline).to_list(None),
    )

    cf   = cf_res[0]   if cf_res   else {}
    pj   = pj_res[0]   if pj_res   else {}
    proj = proj_res[0] if proj_res else {}
    kb   = kb_res[0]   if kb_res   else {}

    manual_income       = float(cf.get('income', 0))
    manual_expense      = float(cf.get('expense', 0))
    manual_income_cash  = float(cf.get('income_cash', 0))
    manual_expense_cash = float(cf.get('expense_cash', 0))
    print_cash          = float(pj.get('print_cash', 0))
    print_transfer      = float(pj.get('print_transfer', 0))
    project_cash        = float(proj.get('project_cash', 0))
    project_transfer    = float(proj.get('project_transfer', 0))
    kasbon_cash         = float(kb.get('kasbon_cash', 0))
    kasbon_transfer     = float(kb.get('kasbon_transfer', 0))

    total_kasbon   = kasbon_cash + kasbon_transfer
    total_income   = manual_income + print_cash + print_transfer + project_cash + project_transfer
    total_expense  = manual_expense + kasbon_cash
    manual_balance = manual_income_cash - manual_expense_cash

    return {
        'total_income': total_income, 'total_expense': total_expense,
        'balance': total_income - total_expense,
        'manual_income': manual_income, 'manual_expense': manual_expense,
        'manual_balance': manual_balance,
        'print_job_cash': print_cash, 'print_job_transfer': print_transfer,
        'print_job_total': print_cash + print_transfer,
        'project_cash': project_cash, 'project_transfer': project_transfer,
        'project_total': project_cash + project_transfer,
        'total_kasbon': total_kasbon, 'kasbon_cash': kasbon_cash,
        'kasbon_transfer': kasbon_transfer,
    }

# ─────────────────────────────────────────────────────────────────────────────
# PRINT JOBS SUMMARY: logika LAMA (in-memory)
# ─────────────────────────────────────────────────────────────────────────────
async def print_jobs_summary_old(month: str) -> dict:
    query = {'date': {'$regex': f'^{month}'}}
    jobs = await db.print_jobs.find(query, {'_id': 0}).to_list(None)
    total = cash = transfer = 0.0
    by_mat: dict = {}
    for j in jobs:
        amt = float(j.get('total_price') or 0)
        total += amt
        method = str(j.get('payment_method') or 'cash').lower()
        if method == 'transfer':
            transfer += amt
        else:
            cash += amt
        mat = str(j.get('material') or 'unknown')
        e = by_mat.setdefault(mat, {'total_qty': 0.0, 'total_revenue': 0.0})
        e['total_qty'] += float(j.get('quantity') or 0)
        e['total_revenue'] += amt
    return {
        'total_revenue': total, 'cash_revenue': cash, 'transfer_revenue': transfer,
        'total_jobs': len(jobs),
        'by_material': [{'material': m, **e} for m, e in by_mat.items()],
    }

# ─────────────────────────────────────────────────────────────────────────────
# PRINT JOBS SUMMARY: logika BARU (aggregation)
# ─────────────────────────────────────────────────────────────────────────────
async def print_jobs_summary_new(month: str) -> dict:
    match_query = {'date': {'$regex': f'^{month}'}}

    totals_pipeline = [
        {'$match': match_query},
        {'$addFields': {
            '_amt':    {'$ifNull': ['$total_price', 0]},
            '_method': {'$toLower': {'$ifNull': ['$payment_method', 'cash']}},
        }},
        {'$group': {
            '_id': None,
            'total_revenue':    {'$sum': '$_amt'},
            'transfer_revenue': {'$sum': {'$cond': [{'$eq': ['$_method', 'transfer']}, '$_amt', 0]}},
            'cash_revenue':     {'$sum': {'$cond': [{'$ne': ['$_method', 'transfer']}, '$_amt', 0]}},
            'total_jobs':       {'$sum': 1},
        }},
    ]
    by_material_pipeline = [
        {'$match': match_query},
        {'$addFields': {
            '_mat': {'$ifNull': ['$material', 'unknown']},
            '_amt': {'$ifNull': ['$total_price', 0]},
            '_qty': {'$ifNull': ['$quantity', 0]},
        }},
        {'$group': {
            '_id': '$_mat',
            'total_qty':     {'$sum': '$_qty'},
            'total_revenue': {'$sum': '$_amt'},
        }},
    ]

    totals_result, by_mat_result = await asyncio.gather(
        db.print_jobs.aggregate(totals_pipeline).to_list(None),
        db.print_jobs.aggregate(by_material_pipeline).to_list(None),
    )

    totals = totals_result[0] if totals_result else {
        'total_revenue': 0.0, 'cash_revenue': 0.0, 'transfer_revenue': 0.0, 'total_jobs': 0
    }
    by_material = [
        {'material': r['_id'], 'total_qty': float(r['total_qty']), 'total_revenue': float(r['total_revenue'])}
        for r in by_mat_result
    ]
    return {
        'total_revenue':    float(totals.get('total_revenue', 0)),
        'cash_revenue':     float(totals.get('cash_revenue', 0)),
        'transfer_revenue': float(totals.get('transfer_revenue', 0)),
        'total_jobs':       int(totals.get('total_jobs', 0)),
        'by_material':      by_material,
    }

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────
def compare_numeric_keys(label: str, old: dict, new: dict, skip_keys: list = None) -> list[str]:
    """Compare all numeric keys between old and new dicts. Returns list of failure messages."""
    skip = set(skip_keys or [])
    failures = []
    for key in old:
        if key in skip:
            continue
        if key not in new:
            failures.append(f'  [{label}] Key hilang di NEW: {key}')
            continue
        v_old = old[key]
        v_new = new[key]
        if isinstance(v_old, (int, float)) and isinstance(v_new, (int, float)):
            if abs(float(v_old) - float(v_new)) > TOLERANCE:
                failures.append(f'  [{label}] MISMATCH key="{key}": OLD={v_old}, NEW={v_new}')
        elif v_old != v_new:
            failures.append(f'  [{label}] MISMATCH key="{key}": OLD={v_old!r}, NEW={v_new!r}')
    for key in new:
        if key not in old and key not in skip:
            failures.append(f'  [{label}] Key ekstra di NEW: {key}')
    return failures

def compare_by_material(label: str, old_list: list, new_list: list) -> list[str]:
    """Compare by_material lists (order-independent, by material name)."""
    failures = []
    old_map = {item['material']: item for item in old_list}
    new_map = {item['material']: item for item in new_list}
    all_materials = set(old_map) | set(new_map)
    for mat in all_materials:
        if mat not in old_map:
            failures.append(f'  [{label}] Material "{mat}" ada di NEW tapi tidak di OLD')
            continue
        if mat not in new_map:
            failures.append(f'  [{label}] Material "{mat}" ada di OLD tapi tidak di NEW')
            continue
        o = old_map[mat]
        n = new_map[mat]
        for field in ('total_qty', 'total_revenue'):
            if abs(float(o.get(field, 0)) - float(n.get(field, 0))) > TOLERANCE:
                failures.append(
                    f'  [{label}] by_material["{mat}"].{field}: OLD={o.get(field)}, NEW={n.get(field)}'
                )
    return failures

def print_result(label: str, passed: bool, failures: list[str] = None):
    status = '✅ PASS' if passed else '❌ FAIL'
    print(f'{status}  {label}')
    if failures:
        for f in failures:
            print(f)

# ─────────────────────────────────────────────────────────────────────────────
# TEST CASES
# ─────────────────────────────────────────────────────────────────────────────
async def run_tests(test_month: str):
    now = datetime.now(timezone.utc)
    current_month = now.strftime('%Y-%m')
    prev_month = (now.replace(day=1) - __import__('datetime').timedelta(days=1)).strftime('%Y-%m')
    # 3 months ago (always ≤6 months)
    y, m = int(test_month[:4]), int(test_month[5:7])
    three_ago_m = m - 3
    three_ago_y = y
    if three_ago_m <= 0:
        three_ago_m += 12
        three_ago_y -= 1
    three_months_ago = f'{three_ago_y}-{three_ago_m:02d}'

    test_months = [
        ('Bulan dipilih (from CLI)', test_month),
        ('Bulan sekarang', current_month),
        ('Bulan lalu', prev_month),
        ('3 bulan lalu', three_months_ago),
        # Bulan yang kemungkinan kosong (jauh di masa lalu)
        ('Bulan kosong (2000-01)', '2000-01'),
    ]

    all_pass = True
    total_tests = 0
    passed_tests = 0

    print('=' * 64)
    print('TEST: /api/cashflow/summary')
    print('=' * 64)

    for label, month in test_months:
        total_tests += 1
        try:
            old, new = await asyncio.gather(
                cashflow_summary_old(month),
                cashflow_summary_new(month),
            )
            failures = compare_numeric_keys(f'cashflow/{month}', old, new)
            ok = len(failures) == 0
            print_result(f'{label} [{month}]', ok, failures)
            if ok:
                passed_tests += 1
            else:
                all_pass = False
        except Exception as e:
            print_result(f'{label} [{month}]', False, [f'  ERROR: {e}'])
            all_pass = False

    print()
    print('=' * 64)
    print('TEST: /api/print-jobs/summary')
    print('=' * 64)

    for label, month in test_months:
        total_tests += 1
        try:
            old, new = await asyncio.gather(
                print_jobs_summary_old(month),
                print_jobs_summary_new(month),
            )
            # Compare numeric top-level keys
            failures = compare_numeric_keys(
                f'print-jobs/{month}', old, new, skip_keys=['by_material']
            )
            # Compare by_material separately (order-independent)
            failures += compare_by_material(
                f'print-jobs/{month}', old.get('by_material', []), new.get('by_material', [])
            )
            ok = len(failures) == 0
            print_result(f'{label} [{month}]', ok, failures)
            if ok:
                passed_tests += 1
            else:
                all_pass = False
        except Exception as e:
            print_result(f'{label} [{month}]', False, [f'  ERROR: {e}'])
            all_pass = False

    print()
    print('=' * 64)
    print(f'HASIL: {passed_tests}/{total_tests} test lulus')
    if all_pass:
        print('✅ Semua test LULUS — implementasi baru identik dengan lama.')
    else:
        print('❌ Ada perbedaan — JANGAN deploy sebelum perbedaan diselidiki.')
    print('=' * 64)

    client.close()


if __name__ == '__main__':
    month_arg = sys.argv[1] if len(sys.argv) > 1 else datetime.now(timezone.utc).strftime('%Y-%m')
    # Validate basic format
    import re
    if not re.fullmatch(r'\d{4}-\d{2}', month_arg):
        print(f'Format bulan tidak valid: {month_arg!r}. Gunakan YYYY-MM.')
        sys.exit(1)
    print(f'[INFO] Menggunakan bulan uji utama: {month_arg}')
    print(f'[INFO] Database: {DB_NAME} @ {MONGODB_URI[:40]}...')
    print()
    asyncio.run(run_tests(month_arg))
