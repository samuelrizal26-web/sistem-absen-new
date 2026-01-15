from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import Any, Dict, List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import base64
from io import BytesIO
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
DEBUG_LOG_PATH = ROOT_DIR.parent / '.cursor' / 'debug.log'

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
@app.get("/")
async def root_health_check():
    return {"status": "ok", "service": "backend absensi"}
api_router = APIRouter(prefix="/api")


def debug_log(hypothesis_id: str, location: str, message: str, data: Optional[Dict[str, Any]] = None) -> None:
    entry = {
        "sessionId": "debug-session",
        "runId": "baseline",
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data or {},
        "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
    }
    try:
        with open(DEBUG_LOG_PATH, "a", encoding="utf-8") as log_file:
            log_file.write(json.dumps(entry) + "\n")
    except Exception:
        pass

# Models
class EmployeeCreate(BaseModel):
    name: str
    whatsapp: str
    pin: str
    birthplace: str
    birthdate: str
    position: str
    status_crew: str
    monthly_salary: float
    work_hours_per_day: float
    status: str = "active"

class Employee(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    whatsapp: str
    pin_hash: str
    photo_url: Optional[str] = None
    birthplace: str
    birthdate: str
    position: str
    status_crew: str
    monthly_salary: float
    work_hours_per_day: float
    status: str
    hourly_rate: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EmployeeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    whatsapp: str
    photo_url: Optional[str] = None
    birthplace: str
    birthdate: str
    position: str
    status_crew: str
    monthly_salary: float
    work_hours_per_day: float
    hourly_rate: float
    status: str
    created_at: str

class AttendanceClockIn(BaseModel):
    employee_id: str

class AttendanceClockOut(BaseModel):
    employee_id: str

class Attendance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    clock_in: datetime
    clock_out: Optional[datetime] = None
    date: str
    session_type: str = Field(default="normal")
    work_duration_minutes: Optional[float] = None
    salary_earned: Optional[float] = None
    deduction_amount: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AttendanceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    employee_id: str
    clock_in: str
    clock_out: Optional[str] = None
    date: str
    session_type: str = Field(default="normal")
    work_duration_minutes: Optional[float] = None
    salary_earned: Optional[float] = None
    deduction_amount: Optional[float] = None

class AdvanceCreate(BaseModel):
    employee_id: str
    amount: float
    notes: Optional[str] = None

class Advance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    employee_id: str
    amount: float
    notes: Optional[str] = None
    date: str
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdvanceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    employee_id: str
    amount: float
    notes: Optional[str] = None
    date: str
    status: str

class LoginRequest(BaseModel):
    employee_id: str
    pin: str

class AdminLogin(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    pin: Optional[str] = None

class AdminPINUpdate(BaseModel):
    old_pin: str
    new_pin: str

class CashflowCreate(BaseModel):
    date: str
    category: str  # income/expense
    amount: float
    description: str
    notes: Optional[str] = None

class Cashflow(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    category: str
    amount: float
    description: str
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CashflowResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    date: str
    category: str
    amount: float
    description: str
    notes: Optional[str] = None

class CashflowSummary(BaseModel):
    total_income: float
    total_expense: float
    balance: float
    total_salary: float
    total_advances: float
    net_after_salary: float

class StockItem(BaseModel):
    name: str
    quantity: float
    unit: str
    price: Optional[float] = 0
    notes: Optional[str] = ""

class StockUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    notes: Optional[str] = None
    usage_category: Optional[str] = None

class StockResponse(BaseModel):
    id: str
    name: str
    quantity: float
    unit: str
    price: float
    notes: str
    created_at: str

class PrintJob(BaseModel):
    date: str
    material: str  # vinyl, kromo, transparan, art carton
    price: float
    quantity: Optional[float] = 1
    customer_name: Optional[str] = ""
    notes: Optional[str] = ""

class PrintJobResponse(BaseModel):
    id: str
    date: str
    material: str
    price: float
    quantity: float
    customer_name: str
    notes: str
    created_at: str
    project_name: Optional[str] = None
    materials: Optional[List[Dict[str, Any]]] = None
    hpp: Optional[float] = 0
    material_name: Optional[str] = None
    stock_synced: Optional[bool] = False
    is_project: Optional[bool] = False


class ProjectMaterial(BaseModel):
    name: str
    quantity: float = 0
    price: float = 0
    material_id: Optional[str] = None
    unit: Optional[str] = None
    is_custom: bool = False


class ProjectEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    project_name: str
    customer_name: Optional[str] = ""
    quantity: float = 1
    hpp: float = 0
    price: float = 0
    notes: Optional[str] = ""
    materials: List[ProjectMaterial] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ProjectCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    date: str
    project_name: str
    customer_name: Optional[str] = ""
    quantity: float = 1
    hpp: float = 0
    price: float = 0
    notes: Optional[str] = ""
    materials: List[ProjectMaterial] = Field(default_factory=list)

# Helper functions
def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_pin(pin: str, hashed: str) -> bool:
    return bcrypt.checkpw(pin.encode('utf-8'), hashed.encode('utf-8'))

LOCAL_TZ_OFFSET = timedelta(hours=7)


def _to_local(utc_dt: datetime) -> datetime:
    return utc_dt + LOCAL_TZ_OFFSET


def _to_utc(local_dt: datetime) -> datetime:
    return local_dt - LOCAL_TZ_OFFSET


async def _finalize_session(attendance_record: Dict[str, Any], clock_out_time: datetime) -> Optional[Dict[str, Any]]:
    if attendance_record.get("clock_out"):
        return None

    employee = await db.employees.find_one({"id": attendance_record["employee_id"]})
    if not employee:
        return None

    session_type = attendance_record.get("session_type", "normal")
    effective_start_iso = attendance_record.get("effective_work_start")
    if effective_start_iso:
        local_start = datetime.fromisoformat(effective_start_iso)
    else:
        clock_in_time = datetime.fromisoformat(attendance_record["clock_in"])
        local_start = _to_local(clock_in_time)

    local_end = _to_local(clock_out_time)
    salary_end_local = local_end

    if session_type == "overtime":
        session_date = datetime.strptime(attendance_record["date"], "%Y-%m-%d")
        cap_local = session_date.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        salary_end_local = min(local_end, cap_local)

    start_utc = _to_utc(local_start)
    end_utc = _to_utc(salary_end_local)
    duration_minutes = max(0, (end_utc - start_utc).total_seconds() / 60)

    hourly_rate = employee.get("hourly_rate", 0) or 0
    minute_rate = hourly_rate / 60 if hourly_rate else 0
    deduction = 0.0
    salary = 0.0
    tolerance_message = None

    if session_type == "normal":
        expected_minutes = employee.get("work_hours_per_day", 0) * 60
        shortage = max(0, expected_minutes - duration_minutes)
        deduction = shortage * minute_rate
        salary = max(0, duration_minutes * minute_rate - deduction)
        tolerance_message = "No tolerance (per-minute deduction)"
    else:
        salary = max(0, duration_minutes * minute_rate)
        tolerance_message = "Overtime session (no tolerance)"

    await db.attendance.update_one(
        {"id": attendance_record["id"]},
        {"$set": {
            "clock_out": clock_out_time.isoformat(),
            "work_duration_minutes": duration_minutes,
            "salary_earned": salary,
            "deduction_amount": deduction,
            "effective_work_start": local_start.isoformat()
        }}
    )

    return {
        "duration_minutes": duration_minutes,
        "salary": salary,
        "deduction": deduction,
        "minute_rate": minute_rate,
        "tolerance_message": tolerance_message,
        "session_type": session_type
    }


async def _close_expired_sessions(employee_id: Optional[str] = None) -> None:
    now_utc = datetime.now(timezone.utc)
    local_now = _to_local(now_utc)
    effective_work_start_local = local_now
    query = {"clock_out": None}
    if employee_id:
        query["employee_id"] = employee_id

    open_sessions = await db.attendance.find(query).to_list(100)
    for record in open_sessions:
        session_type = record.get("session_type", "normal")
        session_date_str = record.get("date")
        if not session_date_str:
            continue
        session_date = datetime.strptime(session_date_str, "%Y-%m-%d")

        if session_type == "normal":
            auto_close_local = session_date.replace(hour=21, minute=0, second=0, microsecond=0)
            if local_now < auto_close_local:
                continue
            target_local = auto_close_local
        else:
            cap_local = session_date.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
            forced_local = cap_local + timedelta(hours=3)
            if local_now >= forced_local:
                target_local = forced_local
            elif local_now >= cap_local:
                target_local = cap_local
            else:
                continue

        target_utc = _to_utc(target_local)
        await _finalize_session(record, target_utc)


def calculate_hourly_rate(monthly_salary: float, work_hours_per_day: float) -> float:
    total_hours = work_hours_per_day * 22
    return monthly_salary / total_hours if total_hours > 0 else 0

# Employee Routes
@api_router.post("/employees", response_model=EmployeeResponse)
async def create_employee(employee: EmployeeCreate):
    existing = await db.employees.find_one({"whatsapp": employee.whatsapp, "status": "active"})
    if existing:
        raise HTTPException(status_code=400, detail="WhatsApp number already exists")
    
    pin_hash = hash_pin(employee.pin)
    hourly_rate = calculate_hourly_rate(employee.monthly_salary, employee.work_hours_per_day)
    
    employee_dict = employee.model_dump()
    employee_dict.pop('pin')
    employee_dict['pin_hash'] = pin_hash
    
    employee_obj = Employee(**employee_dict, hourly_rate=hourly_rate)
    doc = employee_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.employees.insert_one(doc)
    
    return EmployeeResponse(
        id=employee_obj.id,
        name=employee_obj.name,
        whatsapp=employee_obj.whatsapp,
        photo_url=employee_obj.photo_url,
        birthplace=employee_obj.birthplace,
        birthdate=employee_obj.birthdate,
        position=employee_obj.position,
        status_crew=employee_obj.status_crew,
        monthly_salary=employee_obj.monthly_salary,
        work_hours_per_day=employee_obj.work_hours_per_day,
        hourly_rate=employee_obj.hourly_rate,
        status=employee_obj.status,
        created_at=doc['created_at']
    )

@api_router.get("/employees", response_model=List[EmployeeResponse])
async def get_employees(status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    
    employees = await db.employees.find(query, {"_id": 0, "pin_hash": 0}).to_list(1000)
    return employees

@api_router.get("/employees/{employee_id}", response_model=EmployeeResponse)
async def get_employee(employee_id: str):
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0, "pin_hash": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee

@api_router.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(employee_id: str, employee: EmployeeCreate):
    existing = await db.employees.find_one({"id": employee_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    update_dict = employee.model_dump()
    if 'pin' in update_dict and update_dict['pin']:
        update_dict['pin_hash'] = hash_pin(update_dict['pin'])
    update_dict.pop('pin', None)
    
    update_dict['hourly_rate'] = calculate_hourly_rate(employee.monthly_salary, employee.work_hours_per_day)
    
    await db.employees.update_one({"id": employee_id}, {"$set": update_dict})
    
    updated_employee = await db.employees.find_one({"id": employee_id}, {"_id": 0, "pin_hash": 0})
    return updated_employee

async def _delete_employee_internal(employee_id: str, permanent: bool):
    existing = await db.employees.find_one({"id": employee_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    if permanent:
        await db.employees.delete_one({"id": employee_id})
        await db.attendance.delete_many({"employee_id": employee_id})
        await db.advances.delete_many({"employee_id": employee_id})
        return {"message": "Employee deleted permanently", "id": employee_id}

    await db.employees.update_one(
        {"id": employee_id},
        {"$set": {"status": "inactive"}}
    )
    return {"message": "Employee deactivated successfully", "id": employee_id}


@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, permanent: bool = False):
    return await _delete_employee_internal(employee_id, permanent)

@api_router.delete("/employees/{employee_id}/force")
async def delete_employee_permanent(employee_id: str):
    return await _delete_employee_internal(employee_id, True)

# Auth Routes
@api_router.post("/auth/employee-login")
async def employee_login(login: LoginRequest):
    employee = await db.employees.find_one({"id": login.employee_id})
    if not employee:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_pin(login.pin, employee['pin_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    employee.pop('pin_hash', None)
    employee.pop('_id', None)
    
    return {"employee": employee, "message": "Login successful"}

@api_router.post("/auth/admin-login")
async def admin_login(login: AdminLogin):
    # Check if admin settings exist
    admin_settings = await db.admin_settings.find_one({"type": "pin"})
    
    if admin_settings and login.pin:
        # Check against stored PIN
        if verify_pin(login.pin, admin_settings['pin_hash']):
            return {"message": "Login successful", "role": "admin"}
    elif not admin_settings and login.pin == "123456":
        # Default PIN on first use
        return {"message": "Login successful", "role": "admin", "default_pin": True}
    
    # Fallback to username/password
    if login.username == "admin" and login.password == "admin123":
        return {"message": "Login successful", "role": "admin"}
    
    raise HTTPException(status_code=401, detail="Invalid admin credentials")

@api_router.post("/auth/admin-pin/setup")
async def setup_admin_pin(data: dict):
    new_pin = data.get('new_pin')
    if not new_pin or len(new_pin) < 6:
        raise HTTPException(status_code=400, detail="PIN must be at least 6 digits")
    
    pin_hash = hash_pin(new_pin)
    
    await db.admin_settings.update_one(
        {"type": "pin"},
        {"$set": {"pin_hash": pin_hash, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"message": "Admin PIN updated successfully"}

@api_router.post("/auth/admin-pin/change")
async def change_admin_pin(data: AdminPINUpdate):
    admin_settings = await db.admin_settings.find_one({"type": "pin"})
    
    if not admin_settings:
        raise HTTPException(status_code=404, detail="No PIN set. Please setup PIN first.")
    
    if not verify_pin(data.old_pin, admin_settings['pin_hash']):
        raise HTTPException(status_code=401, detail="Old PIN is incorrect")
    
    if len(data.new_pin) < 6:
        raise HTTPException(status_code=400, detail="New PIN must be at least 6 digits")
    
    new_pin_hash = hash_pin(data.new_pin)
    
    await db.admin_settings.update_one(
        {"type": "pin"},
        {"$set": {"pin_hash": new_pin_hash, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "PIN changed successfully"}

# Attendance Routes
@api_router.post("/attendance/clock-in")
async def clock_in(data: AttendanceClockIn):
    await _close_expired_sessions(data.employee_id)

    employee = await db.employees.find_one({"id": data.employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    now_utc = datetime.now(timezone.utc)
    local_now = _to_local(now_utc)
    current_hour = local_now.hour
    current_minute = local_now.minute
    current_time_minutes = current_hour * 60 + current_minute
    
    clock_in_start = 8 * 60
    clock_in_end = 11 * 60
    work_start = 9 * 60

    session_type: Optional[str] = None
    if clock_in_start <= current_time_minutes <= clock_in_end:
        session_type = "normal"
    elif 21 * 60 <= current_time_minutes < 24 * 60:
        session_type = "overtime"
    else:
        raise HTTPException(
            status_code=400, 
            detail=f"Clock-in tidak tersedia pada jam {current_hour:02d}:{current_minute:02d}"
        )
    
    today = local_now.strftime("%Y-%m-%d")
    
    if session_type == "normal":
        existing_normal = await db.attendance.find_one({
        "employee_id": data.employee_id,
        "date": today,
            "$or": [
                {"session_type": "normal"},
                {"session_type": {"$exists": False}}
            ]
    })
        if existing_normal:
            raise HTTPException(status_code=400, detail="Normal session already recorded for today")
    else:
        existing_overtime = await db.attendance.find_one({
            "employee_id": data.employee_id,
            "date": today,
            "session_type": "overtime"
        })
        if existing_overtime:
            raise HTTPException(status_code=400, detail="Overtime session already recorded for today")
        open_normal = await db.attendance.find_one({
            "employee_id": data.employee_id,
            "clock_out": None,
            "$or": [
                {"session_type": "normal"},
                {"session_type": {"$exists": False}}
            ]
        })
        if open_normal:
            raise HTTPException(status_code=400, detail="Normal session still open")

    is_late = False
    late_minutes = 0
    status_message = "Overtime session started" if session_type == "overtime" else "Clock-in on time"

    if session_type == "normal":
        is_late = current_time_minutes > work_start
        late_minutes = max(0, current_time_minutes - work_start)

        if is_late:
            status_message = (
                f"Terlambat {late_minutes} menit. "
                f"Gaji dihitung mulai dari jam {current_hour:02d}:{current_minute:02d}"
            )
        else:
            status_message = "Clock-in on time"
    
    attendance = Attendance(
        employee_id=data.employee_id,
        clock_in=now_utc,
        date=today,
        session_type=session_type
    )
    
    doc = attendance.model_dump()
    doc['clock_in'] = doc['clock_in'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['is_late'] = is_late
    doc['late_minutes'] = late_minutes
    doc['effective_work_start'] = effective_work_start_local.isoformat()
    
    await db.attendance.insert_one(doc)
    
    return {
        "message": "Clocked in successfully",
        "clock_in": doc['clock_in'],
        "is_late": is_late,
        "late_minutes": late_minutes,
        "status_message": status_message,
        "work_starts_at": effective_work_start_local.strftime("%H:%M"),
        "session_type": session_type
    }

@api_router.post("/attendance/clock-out")
async def clock_out(data: AttendanceClockOut):
    await _close_expired_sessions(data.employee_id)

    employee = await db.employees.find_one({"id": data.employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    attendance = await db.attendance.find_one({
        "employee_id": data.employee_id,
        "clock_out": None
    })
    
    if not attendance:
        raise HTTPException(status_code=400, detail="No open clock-in record found")
    
    clock_out_time = datetime.now(timezone.utc)
    result = await _finalize_session(attendance, clock_out_time)

    if not result:
        raise HTTPException(status_code=500, detail="Failed to compute salary")
    
    return {
        "message": "Clocked out successfully",
        "clock_out": clock_out_time.isoformat(),
        "duration_minutes": result["duration_minutes"],
        "salary_earned": result["salary"],
        "deduction": result["deduction"],
        "minute_rate": result["minute_rate"],
        "tolerance_applied": result["tolerance_message"],
        "session_type": result["session_type"]
    }

@api_router.get("/attendance/employee/{employee_id}", response_model=List[AttendanceResponse])
async def get_employee_attendance(employee_id: str):
    await _close_expired_sessions(employee_id)
    attendance_records = await db.attendance.find(
        {"employee_id": employee_id},
        {"_id": 0}
    ).sort("date", -1).to_list(1000)
    
    return attendance_records

@api_router.get("/attendance/daily-summary/{employee_id}")
async def get_attendance_daily_summary(employee_id: str):
    await _close_expired_sessions(employee_id)
    return await _aggregate_daily_salary(employee_id)

@api_router.get("/attendance/status/{employee_id}")
async def get_attendance_status(employee_id: str):
    await _close_expired_sessions(employee_id)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    attendance = await db.attendance.find_one({
        "employee_id": employee_id,
        "date": today
    })
    
    if not attendance:
        return {"status": "inactive", "clocked_in": False}
    
    if attendance.get('clock_out'):
        return {"status": "inactive", "clocked_in": False}
    
    return {"status": "active", "clocked_in": True}

@api_router.get("/attendance/all", response_model=List[AttendanceResponse])
async def get_all_attendance():
    await _close_expired_sessions()
    attendance_records = await db.attendance.find(
        {},
        {"_id": 0}
    ).sort("date", -1).to_list(1000)
    
    return attendance_records

# Advance Routes
@api_router.post("/advances", response_model=AdvanceResponse)
async def create_advance(advance: AdvanceCreate):
    employee = await db.employees.find_one({"id": advance.employee_id})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    advance_obj = Advance(
        employee_id=advance.employee_id,
        amount=advance.amount,
        notes=advance.notes,
        date=today,
        status="approved"
    )
    
    doc = advance_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.advances.insert_one(doc)
    
    return AdvanceResponse(
        id=advance_obj.id,
        employee_id=advance_obj.employee_id,
        amount=advance_obj.amount,
        notes=advance_obj.notes,
        date=advance_obj.date,
        status=advance_obj.status
    )

@api_router.get("/advances/employee/{employee_id}", response_model=List[AdvanceResponse])
async def get_employee_advances(employee_id: str):
    advances = await db.advances.find(
        {"employee_id": employee_id},
        {"_id": 0}
    ).sort("date", -1).to_list(1000)
    
    return advances

@api_router.get("/advances/all", response_model=List[AdvanceResponse])
async def get_all_advances():
    advances = await db.advances.find(
        {},
        {"_id": 0}
    ).sort("date", -1).to_list(1000)
    
    return advances

# Cashflow Routes
@api_router.post("/cashflow", response_model=CashflowResponse)
async def create_cashflow(cashflow: CashflowCreate):
    cashflow_obj = Cashflow(**cashflow.model_dump())
    doc = cashflow_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.cashflow.insert_one(doc)
    
    return CashflowResponse(**{k: v for k, v in doc.items() if k != 'created_at'})

@api_router.get("/cashflow", response_model=List[CashflowResponse])
async def get_cashflow(month: Optional[str] = None):
    query = {}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    cashflows = await db.cashflow.find(query, {"_id": 0, "created_at": 0}).sort("date", -1).to_list(1000)
    return cashflows

@api_router.put("/cashflow/{cashflow_id}", response_model=CashflowResponse)
async def update_cashflow(cashflow_id: str, cashflow: CashflowCreate):
    existing = await db.cashflow.find_one({"id": cashflow_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Cashflow not found")
    
    update_dict = cashflow.model_dump()
    result = await db.cashflow.update_one({"id": cashflow_id}, {"$set": update_dict})
    
    updated_cashflow = await db.cashflow.find_one({"id": cashflow_id}, {"_id": 0, "created_at": 0})
    return updated_cashflow

@api_router.delete("/cashflow/{cashflow_id}")
async def delete_cashflow(cashflow_id: str):
    result = await db.cashflow.delete_one({"id": cashflow_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cashflow not found")
    return {"message": "Cashflow deleted successfully"}

@api_router.get("/cashflow/summary")
async def get_cashflow_summary(month: Optional[str] = None):
    query = {}
    if month:
        query["date"] = {"$regex": f"^{month}"}
    else:
        current_month = datetime.now(timezone.utc).strftime("%Y-%m")
        query["date"] = {"$regex": f"^{current_month}"}
    
    cashflows = await db.cashflow.find(query, {"_id": 0}).to_list(10000)
    
    total_income = sum(cf.get('amount', 0) or 0 for cf in cashflows if cf.get('category') == 'income')
    total_expense = sum(cf.get('amount', 0) or 0 for cf in cashflows if cf.get('category') == 'expense')
    
    # Get salary data for comparison
    attendance_records = await db.attendance.find(query, {"_id": 0}).to_list(10000)
    total_salary = sum(record.get('salary_earned', 0) or 0 for record in attendance_records)
    
    advances = await db.advances.find(query, {"_id": 0}).to_list(10000)
    total_advances = sum(adv.get('amount', 0) or 0 for adv in advances)
    
    balance = total_income - total_expense
    net_after_salary = balance - total_salary
    
    return {
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": balance,
        "total_salary": total_salary,
        "total_advances": total_advances,
        "net_after_salary": net_after_salary
    }

async def _build_employee_report_payload(employee_id: str):
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0, "pin_hash": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    attendance_records = await db.attendance.find(
        {"employee_id": employee_id, "clock_out": {"$ne": None}},
        {"_id": 0}
    ).sort("date", -1).to_list(1000)

    advances = await db.advances.find(
        {"employee_id": employee_id},
        {"_id": 0}
    ).sort("date", -1).to_list(1000)

    total_salary = sum(record.get('salary_earned', 0) or 0 for record in attendance_records)
    salary_summary = await _aggregate_daily_salary(employee_id)
    total_advances = sum(
        adv.get('amount', 0) or 0
        for adv in advances
        if (adv.get('status') or '').lower() == 'approved'
    )
    net_salary = total_salary - total_advances
    
    return {
        "employee": employee,
        "attendance": attendance_records,
        "advances": advances,
        "summary": {
            "total_salary": total_salary,
            "total_advances": total_advances,
            "net_salary": net_salary
        },
        "daily_salary_summary": salary_summary
    }

def _format_currency_idr(value) -> str:
    try:
        numeric = float(value or 0)
    except (TypeError, ValueError):
        numeric = 0
    return f"Rp {numeric:,.0f}".replace(",", ".")


async def _aggregate_daily_salary(employee_id: str) -> Dict[str, Any]:
    records = await db.attendance.find(
        {"employee_id": employee_id, "clock_out": {"$ne": None}},
        {"_id": 0}
    ).sort("date", -1).to_list(1000)

    daily: Dict[str, Dict[str, float]] = {}
    for record in records:
        date = record.get("date")
        if not date:
            continue
        session_type = record.get("session_type", "normal")
        duration = record.get("work_duration_minutes") or 0
        salary = record.get("salary_earned") or 0
        bucket = daily.setdefault(date, {
            "date": date,
            "work_minutes_normal": 0.0,
            "work_minutes_overtime": 0.0,
            "salary_normal": 0.0,
            "salary_overtime": 0.0,
        })
        if session_type == "overtime":
            bucket["work_minutes_overtime"] += duration
            bucket["salary_overtime"] += salary
        else:
            bucket["work_minutes_normal"] += duration
            bucket["salary_normal"] += salary

    total_work_minutes = 0.0
    total_salary = 0.0

    per_day_list = []
    for entry in sorted(daily.values(), key=lambda item: item["date"], reverse=True):
        work_normal = entry["work_minutes_normal"]
        work_ot = entry["work_minutes_overtime"]
        salary_normal = entry["salary_normal"]
        salary_ot = entry["salary_overtime"]
        total_day_minutes = work_normal + work_ot
        total_day_salary = salary_normal + salary_ot
        entry["total_work_minutes"] = total_day_minutes
        entry["total_salary"] = total_day_salary
        per_day_list.append(entry)
        total_work_minutes += total_day_minutes
        total_salary += total_day_salary

    return {
        "total_work_minutes": total_work_minutes,
        "total_salary": total_salary,
        "daily": per_day_list
    }

def _format_time(value: Optional[str]) -> str:
    if not value:
        return "-"
    cleaned = value.replace("Z", "+00:00") if isinstance(value, str) and value.endswith("Z") else value
    try:
        return datetime.fromisoformat(cleaned).strftime("%H:%M")
    except ValueError:
        return value

def _format_date(value: Optional[str]) -> str:
    if not value:
        return "-"
    date_part = value.split("T")[0]
    cleaned = value.replace("Z", "+00:00") if isinstance(value, str) and value.endswith("Z") else value
    try:
        return datetime.fromisoformat(cleaned).strftime("%d-%m-%Y")
    except ValueError:
        return date_part or value

def _build_employee_report_pdf(report_data: dict) -> BytesIO:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        topMargin=36,
        bottomMargin=36,
        leftMargin=48,
        rightMargin=48,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name="ReportTitle",
        parent=styles['Heading1'],
        fontSize=18,
        leading=22,
        alignment=TA_CENTER,
        spaceAfter=12,
    )
    subtitle_style = ParagraphStyle(
        name="ReportSubtitle",
        parent=styles['BodyText'],
        fontSize=10,
        alignment=TA_CENTER,
        textColor=colors.grey,
        spaceAfter=18,
    )
    section_style = ParagraphStyle(
        name="SectionTitle",
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=14,
        spaceAfter=8,
    )
    normal_style = ParagraphStyle(
        name="BodyTextCustom",
        parent=styles['BodyText'],
        leading=14,
    )
    caption_style = ParagraphStyle(
        name="Caption",
        parent=styles['BodyText'],
        fontSize=9,
        textColor=colors.grey,
        spaceBefore=4,
    )

    elements = []
    employee = report_data["employee"]
    now_str = datetime.now().strftime("%d %b %Y %H:%M")

    elements.append(Paragraph("Laporan Keuangan Crew", title_style))
    elements.append(Paragraph(f"Diperbarui: {now_str}", subtitle_style))

    info_data = [
        ["Nama", employee.get("name", "-")],
        ["Posisi", employee.get("position", "-")],
        ["Status Crew", employee.get("status_crew", "-")],
        ["Status", (employee.get("status") or "-").title()],
        ["Nomor WhatsApp", employee.get("whatsapp", "-")],
    ]
    info_table = Table(info_data, colWidths=[140, 320])
    info_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F5F5F5")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#37474F")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("LINEABOVE", (0, 0), (-1, 0), 0.75, colors.HexColor("#CFD8DC")),
        ("LINEBELOW", (0, -1), (-1, -1), 0.75, colors.HexColor("#CFD8DC")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FAFAFA")]),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(info_table)

    summary = report_data["summary"]
    summary_table = Table(
        [
            ["Total Gaji", "Total Kasbon", "Gaji Bersih"],
            [
                _format_currency_idr(summary.get("total_salary")),
                _format_currency_idr(summary.get("total_advances")),
                _format_currency_idr(summary.get("net_salary")),
            ],
        ],
        colWidths=[150, 150, 150],
    )
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#263238")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#ECEFF1")),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 1), (-1, 1), colors.HexColor("#37474F")),
        ("LINEABOVE", (0, 0), (-1, 0), 1, colors.HexColor("#CFD8DC")),
        ("LINEBELOW", (0, -1), (-1, -1), 1, colors.HexColor("#CFD8DC")),
    ]))
    elements.append(Spacer(1, 18))
    elements.append(summary_table)

    attendance_records = report_data["attendance"]
    elements.append(Paragraph("Riwayat Absensi", section_style))
    if attendance_records:
        attendance_data = [["Tanggal", "Masuk", "Keluar", "Durasi (jam)", "Gaji (Rp)"]]
        for record in attendance_records[:30]:
            duration_minutes = record.get('work_duration_minutes')
            duration_hours = None
            if duration_minutes:
                duration_hours = duration_minutes / 60
            elif record.get('total_hours'):
                duration_hours = float(record.get('total_hours'))
            attendance_data.append([
                _format_date(record.get("date") or record.get("clock_in")),
                _format_time(record.get("clock_in")),
                _format_time(record.get("clock_out")),
                f"{duration_hours:.2f}" if duration_hours is not None else "-",
                _format_currency_idr(record.get("salary_earned")),
            ])
        attendance_table = Table(attendance_data, repeatRows=1, colWidths=[80, 70, 70, 80, 100])
        attendance_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#37474F")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN", (0, 0), (-1, 0), "CENTER"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9F9F9")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CFD8DC")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        elements.append(attendance_table)
        if len(attendance_records) > 30:
            elements.append(Paragraph("Menampilkan 30 catatan absensi terbaru.", caption_style))
    else:
        elements.append(Paragraph("Belum ada riwayat absensi yang selesai.", normal_style))

    advances = report_data["advances"]
    elements.append(Paragraph("Catatan Kasbon", section_style))
    if advances:
        advances_data = [["Tanggal", "Nominal", "Keterangan", "Status"]]
        for adv in advances[:30]:
            advances_data.append([
                _format_date(adv.get("date") or adv.get("request_date")),
                _format_currency_idr(adv.get("amount")),
                adv.get("notes") or adv.get("reason") or "-",
                (adv.get("status") or "-").capitalize(),
            ])
        advances_table = Table(advances_data, repeatRows=1, colWidths=[80, 80, 200, 60])
        advances_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#37474F")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN", (0, 0), (-1, 0), "CENTER"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F9F9F9")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CFD8DC")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        elements.append(advances_table)
        if len(advances) > 30:
            elements.append(Paragraph("Menampilkan 30 catatan kasbon terbaru.", caption_style))
    else:
        elements.append(Paragraph("Belum ada catatan kasbon.", normal_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer

# Report Routes
@api_router.get("/report/employee/{employee_id}")
async def generate_employee_report(employee_id: str):
    return await _build_employee_report_payload(employee_id)

@api_router.get("/report/employee/{employee_id}/pdf")
async def generate_employee_report_pdf(employee_id: str):
    report_data = await _build_employee_report_payload(employee_id)
    pdf_buffer = _build_employee_report_pdf(report_data)
    employee_name = report_data["employee"].get("name", "crew").replace(" ", "_")
    headers = {"Content-Disposition": f'attachment; filename="laporan_{employee_name}.pdf"'}
    return StreamingResponse(pdf_buffer, media_type="application/pdf", headers=headers)

@api_router.get("/stats/dashboard")
async def get_dashboard_stats():
    total_employees = await db.employees.count_documents({"status": "active"})
    total_attendance_today = await db.attendance.count_documents({
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d")
    })
    
    current_month = datetime.now(timezone.utc).strftime("%Y-%m")
    attendance_records = await db.attendance.find(
        {"date": {"$regex": f"^{current_month}"}},
        {"_id": 0}
    ).to_list(10000)
    
    total_salary_month = sum(record.get('salary_earned', 0) or 0 for record in attendance_records)
    
    advances = await db.advances.find(
        {"date": {"$regex": f"^{current_month}"}},
        {"_id": 0}
    ).to_list(10000)
    
    total_advances_month = sum(adv.get('amount', 0) or 0 for adv in advances)
    
    return {
        "total_employees": total_employees,
        "attendance_today": total_attendance_today,
        "total_salary_month": total_salary_month,
        "total_advances_month": total_advances_month
    }

# Stock Management Routes
@api_router.get("/stock", response_model=List[StockResponse])
async def get_stock():
    stock_items = await db.stock.find({}, {"_id": 0}).to_list(length=None)
    return stock_items

@api_router.post("/stock", response_model=StockResponse)
async def create_stock(stock: StockItem):
    stock_dict = stock.model_dump()
    stock_dict['id'] = str(uuid.uuid4())
    stock_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.stock.insert_one(stock_dict)
    return stock_dict

@api_router.put("/stock/{stock_id}", response_model=StockResponse)
async def update_stock(stock_id: str, stock: StockUpdate):
    existing = await db.stock.find_one({"id": stock_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Stock item not found")
    
    update_dict = stock.model_dump(exclude_none=True)
    if update_dict:
        await db.stock.update_one({"id": stock_id}, {"$set": update_dict})

    updated = await db.stock.find_one({"id": stock_id}, {"_id": 0})
    return updated

@api_router.delete("/stock/{stock_id}")
async def delete_stock(stock_id: str):
    result = await db.stock.delete_one({"id": stock_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Stock item not found")
    return {"message": "Stock item deleted successfully"}

# Print Jobs Routes
@api_router.get("/print-jobs", response_model=List[PrintJobResponse])
async def get_print_jobs(only_project: bool = False):
    query = {}
    if only_project:
        query = {
            "$or": [
                {"is_project": True},
                {"project_name": {"$exists": True, "$ne": None}},
                {"materials": {"$exists": True, "$ne": []}},
                {"category": "project"},
            ]
        }

    jobs_cursor = db.print_jobs.find(query, {"_id": 0}).sort("created_at", -1)
    jobs = await jobs_cursor.to_list(length=None)
    return jobs

@api_router.post("/print-jobs")
async def create_print_job(request: Request):
    # Terima semua data sebagai dict untuk menyimpan field tambahan
    job_data = await request.json()
    # region agent log
    debug_log(
        "H2",
        "server.py:create_print_job:start",
        "Incoming print job",
        {
            "project_name": job_data.get("project_name"),
            "materials_len": len(job_data.get("materials") or []),
        },
    )
    # endregion
    
    # Validasi field yang diperlukan
    if not all(k in job_data for k in ['date', 'material', 'price']):
        raise HTTPException(status_code=400, detail="Missing required fields: date, material, price")
    
    # Parse PrintJob untuk validasi field standar
    try:
        job = PrintJob(
            date=job_data['date'],
            material=job_data['material'],
            price=float(job_data['price']),
            quantity=float(job_data.get('quantity', 1)),
            customer_name=job_data.get('customer_name', ''),
            notes=job_data.get('notes', '')
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid data: {str(e)}")
    
    # Check and update stock
    material_name = job.material.replace('_', ' ').title()  # vinyl -> Vinyl, art_carton -> Art Carton
    stock_item = await db.stock.find_one({"name": {"$regex": f"^{material_name}", "$options": "i"}})
    
    if stock_item:
        current_stock = stock_item.get('quantity', 0)
        if current_stock < job.quantity:
            raise HTTPException(
                status_code=400, 
                detail=f"Stock {material_name} tidak cukup! Tersedia: {current_stock}, Dibutuhkan: {job.quantity}"
            )
        
        # Reduce stock
        new_quantity = current_stock - job.quantity
        await db.stock.update_one(
            {"id": stock_item['id']},
            {"$set": {"quantity": new_quantity}}
        )
    
    # Simpan semua field yang dikirim, termasuk project_name, materials, dan hpp
    job_dict = job.model_dump()
    
    # Tambahkan field tambahan yang dikirim dari frontend (PROJECT CUSTOM)
    # Pastikan semua field project custom tersimpan dengan benar
    if 'project_name' in job_data:
        project_name = job_data['project_name']
        if project_name and str(project_name).strip():
            job_dict['project_name'] = str(project_name).strip()
    if 'materials' in job_data:
        materials = job_data['materials']
        if materials:
            job_dict['materials'] = materials
    if 'hpp' in job_data:
        hpp_value = job_data['hpp']
        if hpp_value is not None:
            try:
                job_dict['hpp'] = float(hpp_value)
            except (ValueError, TypeError):
                job_dict['hpp'] = 0.0
    job_dict['is_project'] = bool(
        job_dict.get('project_name') or job_dict.get('materials') or job_data.get('is_project')
    )
    
    job_dict['id'] = str(uuid.uuid4())
    job_dict['created_at'] = datetime.now(timezone.utc).isoformat()
    job_dict['stock_synced'] = stock_item is not None  # Track if stock was updated
    
    # Debug: log untuk memastikan data tersimpan
    logging.info(
        "Creating print job (project=%s) with project_name=%s, materials=%s",
        job_dict['is_project'],
        job_dict.get('project_name'),
        len(job_dict.get('materials', [])),
    )
    
    await db.print_jobs.insert_one(job_dict)
    # region agent log
    debug_log(
        "H2",
        "server.py:create_print_job:success",
        "Print job stored",
        {
            "id": job_dict['id'],
            "project_name": job_dict.get("project_name"),
        },
    )
    # endregion
    return job_dict

@api_router.put("/print-jobs/{job_id}", response_model=PrintJobResponse)
async def update_print_job(job_id: str, request: Request):
    existing = await db.print_jobs.find_one({"id": job_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Print job not found")

    payload = await request.json()
    merged = {**existing, **payload}

    try:
        job = PrintJob(
            date=merged.get('date', existing.get('date')),
            material=merged.get('material', existing.get('material')),
            price=float(merged.get('price', existing.get('price', 0))),
            quantity=float(merged.get('quantity', existing.get('quantity', 1))),
            customer_name=merged.get('customer_name', existing.get('customer_name', '')),
            notes=merged.get('notes', existing.get('notes', '')),
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid data: {str(e)}")

    old_material = existing.get('material')
    old_quantity = existing.get('quantity', 0)
    new_material = job.material
    new_quantity = job.quantity

    if old_material != new_material or old_quantity != new_quantity:
        if old_material and existing.get('stock_synced'):
            old_material_name = old_material.replace('_', ' ').title()
            old_stock_item = await db.stock.find_one({"name": {"$regex": f"^{old_material_name}", "$options": "i"}})
            if old_stock_item:
                await db.stock.update_one(
                    {"id": old_stock_item['id']},
                    {"$inc": {"quantity": old_quantity}}
                )

        new_material_name = new_material.replace('_', ' ').title()
        new_stock_item = await db.stock.find_one({"name": {"$regex": f"^{new_material_name}", "$options": "i"}})

        if new_stock_item:
            current_stock = new_stock_item.get('quantity', 0)
            if current_stock < new_quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock {new_material_name} tidak cukup! Tersedia: {current_stock}, Dibutuhkan: {new_quantity}"
                )

            await db.stock.update_one(
                {"id": new_stock_item['id']},
                {"$set": {"quantity": current_stock - new_quantity}}
            )

    update_dict = job.model_dump()

    if 'project_name' in payload:
        project_name = payload['project_name']
        if project_name and str(project_name).strip():
            update_dict['project_name'] = str(project_name).strip()
    if 'materials' in payload:
        materials = payload['materials']
        if materials is not None:
            update_dict['materials'] = materials
    if 'hpp' in payload:
        hpp_value = payload['hpp']
        if hpp_value is not None:
            try:
                update_dict['hpp'] = float(hpp_value)
            except (ValueError, TypeError):
                update_dict['hpp'] = 0.0

    update_dict['is_project'] = bool(
        update_dict.get('project_name') or update_dict.get('materials') or payload.get('is_project') or existing.get('is_project')
    )
    update_dict['stock_synced'] = existing.get('stock_synced') or (old_material != new_material or old_quantity != new_quantity)

    await db.print_jobs.update_one({"id": job_id}, {"$set": update_dict})
    updated = await db.print_jobs.find_one({"id": job_id}, {"_id": 0})
    return updated

@api_router.delete("/print-jobs/{job_id}")
async def delete_print_job(job_id: str):
    # Get job before delete to return stock
    job = await db.print_jobs.find_one({"id": job_id})
    if not job:
        raise HTTPException(status_code=404, detail="Print job not found")
    
    # Return stock if it was synced
    if job.get('stock_synced'):
        material_name = job.get('material', '').replace('_', ' ').title()
        quantity = job.get('quantity', 0)
        
        stock_item = await db.stock.find_one({"name": {"$regex": f"^{material_name}", "$options": "i"}})
        if stock_item:
            await db.stock.update_one(
                {"id": stock_item['id']},
                {"$inc": {"quantity": quantity}}
            )
    
    result = await db.print_jobs.delete_one({"id": job_id})
    return {"message": "Print job deleted successfully, stock returned"}

@api_router.get("/print-jobs/check-stock/{material}")
async def check_material_stock(material: str):
    """Check available stock for a material"""
    material_name = material.replace('_', ' ').title()
    stock_item = await db.stock.find_one({"name": {"$regex": f"^{material_name}", "$options": "i"}})
    
    if not stock_item:
        return {
            "available": False,
            "quantity": 0,
            "message": f"Stock {material_name} belum terdaftar. Silakan tambahkan di halaman Stock."
        }
    
    quantity = stock_item.get('quantity', 0)
    return {
        "available": True,
        "quantity": quantity,
        "unit": stock_item.get('unit', 'pcs'),
        "low_stock": quantity <= 10,
        "message": f"Stock tersedia: {quantity} {stock_item.get('unit', 'pcs')}"
    }

@api_router.get("/print-jobs/summary")
async def get_print_jobs_summary():
    jobs = await db.print_jobs.find({}).to_list(length=None)
    
    total_revenue = sum(job.get('price', 0) * job.get('quantity', 1) for job in jobs)
    total_jobs = len(jobs)
    
    # Group by material
    by_material = {}
    for job in jobs:
        material = job.get('material', 'unknown')
        if material not in by_material:
            by_material[material] = {'count': 0, 'revenue': 0}
        by_material[material]['count'] += 1
        by_material[material]['revenue'] += job.get('price', 0) * job.get('quantity', 1)
    
    return {
        "total_revenue": total_revenue,
        "total_jobs": total_jobs,
        "by_material": by_material
    }


# PROJECT ROUTES -------------------------------------------------------------
def _normalize_materials_from_payload(materials: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    normalized: List[Dict[str, Any]] = []
    for material in materials or []:
        if not isinstance(material, dict):
            continue
        name = material.get('name') or material.get('material_name')
        if not name:
            continue
        try:
            quantity = float(material.get('quantity', 0) or 0)
        except (ValueError, TypeError):
            quantity = 0
        try:
            price = float(material.get('price', 0) or 0)
        except (ValueError, TypeError):
            price = 0

        normalized.append({
            "name": str(name),
            "quantity": quantity,
            "price": price,
            "material_id": material.get('material_id'),
            "unit": material.get('unit'),
            "is_custom": bool(material.get('is_custom', False)),
        })
    return normalized


def _build_project_doc(payload: ProjectCreate, *, project_id: Optional[str] = None, created_at: Optional[str] = None) -> Dict[str, Any]:
    data = payload.model_dump()
    materials = _normalize_materials_from_payload(data.get('materials', []))
    try:
        hpp_value = float(data.get('hpp', 0) or 0)
    except (ValueError, TypeError):
        hpp_value = 0
    try:
        price_value = float(data.get('price', 0) or 0)
    except (ValueError, TypeError):
        price_value = 0
    try:
        qty_value = float(data.get('quantity', 0) or 0)
    except (ValueError, TypeError):
        qty_value = 0

    doc = {
        "id": project_id or str(uuid.uuid4()),
        "date": data.get('date'),
        "project_name": (data.get('project_name') or '').strip(),
        "customer_name": data.get('customer_name') or "",
        "quantity": qty_value,
        "hpp": hpp_value,
        "price": price_value,
        "notes": data.get('notes') or "",
        "materials": materials,
        "is_project": True,  # Selalu set flag untuk project custom
        "created_at": created_at or datetime.now(timezone.utc).isoformat(),
    }
    return doc


def _convert_print_job_to_project(job: Dict[str, Any]) -> Dict[str, Any]:
    materials = _normalize_materials_from_payload(job.get('materials', []))

    if not materials:
        fallback_name = job.get('project_name') or job.get('material') or job.get('name') or 'Custom Project'
        try:
            qty = float(job.get('quantity', 0) or 0)
        except (ValueError, TypeError):
            qty = 0
        try:
            price = float(job.get('hpp', 0) or 0)
        except (ValueError, TypeError):
            price = 0
        materials = [{
            "name": fallback_name,
            "quantity": qty,
            "price": price,
            "material_id": job.get('material_id'),
            "is_custom": True,
        }]

    try:
        hpp_value = float(job.get('hpp', 0) or 0)
    except (ValueError, TypeError):
        hpp_value = 0
    if hpp_value <= 0:
        hpp_value = sum(mat['quantity'] * mat['price'] for mat in materials)

    try:
        price_value = float(job.get('price', 0) or 0)
    except (ValueError, TypeError):
        price_value = 0

    try:
        qty_value = float(job.get('quantity', 0) or 0)
    except (ValueError, TypeError):
        qty_value = 0

    return {
        "id": job.get('id', str(uuid.uuid4())),
        "date": job.get('date') or job.get('created_at') or datetime.now(timezone.utc).isoformat(),
        "project_name": (job.get('project_name') or job.get('name') or job.get('material') or 'Custom Project'),
        "customer_name": job.get('customer_name', ''),
        "quantity": qty_value,
        "hpp": hpp_value,
        "price": price_value,
        "notes": job.get('notes', ''),
        "materials": materials,
        "is_project": True,  # Selalu set flag untuk project custom
        "created_at": job.get('created_at') or datetime.now(timezone.utc).isoformat(),
    }


@api_router.get("/projects", response_model=List[ProjectEntry])
async def get_projects():
    try:
        # Ambil dari collection projects (hanya project custom)
        projects = await db.projects.find({}, {"_id": 0}).sort("created_at", -1).to_list(length=None)
        
        # Jika tidak ada, coba migrasi dari print_jobs yang memiliki flag is_project atau project_name
        if not projects:
            legacy_jobs = await db.print_jobs.find(
                {
                    "$or": [
                        {"is_project": True},
                        {"project_name": {"$exists": True, "$ne": None, "$ne": ""}},
                        {"materials": {"$exists": True, "$ne": None, "$ne": []}},
                    ]
                },
                {"_id": 0},
            ).to_list(length=None)

            if legacy_jobs:
                transformed = [_convert_print_job_to_project(job) for job in legacy_jobs]
                if transformed:
                    # Migrasi ke collection projects
                    await db.projects.insert_many(transformed)
                    projects = transformed
        
        # Pastikan selalu return list, bahkan jika kosong
        return projects if projects else []
    except Exception as e:
        logging.error(f"Error fetching projects: {e}")
        return []


@api_router.post("/projects", response_model=ProjectEntry)
async def create_project(project: ProjectCreate):
    # region agent log
    debug_log(
        "H1",
        "server.py:create_project:start",
        "Incoming project",
        {
            "project_name": project.project_name,
            "materials_len": len(project.materials),
        },
    )
    # endregion
    project_dict = _build_project_doc(project)
    await db.projects.insert_one(project_dict)
    # region agent log
    debug_log(
        "H1",
        "server.py:create_project:success",
        "Project stored",
        {
            "id": project_dict['id'],
            "project_name": project_dict['project_name'],
        },
    )
    # endregion
    return project_dict


@api_router.put("/projects/{project_id}", response_model=ProjectEntry)
async def update_project(project_id: str, project: ProjectCreate):
    existing = await db.projects.find_one({"id": project_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    project_dict = _build_project_doc(project, project_id=project_id, created_at=existing.get('created_at'))
    await db.projects.update_one({"id": project_id}, {"$set": project_dict})
    return project_dict


@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted successfully"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
