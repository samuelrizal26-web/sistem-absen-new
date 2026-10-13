"""
test_summary_logic.py
=====================
Test KOMPATIBILITAS untuk backend/summary_logic.py (kode yang dipakai server.py).

AMAN: tidak membaca .env / MONGO_URL, tidak memakai motor, tidak ada koneksi jaringan.
Data sintetis dimasukkan ke database in-memory (mongomock). Tidak menyentuh production.

Cara menjalankan (dari folder backend, di lingkungan dev/CI, BUKAN dependency production):
    pip install mongomock          # hanya untuk test; jangan ditambahkan ke requirements-minimal.txt
    python -m unittest test_summary_logic -v

Oracle = rumus LAMA (in-memory Python) disalin apa adanya dari implementasi sebelum optimasi.
Test GAGAL jika implementasi baru berbeda dari rumus lama pada kasus yang harus kompatibel.

Catatan keterbatasan: mongomock bukan MongoDB asli. Jika mongomock belum mendukung operator
tertentu ($convert/$in/$map), test akan ERROR (bukan lulus). Lulus di mongomock BUKAN pengganti
verifikasi pada MongoDB staging yang sebenarnya.
"""

import sys
import unittest
from datetime import datetime, timezone

import summary_logic as sl

try:
    import mongomock
except ImportError:  # pragma: no cover
    mongomock = None


# ─────────────────────────────────────────────────────────────────────────────
# ORACLE: rumus LAMA (disalin dari implementasi in-memory sebelum optimasi)
# ─────────────────────────────────────────────────────────────────────────────
def old_cashflow_summary(cashflow_docs, print_jobs, projects, kasbon_docs):
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


def old_print_jobs_summary(jobs):
    total = cash = transfer = 0.0
    by_mat = {}
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
    return {'total_revenue': total, 'cash_revenue': cash, 'transfer_revenue': transfer,
            'total_jobs': len(jobs),
            'by_material': [{'material': m, **e} for m, e in by_mat.items()]}


def in_period(doc, date_filter):
    """Padanan Python dari filter `date` (hanya untuk menyiapkan input oracle)."""
    d = doc.get('date')
    if not isinstance(d, str):
        return False
    if '$regex' in date_filter:
        return d.startswith(date_filter['$regex'][1:])
    return date_filter['$gte'] <= d <= date_filter['$lte']


# ─────────────────────────────────────────────────────────────────────────────
# DATASET SINTETIS
# ─────────────────────────────────────────────────────────────────────────────
M = '2026-10'  # bulan uji


def d(day, suffix=''):
    return f'{M}-{day:02d}{suffix}'


CASHFLOW = [
    {'type': 'income', 'amount': 100000, 'payment_method': 'cash', 'date': d(1)},
    {'type': 'income', 'amount': 50000, 'payment_method': None, 'date': d(2)},          # null  -> cash
    {'type': 'income', 'amount': 25000, 'payment_method': '', 'date': d(3)},            # ''    -> cash (K2)
    {'type': 'income', 'amount': 8000, 'date': d(4)},                                   # hilang-> cash
    {'type': 'income', 'amount': 70000, 'payment_method': 'TRANSFER', 'date': d(5)},    # huruf besar
    {'type': 'income', 'amount': 15000.0, 'payment_method': 'Cash', 'date': d(6, 'T10:00:00')},  # sufiks timestamp
    {'type': 'income', 'amount': '15000', 'payment_method': 'cash', 'date': d(7)},      # nominal string historis
    {'type': 'income', 'amount': 0, 'payment_method': 'cash', 'date': d(8)},            # nominal nol
    {'type': 'income', 'amount': None, 'payment_method': 'cash', 'date': d(9)},         # nominal null
    {'type': 'expense', 'amount': 30000, 'payment_method': 'cash', 'date': d(10)},
    {'type': 'expense', 'amount': 12000, 'payment_method': 'qris', 'date': d(11)},      # nonstandar (K1)
    {'type': 'expense', 'amount': 9000, 'payment_method': '', 'date': d(12)},           # ''
    {'type': 'expense', 'amount': 4000, 'payment_method': 'transfer', 'date': d(13)},
    {'type': 'salary', 'amount': 99999, 'payment_method': 'cash', 'date': d(14)},       # harus diabaikan
    # di luar periode
    {'type': 'income', 'amount': 777777, 'payment_method': 'cash', 'date': '2026-09-30'},
    {'type': 'income', 'amount': 888888, 'payment_method': 'cash', 'date': '2025-10-01'},
]

# Format LAMA (root material/quantity) saja -> harus identik dengan kode lama, termasuk by_material
PRINT_OLD = [
    {'material': 'Flexi', 'quantity': 2, 'total_price': 100000, 'payment_method': 'cash', 'date': d(1)},
    {'material': 'Flexi', 'quantity': 3, 'total_price': 60000, 'payment_method': 'transfer', 'date': d(2)},
    {'material': '', 'quantity': 1, 'total_price': 5000, 'payment_method': 'transfer', 'date': d(3)},   # kosong -> unknown
    {'quantity': 4, 'total_price': 7000, 'payment_method': None, 'date': d(4)},                       # hilang -> unknown
    {'material': 'Sticker', 'quantity': '5', 'total_price': '7000', 'payment_method': '', 'date': d(5)},  # string historis
    {'material': 'Sticker', 'quantity': None, 'total_price': None, 'payment_method': 'cash', 'date': d(6)},
    {'material': 'Banner', 'quantity': 1, 'total_price': 20000, 'payment_method': 'qris', 'date': d(7)},
    {'material': 'Flexi', 'quantity': 1, 'total_price': 0, 'payment_method': 'cash', 'date': d(8, 'T09:00:00')},
    {'material': 'Flexi', 'quantity': 9, 'total_price': 999999, 'payment_method': 'cash', 'date': '2026-11-01'},
]

# Format BARU (materials[]): satu pekerjaan, banyak bahan
PRINT_NEW = [
    {'materials': [
        {'name': 'A', 'quantity': 2, 'harga_normal': 10000, 'price_per_unit': 10000},
        {'name': 'B', 'quantity': 1, 'harga_normal': 30000, 'price_per_unit': 30000},
    ], 'total_price': 50000, 'payment_method': 'cash', 'date': d(15)},
    {'materials': [
        {'name': 'A', 'quantity': 1, 'harga_normal': 12000, 'price_per_unit': 9000},   # diskon
        {'name': '', 'quantity': 2, 'harga_normal': 1000},                              # nama kosong, tanpa price_per_unit
    ], 'total_price': 11000, 'payment_method': 'transfer', 'date': d(16)},
]

PROJECTS = [
    {'selling_price': 500000, 'total_project_value': 1, 'payment_method': 'cash', 'date': d(1)},
    {'selling_price': 0, 'total_project_value': 300000, 'payment_method': 'transfer', 'date': d(2)},  # K3
    {'selling_price': None, 'total_project_value': 200000, 'payment_method': '', 'date': d(3)},
    {'total_project_value': 120000, 'payment_method': 'cash', 'date': d(4)},                          # tanpa selling_price
    {'selling_price': 1000, 'payment_method': 'qris', 'date': d(5)},                                  # nonstandar
    {'payment_method': 'cash', 'date': d(6)},                                                         # nilai hilang
    {'selling_price': 0, 'total_project_value': 0, 'payment_method': 'transfer', 'date': d(7)},       # nol
    {'selling_price': 654321, 'payment_method': 'cash', 'date': '2026-09-15'},                        # luar periode
]

KASBON = [
    {'amount': 40000, 'payment_method': 'cash', 'date': d(1)},
    {'amount': 60000, 'payment_method': 'transfer', 'date': d(2)},
    {'amount': 10000, 'payment_method': None, 'date': d(3)},
    {'amount': 5000, 'payment_method': 'qris', 'date': d(4)},
    {'amount': 3000, 'payment_method': '', 'date': d(5)},
    {'amount': '2500', 'payment_method': 'cash', 'date': d(6)},
    {'amount': 99999, 'payment_method': 'cash', 'date': '2026-09-01'},
]

CASHFLOW_KEYS = {
    'total_income', 'total_expense', 'balance', 'manual_income', 'manual_expense', 'manual_balance',
    'print_job_cash', 'print_job_transfer', 'print_job_total', 'project_cash', 'project_transfer',
    'project_total', 'total_kasbon', 'kasbon_cash', 'kasbon_transfer',
}
PRINT_KEYS = {'total_revenue', 'cash_revenue', 'transfer_revenue', 'total_jobs', 'by_material'}


def _fresh_db(print_docs=None):
    client = mongomock.MongoClient()
    db = client['unit_test_db']
    db.cashflow.insert_many([dict(x) for x in CASHFLOW])
    db.print_jobs.insert_many([dict(x) for x in (PRINT_OLD + PRINT_NEW if print_docs is None else print_docs)])
    db.projects.insert_many([dict(x) for x in PROJECTS])
    db.kasbon.insert_many([dict(x) for x in KASBON])
    return db


def new_cashflow(db, date_filter):
    p = sl.build_cashflow_pipelines(date_filter)
    return sl.assemble_cashflow_summary(
        list(db.cashflow.aggregate(p['cashflow'])),
        list(db.print_jobs.aggregate(p['print_jobs'])),
        list(db.projects.aggregate(p['projects'])),
        list(db.kasbon.aggregate(p['kasbon'])),
    )


def new_print(db, date_filter):
    return sl.assemble_print_jobs_summary(
        list(db.print_jobs.aggregate(sl.build_print_jobs_totals_pipeline(date_filter))),
        list(db.print_jobs.aggregate(sl.build_print_jobs_by_material_pipeline(date_filter))),
    )


def _by_mat_map(rows):
    return {r['material']: (r['total_qty'], r['total_revenue']) for r in rows}


class _Base(unittest.TestCase):
    def assertSummaryEqual(self, old, new, label=''):
        self.assertEqual(set(old), set(new), f'{label} key respons berbeda')
        for k in old:
            if k == 'by_material':
                continue
            self.assertAlmostEqual(old[k], new[k], places=6, msg=f'{label} key={k} old={old[k]} new={new[k]}')


# ─────────────────────────────────────────────────────────────────────────────
# 1) Validasi periode (murni, tanpa database)
# ─────────────────────────────────────────────────────────────────────────────
class TestPeriod(unittest.TestCase):
    def test_month_valid(self):
        self.assertEqual(sl.resolve_date_filter(month='2026-10'), {'$regex': '^2026-10'})

    def test_month_invalid(self):
        for bad in ['2026-13', '2026-00', '2026-1', '26-10', 'abc', '', '2026-10-01', '.*', '2026-10|', ' 2026-10']:
            with self.subTest(month=bad):
                with self.assertRaises(sl.PeriodError):
                    sl.resolve_date_filter(month=bad)

    def test_start_without_end_or_reverse(self):
        with self.assertRaises(sl.PeriodError):
            sl.resolve_date_filter(start='2026-10-01')
        with self.assertRaises(sl.PeriodError):
            sl.resolve_date_filter(end='2026-10-31')
        with self.assertRaises(sl.PeriodError):
            sl.resolve_date_filter(start='2026-10-01', end='')

    def test_month_and_range_conflict(self):
        with self.assertRaises(sl.PeriodError):
            sl.resolve_date_filter(month='2026-10', start='2026-10-01', end='2026-10-31')
        with self.assertRaises(sl.PeriodError):
            sl.resolve_date_filter(month='2026-10', start='2026-10-01')

    def test_range_limit_180_days_is_exact_and_not_shifted(self):
        ok = sl.resolve_date_filter(start='2026-01-01', end='2026-06-30')   # 180 hari
        self.assertEqual(ok, {'$gte': '2026-01-01', '$lte': '2026-06-30\uffff'})
        with self.assertRaises(sl.PeriodError):
            sl.resolve_date_filter(start='2026-01-01', end='2026-07-01')    # 181 hari -> ditolak, tidak dipotong

    def test_range_invalid_values(self):
        cases = [('2026-10-31', '2026-10-01'), ('2026-02-30', '2026-03-01'), ('2026-1-5', '2026-10-01'),
                 ('2026-10-01', '2026-13-01'), ('x', 'y')]
        for s, e in cases:
            with self.subTest(start=s, end=e):
                with self.assertRaises(sl.PeriodError):
                    sl.resolve_date_filter(start=s, end=e)

    def test_range_not_allowed_for_cashflow(self):
        with self.assertRaises(sl.PeriodError):
            sl.resolve_date_filter(start='2026-10-01', end='2026-10-31', allow_range=False)

    def test_default_is_current_month_in_wib(self):
        # 30 Sep 2026 17:30 UTC = 1 Okt 2026 00:30 WIB
        now = datetime(2026, 9, 30, 17, 30, tzinfo=timezone.utc)
        self.assertEqual(sl.resolve_date_filter(now=now), {'$regex': '^2026-10'})
        now = datetime(2026, 10, 15, 3, 0, tzinfo=timezone.utc)
        self.assertEqual(sl.resolve_date_filter(now=now), {'$regex': '^2026-10'})

    def test_module_is_side_effect_free(self):
        self.assertNotIn('motor', sys.modules, 'test tidak boleh memuat driver database asli')


# ─────────────────────────────────────────────────────────────────────────────
# 2) Cashflow summary vs rumus lama (K1, K2, K3)
# ─────────────────────────────────────────────────────────────────────────────
@unittest.skipIf(mongomock is None, 'mongomock tidak terpasang (pip install mongomock) -- test TIDAK dijalankan')
class TestCashflowSummary(_Base):
    def _old(self, flt, print_docs=None):
        pj = PRINT_OLD + PRINT_NEW if print_docs is None else print_docs
        f = lambda docs: [x for x in docs if in_period(x, flt)]
        return old_cashflow_summary(f(CASHFLOW), f(pj), f(PROJECTS), f(KASBON))

    def test_month_identical_to_old_formula(self):
        flt = sl.resolve_date_filter(month=M)
        new = new_cashflow(_fresh_db(), flt)
        self.assertSummaryEqual(self._old(flt), new, 'cashflow/month')
        self.assertEqual(set(new), CASHFLOW_KEYS)
        for k, v in new.items():
            self.assertIsInstance(v, float, k)

    def test_k1_nonstandard_method_not_counted_as_cash(self):
        flt = sl.resolve_date_filter(month=M)
        new = new_cashflow(_fresh_db(), flt)
        # 'qris': print 20000, project 1000, kasbon 5000 tidak boleh masuk cash maupun transfer
        old = self._old(flt)
        self.assertAlmostEqual(new['print_job_cash'], old['print_job_cash'])
        self.assertAlmostEqual(new['project_cash'], old['project_cash'])
        self.assertAlmostEqual(new['kasbon_cash'], old['kasbon_cash'])

    def test_k2_empty_string_method_is_cash(self):
        flt = sl.resolve_date_filter(month=M)
        new = new_cashflow(_fresh_db(), flt)
        old = self._old(flt)
        self.assertAlmostEqual(new['manual_balance'], old['manual_balance'])

    def test_k3_zero_selling_price_falls_back_to_project_value(self):
        db = mongomock.MongoClient()['t']
        db.print_jobs.insert_one({'total_price': 0, 'date': d(1)})
        db.projects.insert_many([
            {'selling_price': 0, 'total_project_value': 300000, 'payment_method': 'transfer', 'date': d(1)},
            {'selling_price': None, 'total_project_value': 200000, 'payment_method': 'cash', 'date': d(2)},
            {'selling_price': 5, 'total_project_value': 9, 'payment_method': 'cash', 'date': d(3)},
            {'selling_price': 0, 'total_project_value': 0, 'payment_method': 'cash', 'date': d(4)},
        ])
        res = new_cashflow(db, sl.resolve_date_filter(month=M))
        self.assertEqual(res['project_transfer'], 300000.0)
        self.assertEqual(res['project_cash'], 200005.0)

    def test_kasbon_transfer_not_in_total_expense_and_salary_ignored(self):
        flt = sl.resolve_date_filter(month=M)
        new = new_cashflow(_fresh_db(), flt)
        self.assertAlmostEqual(new['total_expense'], new['manual_expense'] + new['kasbon_cash'])
        self.assertAlmostEqual(new['total_kasbon'], new['kasbon_cash'] + new['kasbon_transfer'])
        self.assertAlmostEqual(new['manual_expense'], 30000 + 12000 + 9000 + 4000)  # tanpa 'salary'

    def test_empty_month(self):
        flt = sl.resolve_date_filter(month='2000-01')
        new = new_cashflow(_fresh_db(), flt)
        self.assertSummaryEqual(self._old(flt), new, 'cashflow/empty')
        self.assertTrue(all(v == 0.0 for v in new.values()))

    def test_filter_only_processes_requested_month(self):
        db = _fresh_db()
        rows = list(db.cashflow.aggregate(sl.build_cashflow_pipelines(sl.resolve_date_filter(month=M))['cashflow']))
        self.assertLess(rows[0]['income'], 777777)  # dokumen 2026-09 / 2025-10 tidak ikut


# ─────────────────────────────────────────────────────────────────────────────
# 3) Print jobs summary: format lama, materials[], tanpa duplikasi
# ─────────────────────────────────────────────────────────────────────────────
@unittest.skipIf(mongomock is None, 'mongomock tidak terpasang (pip install mongomock) -- test TIDAK dijalankan')
class TestPrintJobsSummary(_Base):
    def test_old_format_identical_to_old_including_by_material(self):
        db = _fresh_db(PRINT_OLD)
        flt = sl.resolve_date_filter(month=M)
        old = old_print_jobs_summary([x for x in PRINT_OLD if in_period(x, flt)])
        new = new_print(db, flt)
        self.assertSummaryEqual(old, new, 'print/old-format')
        self.assertEqual(set(new), PRINT_KEYS)
        self.assertIsInstance(new['total_jobs'], int)
        om, nm = _by_mat_map(old['by_material']), _by_mat_map(new['by_material'])
        self.assertEqual(set(om), set(nm))
        for k in om:
            self.assertAlmostEqual(om[k][0], nm[k][0], msg=f'qty {k}')
            self.assertAlmostEqual(om[k][1], nm[k][1], msg=f'rev {k}')
        self.assertIn('unknown', nm)  # material kosong/hilang -> 'unknown' seperti kode lama

    def test_materials_array_totals_not_duplicated(self):
        db = _fresh_db(PRINT_NEW)
        flt = sl.resolve_date_filter(month=M)
        new = new_print(db, flt)
        self.assertEqual(new['total_jobs'], 2)                     # bukan 4 (jumlah elemen materials)
        self.assertAlmostEqual(new['total_revenue'], 61000.0)      # 50000 + 11000, bukan digandakan
        self.assertAlmostEqual(new['cash_revenue'], 50000.0)
        self.assertAlmostEqual(new['transfer_revenue'], 11000.0)
        old_totals = old_print_jobs_summary(PRINT_NEW)             # total root tidak bergantung materials[]
        self.assertSummaryEqual(old_totals, new, 'print/new-format-totals')

    def test_materials_array_by_material_values(self):
        new = new_print(_fresh_db(PRINT_NEW), sl.resolve_date_filter(month=M))
        m = _by_mat_map(new['by_material'])
        self.assertEqual(m['A'], (3.0, 2 * 10000 + 1 * 9000))      # price_per_unit dipakai (diskon)
        self.assertEqual(m['B'], (1.0, 30000.0))
        self.assertEqual(m['unknown'], (2.0, 2 * 1000.0))          # nama kosong -> unknown, fallback harga_normal
        self.assertAlmostEqual(sum(v[1] for v in m.values()), new['total_revenue'] - 0.0)

    def test_mixed_old_and_new_format(self):
        flt = sl.resolve_date_filter(month=M)
        docs = PRINT_OLD + PRINT_NEW
        new = new_print(_fresh_db(), flt)
        in_scope = [x for x in docs if in_period(x, flt)]
        self.assertEqual(new['total_jobs'], len(in_scope))
        self.assertAlmostEqual(new['total_revenue'], old_print_jobs_summary(in_scope)['total_revenue'])
        m = _by_mat_map(new['by_material'])
        self.assertEqual(m['A'][0], 3.0)
        self.assertEqual(m['Flexi'][0], 2 + 3 + 1)                 # format lama tetap terbaca

    def test_empty_month(self):
        new = new_print(_fresh_db(), sl.resolve_date_filter(month='2000-01'))
        self.assertEqual(new, {'total_revenue': 0.0, 'cash_revenue': 0.0, 'transfer_revenue': 0.0,
                               'total_jobs': 0, 'by_material': []})

    def test_range_filter_inclusive_end_date_and_timestamp_suffix(self):
        db = _fresh_db(PRINT_OLD)
        flt = sl.resolve_date_filter(start=d(8), end=d(8))        # hanya tgl 8 (dokumen bersufiks timestamp)
        new = new_print(db, flt)
        self.assertEqual(new['total_jobs'], 1)
        flt2 = sl.resolve_date_filter(start=d(1), end=d(31))
        self.assertEqual(new_print(db, flt2)['total_jobs'],
                         new_print(db, sl.resolve_date_filter(month=M))['total_jobs'])


@unittest.skipIf(mongomock is None, 'mongomock tidak terpasang (pip install mongomock) -- test TIDAK dijalankan')
class TestSummaryMatchesListPeriod(_Base):
    """Kartu ringkasan (web) harus memakai periode yang sama dengan daftar pekerjaan.
    Daftar memakai filter {'date': {'$regex': '^YYYY-MM'}} (server.py: get_print_jobs);
    resolve_date_filter(month=...) harus menghasilkan filter yang sama persis."""

    MONTHS = [M, '2026-09', '2026-11', '2000-01']

    def test_filter_identical_to_list_endpoint_filter(self):
        for m in self.MONTHS:
            with self.subTest(month=m):
                self.assertEqual(sl.resolve_date_filter(month=m), {'$regex': f'^{m}'})

    def test_total_jobs_and_revenue_match_list_for_same_month(self):
        db = _fresh_db()
        for m in self.MONTHS:
            with self.subTest(month=m):
                list_docs = list(db.print_jobs.find({'date': {'$regex': f'^{m}'}}))  # = daftar pekerjaan
                summary = new_print(db, sl.resolve_date_filter(month=m))
                self.assertEqual(summary['total_jobs'], len(list_docs))
                self.assertAlmostEqual(
                    summary['total_revenue'],
                    sum(float(x.get('total_price') or 0) for x in list_docs), places=6)

    def test_months_do_not_leak_into_each_other(self):
        db = _fresh_db()
        nov = new_print(db, sl.resolve_date_filter(month='2026-11'))
        octo = new_print(db, sl.resolve_date_filter(month='2026-10'))
        self.assertEqual(nov['total_jobs'], 1)
        self.assertAlmostEqual(nov['total_revenue'], 999999.0)
        self.assertNotAlmostEqual(octo['total_revenue'], nov['total_revenue'])

    def test_invalid_month_is_rejected_not_defaulted(self):
        for bad in ['2026-13', 'abc', '']:
            with self.subTest(month=bad):
                with self.assertRaises(sl.PeriodError):
                    sl.resolve_date_filter(month=bad)


if __name__ == '__main__':
    unittest.main(verbosity=2)
