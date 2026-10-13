"""
summary_logic.py
================
Logika murni (tanpa I/O, tanpa .env, tanpa koneksi database) untuk endpoint:
  - GET /api/cashflow/summary
  - GET /api/print-jobs/summary

Dipakai oleh backend/server.py dan oleh backend/test_summary_logic.py.
Tidak menambah dependency: hanya library standar Python.

Kompatibilitas dengan implementasi lama (in-memory) yang SENGAJA dipertahankan:
  * nilai kosong   : float(x or 0)                      -> _num()
  * payment_method : str(pm or 'cash').lower()          -> _method_expr()
  * cashflow summary: cash HANYA == 'cash', transfer HANYA == 'transfer'
                      (nilai lain tidak masuk keduanya, sama seperti kode lama)
  * print-jobs summary: 'transfer' -> transfer, selain itu -> cash
  * harga proyek   : selling_price or total_project_value or 0 (truthiness Python)
  * material kosong: str(material or 'unknown')
"""

import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

# Batas maksimum rentang pencarian (hari). Sama dengan 6 bulan di endpoint paginated.
MAX_RANGE_DAYS = 180

# Zona waktu bisnis (WIB, UTC+7). Hanya dipakai untuk menentukan "bulan berjalan"
# saat client tidak mengirim parameter periode apa pun.
WIB = timezone(timedelta(hours=7))

_MONTH_RE = re.compile(r'(\d{4})-(0[1-9]|1[0-2])')
_DATE_RE = re.compile(r'\d{4}-\d{2}-\d{2}')


class PeriodError(ValueError):
    """Parameter periode tidak valid. Endpoint menerjemahkannya menjadi HTTP 400."""


# ── Periode ──────────────────────────────────────────────────────────────────
def current_month_wib(now: Optional[datetime] = None) -> str:
    now = now or datetime.now(timezone.utc)
    return now.astimezone(WIB).strftime('%Y-%m')


def resolve_date_filter(
    month: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    *,
    allow_range: bool = True,
    now: Optional[datetime] = None,
) -> Dict[str, Any]:
    """Mengembalikan nilai filter untuk field `date` (dipakai sebagai {'date': <hasil>}).

    Aturan (tidak ada pergeseran periode secara diam-diam):
      - month bersamaan dengan start/end        -> PeriodError
      - month harus YYYY-MM dengan bulan 01..12 -> PeriodError jika tidak valid
      - start tanpa end / end tanpa start       -> PeriodError
      - start/end harus YYYY-MM-DD kalender valid, end >= start,
        rentang (end - start) <= 180 hari       -> PeriodError jika dilanggar
      - tanpa parameter                         -> bulan berjalan (WIB)
    Tanggal tersimpan sebagai string 'YYYY-MM-DD' (kadang dengan sufiks timestamp),
    sehingga filter berbasis prefix/string aman untuk keduanya.
    """
    has_range = start is not None or end is not None
    if month is not None and has_range:
        raise PeriodError('Gunakan salah satu: month ATAU start+end, tidak boleh keduanya.')

    if month is not None:
        if not _MONTH_RE.fullmatch(month):
            raise PeriodError('Format bulan tidak valid. Gunakan YYYY-MM.')
        return {'$regex': f'^{month}'}

    if has_range:
        if not allow_range:
            raise PeriodError('Endpoint ini hanya menerima parameter month (YYYY-MM).')
        if not start or not end:
            raise PeriodError('Parameter start dan end harus dikirim bersamaan.')
        if not (_DATE_RE.fullmatch(start) and _DATE_RE.fullmatch(end)):
            raise PeriodError('Format tanggal tidak valid. Gunakan YYYY-MM-DD.')
        try:
            d_start = datetime.strptime(start, '%Y-%m-%d').date()
            d_end = datetime.strptime(end, '%Y-%m-%d').date()
        except ValueError:
            raise PeriodError('Tanggal tidak valid. Gunakan tanggal kalender yang benar (YYYY-MM-DD).')
        if d_end < d_start:
            raise PeriodError('Tanggal akhir tidak boleh sebelum tanggal awal.')
        if (d_end - d_start).days > MAX_RANGE_DAYS:
            raise PeriodError(f'Rentang tanggal tidak boleh lebih dari {MAX_RANGE_DAYS} hari (6 bulan).')
        return {'$gte': start, '$lte': end + '\uffff'}

    return {'$regex': f'^{current_month_wib(now)}'}


# ── Ekspresi aggregation yang meniru semantik Python lama ────────────────────
def _num(expr: Any) -> Dict[str, Any]:
    """float(x or 0). null/hilang/''/0 -> 0; string numerik '15000' -> 15000.0;
    string tidak numerik -> 0 (kode lama akan error 500; di sini aman)."""
    return {'$convert': {'input': expr, 'to': 'double', 'onError': 0, 'onNull': 0}}


def _truthy(expr: Any) -> Dict[str, Any]:
    """Truthiness Python untuk nilai skalar: None, '', 0, False -> falsy."""
    return {'$not': [{'$in': [{'$ifNull': [expr, '']}, ['', 0, False]]}]}


def _method_expr() -> Dict[str, Any]:
    """str(payment_method or 'cash').lower()  (null, hilang, '' -> 'cash')."""
    return {'$toLower': {'$cond': [
        {'$eq': [{'$ifNull': ['$payment_method', '']}, '']},
        'cash',
        '$payment_method',
    ]}}


def _sum_if(cond: Any, value: Any) -> Dict[str, Any]:
    return {'$sum': {'$cond': [cond, value, 0]}}


def _is(method_field: str, name: str) -> Dict[str, Any]:
    return {'$eq': [method_field, name]}


# ── Print Jobs summary ───────────────────────────────────────────────────────
def build_print_jobs_totals_pipeline(date_filter: Dict[str, Any]) -> List[Dict[str, Any]]:
    """total_revenue / cash / transfer / total_jobs.
    Dihitung dari field ROOT (total_price) satu kali per dokumen, tanpa $unwind,
    sehingga materials[] tidak bisa menggandakan pendapatan atau jumlah pekerjaan."""
    return [
        {'$match': {'date': date_filter}},
        {'$addFields': {'_amt': _num('$total_price'), '_m': _method_expr()}},
        {'$group': {
            '_id': None,
            'total_revenue': {'$sum': '$_amt'},
            'transfer_revenue': _sum_if(_is('$_m', 'transfer'), '$_amt'),
            'cash_revenue': _sum_if({'$ne': ['$_m', 'transfer']}, '$_amt'),
            'total_jobs': {'$sum': 1},
        }},
    ]


def build_print_jobs_by_material_pipeline(date_filter: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Rincian per bahan.
    - Dokumen format baru (materials = list tidak kosong): satu baris per elemen,
      qty = quantity, pendapatan = (price_per_unit, fallback harga_normal) * quantity.
    - Dokumen format lama: satu baris dari field root material/quantity/total_price.
    Nama bahan kosong -> 'unknown' (sama seperti kode lama)."""
    n_materials = {'$cond': [{'$isArray': '$materials'}, {'$size': '$materials'}, 0]}
    new_lines = {'$map': {
        'input': '$materials',
        'as': 'm',
        'in': {
            'name': {'$cond': [_truthy('$$m.name'), '$$m.name', 'unknown']},
            'qty': _num('$$m.quantity'),
            'rev': {'$multiply': [
                _num({'$ifNull': ['$$m.price_per_unit', '$$m.harga_normal']}),
                _num('$$m.quantity'),
            ]},
        },
    }}
    old_line = [{
        'name': {'$cond': [_truthy('$material'), '$material', 'unknown']},
        'qty': _num('$quantity'),
        'rev': _num('$total_price'),
    }]
    return [
        {'$match': {'date': date_filter}},
        {'$project': {'_lines': {'$cond': [{'$gt': [n_materials, 0]}, new_lines, old_line]}}},
        {'$unwind': '$_lines'},
        {'$group': {
            '_id': '$_lines.name',
            'total_qty': {'$sum': '$_lines.qty'},
            'total_revenue': {'$sum': '$_lines.rev'},
        }},
    ]


def assemble_print_jobs_summary(totals_rows: List[dict], material_rows: List[dict]) -> Dict[str, Any]:
    t = totals_rows[0] if totals_rows else {}
    return {
        'total_revenue': float(t.get('total_revenue') or 0),
        'cash_revenue': float(t.get('cash_revenue') or 0),
        'transfer_revenue': float(t.get('transfer_revenue') or 0),
        'total_jobs': int(t.get('total_jobs') or 0),
        'by_material': [
            {
                'material': str(r['_id']),
                'total_qty': float(r.get('total_qty') or 0),
                'total_revenue': float(r.get('total_revenue') or 0),
            }
            for r in material_rows
        ],
    }


# ── Cashflow summary ─────────────────────────────────────────────────────────
def build_cashflow_pipelines(date_filter: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
    match = {'$match': {'date': date_filter}}
    return {
        'cashflow': [
            match,
            {'$addFields': {'_amt': _num('$amount'), '_m': _method_expr()}},
            {'$group': {
                '_id': None,
                'income': _sum_if({'$eq': ['$type', 'income']}, '$_amt'),
                'expense': _sum_if({'$eq': ['$type', 'expense']}, '$_amt'),
                'income_cash': _sum_if(
                    {'$and': [{'$eq': ['$type', 'income']}, _is('$_m', 'cash')]}, '$_amt'),
                'expense_cash': _sum_if(
                    {'$and': [{'$eq': ['$type', 'expense']}, _is('$_m', 'cash')]}, '$_amt'),
            }},
        ],
        'print_jobs': [
            match,
            {'$addFields': {'_amt': _num('$total_price'), '_m': _method_expr()}},
            {'$group': {
                '_id': None,
                'cash': _sum_if(_is('$_m', 'cash'), '$_amt'),
                'transfer': _sum_if(_is('$_m', 'transfer'), '$_amt'),
            }},
        ],
        'projects': [
            match,
            {'$addFields': {
                '_amt': {'$cond': [
                    _truthy('$selling_price'),
                    _num('$selling_price'),
                    _num('$total_project_value'),
                ]},
                '_m': _method_expr(),
            }},
            {'$group': {
                '_id': None,
                'cash': _sum_if(_is('$_m', 'cash'), '$_amt'),
                'transfer': _sum_if(_is('$_m', 'transfer'), '$_amt'),
            }},
        ],
        'kasbon': [
            match,
            {'$addFields': {'_amt': _num('$amount'), '_m': _method_expr()}},
            {'$group': {
                '_id': None,
                'cash': _sum_if(_is('$_m', 'cash'), '$_amt'),
                'transfer': _sum_if(_is('$_m', 'transfer'), '$_amt'),
            }},
        ],
    }


def assemble_cashflow_summary(
    cf_rows: List[dict], pj_rows: List[dict], proj_rows: List[dict], kb_rows: List[dict]
) -> Dict[str, Any]:
    cf = cf_rows[0] if cf_rows else {}
    pj = pj_rows[0] if pj_rows else {}
    proj = proj_rows[0] if proj_rows else {}
    kb = kb_rows[0] if kb_rows else {}

    manual_income = float(cf.get('income') or 0)
    manual_expense = float(cf.get('expense') or 0)
    manual_income_cash = float(cf.get('income_cash') or 0)
    manual_expense_cash = float(cf.get('expense_cash') or 0)
    print_cash = float(pj.get('cash') or 0)
    print_transfer = float(pj.get('transfer') or 0)
    project_cash = float(proj.get('cash') or 0)
    project_transfer = float(proj.get('transfer') or 0)
    kasbon_cash = float(kb.get('cash') or 0)
    kasbon_transfer = float(kb.get('transfer') or 0)

    total_income = manual_income + print_cash + print_transfer + project_cash + project_transfer
    # kasbon_transfer sengaja TIDAK masuk total_expense (aturan bisnis lama).
    total_expense = manual_expense + kasbon_cash
    return {
        'total_income': total_income,
        'total_expense': total_expense,
        'balance': total_income - total_expense,
        'manual_income': manual_income,
        'manual_expense': manual_expense,
        'manual_balance': manual_income_cash - manual_expense_cash,
        'print_job_cash': print_cash,
        'print_job_transfer': print_transfer,
        'print_job_total': print_cash + print_transfer,
        'project_cash': project_cash,
        'project_transfer': project_transfer,
        'project_total': project_cash + project_transfer,
        'total_kasbon': kasbon_cash + kasbon_transfer,
        'kasbon_cash': kasbon_cash,
        'kasbon_transfer': kasbon_transfer,
    }
