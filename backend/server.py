from fastapi import FastAPI, APIRouter, HTTPException, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone
import os, uuid, bcrypt, asyncio

# ── Setup ────────────────────────────────────────────────────────────────────
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title='Labalaba Advertising API')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=False,
    allow_methods=['*'],
    allow_headers=['*'],
)
api = APIRouter(prefix='/api')

# ── Helpers ──────────────────────────────────────────────────────────────────
def now_str(): return datetime.now(timezone.utc).isoformat()
def new_id(): return str(uuid.uuid4())
def clean(doc):
    doc.pop('_id', None)
    return doc

# ── Schemas ──────────────────────────────────────────────────────────────────
class EmployeeCreate(BaseModel):
    name: str
    whatsapp: str
    pin: str
    birthdate: str
    birthplace: Optional[str] = ''
    position: str
    status_crew: str
    monthly_salary: Optional[float] = 0
    work_hours_per_day: Optional[float] = 8

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    whatsapp: Optional[str] = None
    pin: Optional[str] = None
    birthdate: Optional[str] = None
    birthplace: Optional[str] = None
    position: Optional[str] = None
    status_crew: Optional[str] = None
    status: Optional[str] = None
    monthly_salary: Optional[float] = None
    work_hours_per_day: Optional[float] = None

class StockCreate(BaseModel):
    name: str
    quantity: float
    unit: str
    price: float = 0
    notes: str = ''
    usage_category: str = 'PRINT'

class StockUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    notes: Optional[str] = None
    usage_category: Optional[str] = None

class PrintJobCreate(BaseModel):
    date: str
    material: str
    payment_method: str = 'cash'
    quantity: float
    harga_normal: float
    harga_diskon: Optional[float] = None
    customer_name: Optional[str] = ''
    notes: Optional[str] = ''
    cashier: Optional[str] = ''
    cashier_id: Optional[str] = ''

class ProjectMaterialIn(BaseModel):
    name: str
    quantity: float = 0
    unit: str = 'pcs'
    price: float = 0
    stock_id: Optional[str] = None
    is_custom: bool = False

class ProjectCreate(BaseModel):
    date: str
    project_name: str
    customer_name: Optional[str] = ''
    payment_method: str = 'cash'
    selling_price: float = 0
    notes: Optional[str] = ''
    materials: List[ProjectMaterialIn] = []

class ProjectUpdate(BaseModel):
    date: Optional[str] = None
    project_name: Optional[str] = None
    customer_name: Optional[str] = None
    payment_method: Optional[str] = None
    selling_price: Optional[float] = None
    notes: Optional[str] = None
    materials: Optional[List[ProjectMaterialIn]] = None

class CashflowCreate(BaseModel):
    type: str
    date: str
    amount: float
    description: str
    notes: Optional[str] = ''
    payment_method: Optional[str] = 'cash'
    handled_by: Optional[str] = ''
    employee_id: Optional[str] = ''

class CashflowUpdate(BaseModel):
    date: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    notes: Optional[str] = None

class KasbonCreate(BaseModel):
    employee_id: str
    amount: float
    payment_method: Optional[str] = 'cash'
    notes: Optional[str] = ''

class JobCreate(BaseModel):
    customer_name: str
    job_name: str
    total_price: float = 0
    dp_amount: float = 0
    date: Optional[str] = None
    notes: Optional[str] = ''

class JobUpdate(BaseModel):
    customer_name: Optional[str] = None
    job_name: Optional[str] = None
    total_price: Optional[float] = None
    dp_amount: Optional[float] = None
    date: Optional[str] = None
    notes: Optional[str] = None
    progress_status: Optional[str] = None

class AdminLogin(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    pin: Optional[str] = None

class IdentifyByPin(BaseModel):
    pin: str

class ResetPinByBirthdate(BaseModel):
    employee_id: str
    birthdate: str
    new_pin: str

# ── Auth ────────────────────────────────────────────────────────────────────
@api.post('/auth/admin-login')
async def admin_login(body: AdminLogin):
    cfg = await db.config.find_one({'key': 'admin'})
    if body.username and body.password:
        if body.username == 'admin' and body.password in ('admin', 'admin123'):
            return {'success': True, 'role': 'admin'}
        raise HTTPException(status_code=401, detail='Username atau password salah')
    if body.pin:
        if cfg and cfg.get('pin_hash'):
            if bcrypt.checkpw(body.pin.encode(), cfg['pin_hash'].encode()):
                return {'success': True, 'role': 'admin'}
        elif body.pin == '123456':
            return {'success': True, 'role': 'admin'}
        raise HTTPException(status_code=401, detail='PIN admin salah')
    raise HTTPException(status_code=400, detail='Berikan username+password atau pin')

@api.post('/auth/admin-pin/setup')
async def setup_admin_pin(body: dict):
    new_pin = body.get('new_pin', '')
    if len(new_pin) < 4:
        raise HTTPException(status_code=400, detail='PIN minimal 4 digit')
    pin_hash = bcrypt.hashpw(new_pin.encode(), bcrypt.gensalt()).decode()
    await db.config.update_one({'key': 'admin'}, {'$set': {'pin_hash': pin_hash}}, upsert=True)
    return {'success': True}

@api.post('/auth/admin-pin/change')
async def change_admin_pin(body: dict):
    old_pin = body.get('old_pin', '')
    new_pin = body.get('new_pin', '')
    cfg = await db.config.find_one({'key': 'admin'})
    if cfg and cfg.get('pin_hash'):
        if not bcrypt.checkpw(old_pin.encode(), cfg['pin_hash'].encode()):
            raise HTTPException(status_code=401, detail='PIN lama salah')
    elif old_pin != '123456':
        raise HTTPException(status_code=401, detail='PIN lama salah')
    pin_hash = bcrypt.hashpw(new_pin.encode(), bcrypt.gensalt()).decode()
    await db.config.update_one({'key': 'admin'}, {'$set': {'pin_hash': pin_hash}}, upsert=True)
    return {'success': True}

@api.post('/auth/employee-login')
async def employee_login(body: dict):
    employee_id = body.get('employee_id', '')
    pin = body.get('pin', '')
    if not employee_id or not pin:
        raise HTTPException(status_code=400, detail='employee_id dan pin wajib diisi')
    emp = await db.employees.find_one({'id': employee_id})
    if not emp:
        raise HTTPException(status_code=404, detail='Karyawan tidak ditemukan')
    if not emp.get('pin_hash'):
        raise HTTPException(status_code=401, detail='PIN belum diset, hubungi admin')
    if not bcrypt.checkpw(pin.encode(), emp['pin_hash'].encode()):
        raise HTTPException(status_code=401, detail='PIN salah')
    return {'success': True, 'employee': {k: v for k, v in emp.items() if k not in ('_id', 'pin_hash')}}

@api.post('/auth/identify-by-pin')
async def identify_by_pin(body: IdentifyByPin):
    employees = await db.employees.find({}, {'_id': 0}).to_list(None)
    for emp in employees:
        if emp.get('pin_hash') and bcrypt.checkpw(body.pin.encode(), emp['pin_hash'].encode()):
            return {'success': True, 'employee': {k: v for k, v in emp.items() if k != 'pin_hash'}}
    raise HTTPException(status_code=404, detail='PIN tidak ditemukan')

@api.post('/auth/verify-birthdate')
async def verify_birthdate(body: dict):
    employee_id = body.get('employee_id', '')
    birthdate = body.get('birthdate', '')
    emp = await db.employees.find_one({'id': employee_id})
    if not emp:
        raise HTTPException(status_code=404, detail='Karyawan tidak ditemukan')
    if emp.get('birthdate', '').replace('-', '') != birthdate.replace('-', ''):
        raise HTTPException(status_code=401, detail='Tanggal lahir tidak sesuai')
    return {'success': True}

@api.post('/auth/reset-pin-by-birthdate')
async def reset_pin_by_birthdate(body: ResetPinByBirthdate):
    emp = await db.employees.find_one({'id': body.employee_id})
    if not emp:
        raise HTTPException(status_code=404, detail='Karyawan tidak ditemukan')
    if emp.get('birthdate', '').replace('-', '') != body.birthdate.replace('-', ''):
        raise HTTPException(status_code=401, detail='Tanggal lahir tidak sesuai')
    pin_hash = bcrypt.hashpw(body.new_pin.encode(), bcrypt.gensalt()).decode()
    await db.employees.update_one({'id': body.employee_id}, {'$set': {'pin_hash': pin_hash}})
    return {'success': True}

# ── Employees ────────────────────────────────────────────────────────────────
@api.get('/employees')
async def get_employees():
    return await db.employees.find({}, {'_id': 0, 'pin_hash': 0}).to_list(None)

@api.get('/employees/{emp_id}')
async def get_employee(emp_id: str):
    doc = await db.employees.find_one({'id': emp_id}, {'_id': 0, 'pin_hash': 0})
    if not doc: raise HTTPException(status_code=404, detail='Karyawan tidak ditemukan')
    return doc

@api.post('/employees')
async def create_employee(body: EmployeeCreate):
    pin_hash = bcrypt.hashpw(body.pin.encode(), bcrypt.gensalt()).decode()
    doc = {'id': new_id(), 'name': body.name, 'whatsapp': body.whatsapp,
           'pin_hash': pin_hash, 'birthdate': body.birthdate, 'birthplace': body.birthplace or '',
           'position': body.position, 'status_crew': body.status_crew,
           'monthly_salary': body.monthly_salary or 0, 'work_hours_per_day': body.work_hours_per_day or 8,
           'status': 'active', 'created_at': now_str()}
    await db.employees.insert_one(doc)
    return {k: v for k, v in clean(doc).items() if k != 'pin_hash'}

@api.put('/employees/{emp_id}')
async def update_employee(emp_id: str, body: EmployeeUpdate):
    if not await db.employees.find_one({'id': emp_id}):
        raise HTTPException(status_code=404, detail='Karyawan tidak ditemukan')
    update = body.model_dump(exclude_none=True)
    if 'pin' in update:
        update['pin_hash'] = bcrypt.hashpw(update.pop('pin').encode(), bcrypt.gensalt()).decode()
    await db.employees.update_one({'id': emp_id}, {'$set': update})
    return await db.employees.find_one({'id': emp_id}, {'_id': 0, 'pin_hash': 0})

@api.delete('/employees/{emp_id}')
async def delete_employee(emp_id: str):
    result = await db.employees.delete_one({'id': emp_id})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail='Karyawan tidak ditemukan')
    return {'message': 'Karyawan dihapus'}

# ── Stock ────────────────────────────────────────────────────────────────────
@api.get('/stock')
async def get_stock():
    return await db.stock.find({}, {'_id': 0}).to_list(None)

@api.get('/stock/{stock_id}')
async def get_stock_item(stock_id: str):
    doc = await db.stock.find_one({'id': stock_id}, {'_id': 0})
    if not doc: raise HTTPException(status_code=404, detail='Stok tidak ditemukan')
    return doc

@api.post('/stock')
async def create_stock(body: StockCreate):
    doc = {'id': new_id(), 'name': body.name, 'quantity': body.quantity,
           'unit': body.unit, 'price': body.price, 'notes': body.notes,
           'usage_category': body.usage_category.upper(), 'created_at': now_str()}
    await db.stock.insert_one(doc)
    return clean(doc)

@api.put('/stock/{stock_id}')
async def update_stock(stock_id: str, body: StockUpdate):
    if not await db.stock.find_one({'id': stock_id}):
        raise HTTPException(status_code=404, detail='Stok tidak ditemukan')
    update = body.model_dump(exclude_none=True)
    if 'usage_category' in update:
        update['usage_category'] = update['usage_category'].upper()
    await db.stock.update_one({'id': stock_id}, {'$set': update})
    return await db.stock.find_one({'id': stock_id}, {'_id': 0})

@api.delete('/stock/{stock_id}')
async def delete_stock(stock_id: str):
    result = await db.stock.delete_one({'id': stock_id})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail='Stok tidak ditemukan')
    return {'message': 'Stok dihapus'}

# ── Print Jobs ───────────────────────────────────────────────────────────────
@api.get('/print-jobs/summary')
async def get_print_jobs_summary():
    jobs = await db.print_jobs.find({}, {'_id': 0}).to_list(None)
    total = cash = transfer = 0.0
    by_mat: Dict[str, Dict] = {}
    for j in jobs:
        amt = float(j.get('total_price') or 0)
        total += amt
        method = str(j.get('payment_method') or 'cash').lower()
        if method == 'transfer': transfer += amt
        else: cash += amt
        mat = str(j.get('material') or 'unknown')
        e = by_mat.setdefault(mat, {'total_qty': 0.0, 'total_revenue': 0.0})
        e['total_qty'] += float(j.get('quantity') or 0)
        e['total_revenue'] += amt
    return {'total_revenue': total, 'cash_revenue': cash, 'transfer_revenue': transfer,
            'total_jobs': len(jobs), 'by_material': [{'material': m, **e} for m, e in by_mat.items()]}

@api.get('/print-jobs')
async def get_print_jobs(month: Optional[str] = None):
    query = {'date': {'$regex': f'^{month}'}} if month else {}
    docs = await db.print_jobs.find(query, {'_id': 0}).sort('date', -1).to_list(None)
    result = []
    for d in docs:
        result.append({
            'id': str(d.get('id') or ''),
            'date': str(d.get('date') or ''),
            'material': str(d.get('material') or ''),
            'payment_method': str(d.get('payment_method') or 'cash'),
            'quantity': float(d.get('quantity') or 0),
            'harga_normal': float(d.get('harga_normal') or d.get('price') or d.get('price_per_unit') or 0),
            'harga_diskon': d.get('harga_diskon'),
            'dapat_diskon': bool(d.get('dapat_diskon') or False),
            'diskon_nominal': float(d.get('diskon_nominal') or 0),
            'price_per_unit': float(d.get('price_per_unit') or d.get('price') or 0),
            'total_price': float(d.get('total_price') or d.get('price') or 0),
            'customer_name': str(d.get('customer_name') or ''),
            'notes': str(d.get('notes') or ''),
            'created_at': str(d.get('created_at') or ''),
        })
    return result

@api.get('/print-jobs/{job_id}')
async def get_print_job(job_id: str):
    doc = await db.print_jobs.find_one({'id': job_id}, {'_id': 0})
    if not doc: raise HTTPException(status_code=404, detail='Print job tidak ditemukan')
    return doc

@api.post('/print-jobs')
async def create_print_job(body: PrintJobCreate):
    qty = body.quantity
    hn = body.harga_normal
    hd = body.harga_diskon
    dapat_diskon = hd is not None and hd > 0 and hd < hn and qty >= 10
    doc = {'id': new_id(), 'date': body.date, 'material': body.material,
           'payment_method': body.payment_method, 'quantity': qty,
           'harga_normal': hn, 'harga_diskon': hd, 'dapat_diskon': dapat_diskon,
           'diskon_nominal': (hd * qty) if dapat_diskon else 0,
           'price_per_unit': hd if dapat_diskon else hn,
           'total_price': (hd * qty) if dapat_diskon else (hn * qty),
           'customer_name': body.customer_name or '', 'notes': body.notes or '',
           'cashier': body.cashier or '', 'cashier_id': body.cashier_id or '',
           'created_at': now_str()}
    await db.print_jobs.insert_one(doc)
    return clean(doc)

@api.put('/print-jobs/{job_id}')
async def update_print_job(job_id: str, request: Request):
    if not await db.print_jobs.find_one({'id': job_id}):
        raise HTTPException(status_code=404, detail='Print job tidak ditemukan')
    payload = await request.json()
    payload.pop('id', None); payload.pop('_id', None)
    await db.print_jobs.update_one({'id': job_id}, {'$set': payload})
    return await db.print_jobs.find_one({'id': job_id}, {'_id': 0})

@api.delete('/print-jobs/{job_id}')
async def delete_print_job(job_id: str):
    job = await db.print_jobs.find_one({'id': job_id})
    if not job: raise HTTPException(status_code=404, detail='Print job tidak ditemukan')
    stock = await db.stock.find_one({'name': job.get('material'), 'usage_category': 'PRINT'})
    if stock:
        await db.stock.update_one({'id': stock['id']}, {'$inc': {'quantity': job.get('quantity', 0)}})
    await db.print_jobs.delete_one({'id': job_id})
    return {'message': 'Print job dihapus'}

# ── Projects ─────────────────────────────────────────────────────────────────
@api.get('/projects/summary')
async def get_projects_summary():
    docs = await db.projects.find({}, {'_id': 0}).to_list(None)
    total = sum(float(d.get('selling_price') or 0) for d in docs)
    return {'total_revenue': total, 'total_projects': len(docs)}

@api.get('/projects')
async def get_projects(month: Optional[str] = None):
    query = {'date': {'$regex': f'^{month}'}} if month else {}
    return await db.projects.find(query, {'_id': 0}).sort('date', -1).to_list(None)

@api.get('/projects/{project_id}')
async def get_project(project_id: str):
    doc = await db.projects.find_one({'id': project_id}, {'_id': 0})
    if not doc: raise HTTPException(status_code=404, detail='Project tidak ditemukan')
    return doc

@api.post('/projects')
async def create_project(body: ProjectCreate):
    mats = [m.model_dump() for m in body.materials]
    hpp = sum(m['price'] * m['quantity'] for m in mats)
    for m in body.materials:
        if m.stock_id:
            await db.stock.update_one({'id': m.stock_id}, {'$inc': {'quantity': -m.quantity}})
    doc = {'id': new_id(), 'date': body.date, 'project_name': body.project_name,
           'customer_name': body.customer_name or '', 'payment_method': body.payment_method,
           'selling_price': body.selling_price, 'hpp': hpp,
           'profit': body.selling_price - hpp, 'notes': body.notes or '',
           'materials': mats, 'created_at': now_str()}
    await db.projects.insert_one(doc)
    return clean(doc)

@api.put('/projects/{project_id}')
async def update_project(project_id: str, body: ProjectUpdate):
    existing = await db.projects.find_one({'id': project_id})
    if not existing: raise HTTPException(status_code=404, detail='Project tidak ditemukan')
    update = body.model_dump(exclude_none=True)
    if 'materials' in update:
        hpp = sum(m.get('price', 0) * m.get('quantity', 0) for m in update['materials'])
        update['hpp'] = hpp
        update['profit'] = update.get('selling_price', existing.get('selling_price', 0)) - hpp
    await db.projects.update_one({'id': project_id}, {'$set': update})
    return await db.projects.find_one({'id': project_id}, {'_id': 0})

@api.delete('/projects/{project_id}')
async def delete_project(project_id: str):
    result = await db.projects.delete_one({'id': project_id})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail='Project tidak ditemukan')
    return {'message': 'Project dihapus'}

# ── Cashflow ─────────────────────────────────────────────────────────────────
@api.get('/cashflow/summary')
async def get_cashflow_summary():
    cashflow_docs, print_jobs, projects, kasbon_docs = await asyncio.gather(
        db.cashflow.find({}, {'_id': 0}).to_list(None),
        db.print_jobs.find({}, {'_id': 0}).to_list(None),
        db.projects.find({}, {'_id': 0}).to_list(None),
        db.kasbon.find({}, {'_id': 0}).to_list(None),
    )
    manual_income = sum(float(d.get('amount') or 0) for d in cashflow_docs if d.get('category') == 'income')
    manual_expense = sum(float(d.get('amount') or 0) for d in cashflow_docs if d.get('category') == 'expense')
    print_cash = sum(float(j.get('total_price') or 0) for j in print_jobs if str(j.get('payment_method') or 'cash').lower() == 'cash')
    print_transfer = sum(float(j.get('total_price') or 0) for j in print_jobs if str(j.get('payment_method') or '').lower() == 'transfer')
    project_cash = sum(float(p.get('selling_price') or p.get('total_project_value') or 0) for p in projects if str(p.get('payment_method') or 'cash').lower() == 'cash')
    project_transfer = sum(float(p.get('selling_price') or p.get('total_project_value') or 0) for p in projects if str(p.get('payment_method') or '').lower() == 'transfer')
    total_kasbon = sum(float(k.get('amount') or 0) for k in kasbon_docs)
    total_income = manual_income + print_cash + print_transfer + project_cash + project_transfer
    total_expense = manual_expense + total_kasbon
    return {
        'total_income': total_income,
        'total_expense': total_expense,
        'balance': total_income - total_expense,
        'manual_income': manual_income,
        'manual_expense': manual_expense,
        'print_job_cash': print_cash,
        'print_job_transfer': print_transfer,
        'print_job_total': print_cash + print_transfer,
        'project_cash': project_cash,
        'project_transfer': project_transfer,
        'project_total': project_cash + project_transfer,
        'total_kasbon': total_kasbon,
    }

@api.get('/cashflow')
async def get_cashflow(month: Optional[str] = None):
    query = {'date': {'$regex': f'^{month}'}} if month else {}
    return await db.cashflow.find(query, {'_id': 0}).sort('date', -1).to_list(None)

@api.get('/cashflow/{cf_id}')
async def get_cashflow_item(cf_id: str):
    doc = await db.cashflow.find_one({'id': cf_id}, {'_id': 0})
    if not doc: raise HTTPException(status_code=404, detail='Cashflow tidak ditemukan')
    return doc

@api.post('/cashflow')
async def create_cashflow(body: CashflowCreate):
    doc = {'id': new_id(), 'type': body.type, 'date': body.date,
           'amount': body.amount, 'description': body.description,
           'notes': body.notes or '', 'payment_method': body.payment_method or 'cash',
           'handled_by': body.handled_by or '', 'employee_id': body.employee_id or '',
           'created_at': now_str()}
    await db.cashflow.insert_one(doc)
    return clean(doc)

@api.put('/cashflow/{cf_id}')
async def update_cashflow(cf_id: str, body: CashflowUpdate):
    if not await db.cashflow.find_one({'id': cf_id}):
        raise HTTPException(status_code=404, detail='Cashflow tidak ditemukan')
    update = body.model_dump(exclude_none=True)
    await db.cashflow.update_one({'id': cf_id}, {'$set': update})
    return await db.cashflow.find_one({'id': cf_id}, {'_id': 0})

@api.delete('/cashflow/{cf_id}')
async def delete_cashflow(cf_id: str):
    result = await db.cashflow.delete_one({'id': cf_id})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail='Cashflow tidak ditemukan')
    return {'message': 'Cashflow dihapus'}

# ── Kasbon ───────────────────────────────────────────────────────────────────
@api.get('/kasbon')
async def get_all_kasbon():
    return await db.kasbon.find({}, {'_id': 0}).to_list(None)

@api.get('/kasbon/employee/{emp_id}')
async def get_kasbon_by_employee(emp_id: str, active_only: bool = False):
    query = {'employee_id': emp_id}
    if active_only:
        query['settled'] = {'$ne': True}
    return await db.kasbon.find(query, {'_id': 0}).sort('created_at', -1).to_list(None)

@api.get('/kasbon/employee/{emp_id}/summary')
async def get_kasbon_summary(emp_id: str):
    items = await db.kasbon.find({'employee_id': emp_id, 'settled': {'$ne': True}}, {'_id': 0}).sort('created_at', -1).to_list(None)
    total = sum(float(k.get('amount') or 0) for k in items)
    return {'total': total, 'count': len(items), 'items': items}

@api.post('/kasbon')
async def create_kasbon(body: KasbonCreate):
    emp = await db.employees.find_one({'id': body.employee_id})
    if not emp: raise HTTPException(status_code=404, detail='Karyawan tidak ditemukan')
    doc = {'id': new_id(), 'employee_id': body.employee_id,
           'employee_name': emp.get('name', ''), 'amount': body.amount,
           'payment_method': (body.payment_method or 'cash').lower(),
           'notes': body.notes or '', 'settled': False,
           'date': now_str()[:10], 'created_at': now_str()}
    await db.kasbon.insert_one(doc)
    return clean(doc)

@api.post('/kasbon/settle/{emp_id}')
async def settle_kasbon(emp_id: str):
    result = await db.kasbon.update_many(
        {'employee_id': emp_id, 'settled': {'$ne': True}},
        {'$set': {'settled': True, 'settled_at': now_str()}})
    return {'success': True, 'settled_count': result.modified_count}

@api.put('/kasbon/{kasbon_id}')
async def update_kasbon(kasbon_id: str, body: dict):
    result = await db.kasbon.update_one({'id': kasbon_id}, {'$set': body})
    if result.matched_count == 0: raise HTTPException(status_code=404, detail='Kasbon tidak ditemukan')
    doc = await db.kasbon.find_one({'id': kasbon_id}, {'_id': 0})
    return clean(doc)

@api.delete('/kasbon/{kasbon_id}')
async def delete_kasbon(kasbon_id: str):
    result = await db.kasbon.delete_one({'id': kasbon_id})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail='Kasbon tidak ditemukan')
    return {'message': 'Kasbon dihapus'}

# ── Advances (alias kasbon untuk kompatibilitas frontend lama) ────────────────
@api.post('/advances')
async def create_advance(body: KasbonCreate):
    return await create_kasbon(body)

@api.get('/advances/employee/{emp_id}')
async def get_advances_by_employee(emp_id: str):
    return await get_kasbon_by_employee(emp_id)

@api.get('/advances/all')
async def get_all_advances():
    return await get_all_kasbon()

@api.delete('/advances/{advance_id}')
async def delete_advance(advance_id: str):
    return await delete_kasbon(advance_id)

@api.put('/advances/{advance_id}')
async def update_advance(advance_id: str, body: dict):
    return await update_kasbon(advance_id, body)

# ── Jobs (Pekerjaan) ─────────────────────────────────────────────────────────
def job_payment_status(doc):
    total = float(doc.get('total_price') or 0)
    dp = float(doc.get('dp_amount') or 0)
    return 'lunas' if total > 0 and dp >= total else 'dp'

def job_out(doc):
    doc = clean(doc)
    doc['payment_status'] = job_payment_status(doc)
    return doc

@api.get('/jobs')
async def get_jobs(status: Optional[str] = None):
    query = {}
    if status:
        query['progress_status'] = status
    docs = await db.jobs.find(query, {'_id': 0}).sort('created_at', -1).to_list(None)
    return [job_out(d) for d in docs]

@api.post('/jobs')
async def create_job(body: JobCreate):
    doc = {'id': new_id(), 'customer_name': body.customer_name, 'job_name': body.job_name,
           'total_price': body.total_price or 0, 'dp_amount': body.dp_amount or 0,
           'date': body.date or now_str()[:10], 'notes': body.notes or '',
           'progress_status': 'proses', 'created_at': now_str()}
    await db.jobs.insert_one(doc)
    return job_out(doc)

@api.put('/jobs/{job_id}')
async def update_job(job_id: str, body: JobUpdate):
    if not await db.jobs.find_one({'id': job_id}):
        raise HTTPException(status_code=404, detail='Pekerjaan tidak ditemukan')
    update = body.model_dump(exclude_none=True)
    await db.jobs.update_one({'id': job_id}, {'$set': update})
    doc = await db.jobs.find_one({'id': job_id}, {'_id': 0})
    return job_out(doc)

@api.post('/jobs/{job_id}/done')
async def mark_job_done(job_id: str):
    result = await db.jobs.update_one({'id': job_id}, {'$set': {'progress_status': 'selesai', 'completed_at': now_str()}})
    if result.matched_count == 0: raise HTTPException(status_code=404, detail='Pekerjaan tidak ditemukan')
    doc = await db.jobs.find_one({'id': job_id}, {'_id': 0})
    return job_out(doc)

@api.delete('/jobs/{job_id}')
async def delete_job(job_id: str):
    result = await db.jobs.delete_one({'id': job_id})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail='Pekerjaan tidak ditemukan')
    return {'message': 'Pekerjaan dihapus'}

app.include_router(api)

@app.get('/')
async def root():
    return {'status': 'ok', 'service': 'Labalaba Advertising API v2'}
