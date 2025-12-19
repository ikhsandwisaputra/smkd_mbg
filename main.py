from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Boolean, ForeignKey, Float, Date, Time, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, date, time
from typing import Optional, List
import enum
import cv2
import numpy as np
import math

# ======================= KONFIGURASI =======================
# Ganti sesuai konfigurasi database Anda
DATABASE_URL = "postgresql://user_fastapi:password123@localhost:5432/db_belajar"
SECRET_KEY = "rahasia_super_negara_mbg_ganti_ini_nanti"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # Token valid 24 jam

# ======================= DATABASE SETUP =======================
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# [UPDATE] Definisi Role Baru
class UserRole(str, enum.Enum):
    admin = "admin"
    petugas_monitoring = "petugas_monitoring"
    kepala_dapur = "kepala_dapur"
    kepala_chef = "kepala_chef"
    user = "user" # Fallback untuk backward compatibility

# --- MODEL DATABASE ---
class Dapur(Base):
    __tablename__ = "dapurs"
    id = Column(Integer, primary_key=True, index=True)
    nama_dapur = Column(String, index=True)
    nomor_dapur = Column(String)
    lokasi = Column(String)
    users = relationship("User", back_populates="dapur")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String, nullable=True)
    
    # Role sekarang menggunakan string dari Enum
    role = Column(String, default=UserRole.petugas_monitoring.value)
    is_active = Column(Boolean, default=True)
    
    # is_kepala_dapur bisa kita abaikan/hapus nanti karena sudah ada di role, 
    # tapi biarkan dulu agar tidak error migrasi mendadak
    is_kepala_dapur = Column(Boolean, default=False) 
    
    dapur_id = Column(Integer, ForeignKey("dapurs.id"), nullable=True)
    
    dapur = relationship("Dapur", back_populates="users")
    pengujian = relationship("HasilPengujian", back_populates="user")

class HasilPengujian(Base):
    __tablename__ = "hasil_pengujian"
    id = Column(Integer, primary_key=True, index=True)
    parameter_uji = Column(String)
    tanggal = Column(Date)
    jam = Column(Time)
    nama_sampel = Column(String)
    baku_mutu = Column(Float)
    hasil_interpretasi = Column(Float)
    
    # 3 Status Approval Berjenjang
    status_petugas = Column(String, default="pending") 
    status_chef = Column(String, default="pending")    
    status_kepala = Column(String, default="pending")  
    
    # Log terakhir siapa yang klik
    approved_by = Column(String, nullable=True)         
    catatan = Column(Text, nullable=True)               
    
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="pengujian") # Relasi ke User

    dapur_id = Column(Integer, ForeignKey("dapurs.id"), nullable=True)
    dapur = relationship("Dapur")

# Buat tabel (Hanya bekerja jika tabel belum ada. Jika sudah ada, perlu migrasi manual atau drop tabel)
Base.metadata.create_all(bind=engine)

# ======================= SECURITY UTILS =======================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ======================= PYDANTIC SCHEMAS =======================

# --- Dapur Schemas ---
class DapurBase(BaseModel):
    nama_dapur: str
    nomor_dapur: str
    lokasi: str

class DapurCreate(DapurBase):
    pass

class DapurResponse(DapurBase):
    id: int
    # Field tambahan untuk endpoint Detail Dapur
    kepala_dapur_nama: Optional[str] = None
    kepala_chef_nama: Optional[str] = None
    petugas_monitoring_names: Optional[List[str]] = []

    class Config:
        from_attributes = True

# --- User Schemas ---
class UserBase(BaseModel):
    email: str
    full_name: str

class UserCreate(UserBase):
    password: str
    role: str = "petugas_monitoring"
    dapur_id: Optional[int] = None

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    dapur_id: Optional[int] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    role: str
    is_active: bool
    dapur_id: Optional[int]
    dapur: Optional[DapurBase] # Nested simple object
    class Config:
        from_attributes = True

# --- Pengujian Schemas ---
class PengujianBase(BaseModel):
    parameter_uji: str
    tanggal: date
    jam: time
    nama_sampel: str
    baku_mutu: float
    hasil_interpretasi: float
    dapur_id: int
    
class PengujianCreate(PengujianBase):
    pass

class ApprovalUpdate(BaseModel):
    status: str # approved / rejected
    catatan: Optional[str] = None

class PengujianResponse(BaseModel):
    id: int
    parameter_uji: str
    tanggal: date
    jam: time
    nama_sampel: str
    baku_mutu: float
    hasil_interpretasi: float
    dapur_id: int
    user_id: int
    
    # Field Tambahan untuk Tabel Approval
    nama_petugas: str = "-"  # Akan diambil dari user.full_name
    nama_dapur: str = "-"    # Akan diambil dari dapur.nama_dapur
    
    status_petugas: str
    status_chef: str
    status_kepala: str
    
    approved_by: Optional[str]
    catatan: Optional[str]

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class DapurDetailResponse(DapurResponse):
    kepala_dapur_nama: Optional[str] = "-"
    kepala_chef_nama: Optional[str] = "-"
    petugas_monitoring_names: List[str] = []
# ======================= SCANNER COLOR DATABASE =======================
DATABASE_WARNA = {
    "BORAX": [
        {'label': 'Negatif (Aman)', 'ppm': 0,      'hsv': [58.3, 79, 85], 'bahaya': False},
        {'label': 'Positif Rendah', 'ppm': 50,     'hsv': [41.8, 77, 86], 'bahaya': True},
        {'label': 'Positif Sedang', 'ppm': 100,    'hsv': [36.4, 75, 85], 'bahaya': True},
        {'label': 'Positif',        'ppm': 150,    'hsv': [22.0, 72, 82], 'bahaya': True},
        {'label': 'Bahaya Tinggi',  'ppm': 5000,   'hsv': [1.2, 73, 77],  'bahaya': True}
    ],
    "FORMALIN": [
        {'label': 'Negatif',   'ppm': 0,   'hsv': [0, 0, 100],     'bahaya': False},
        {'label': 'Rendah',    'ppm': 10,  'hsv': [329, 19, 79],   'bahaya': True},
        {'label': 'Bahaya',    'ppm': 50,  'hsv': [313.9, 49, 55], 'bahaya': True}
    ],
    "NITRAT": [
        {'label': 'Negatif',   'ppm': 0,   'hsv': [0, 0, 100],     'bahaya': False},
        {'label': 'Sedang',    'ppm': 20,  'hsv': [55.6, 100, 91], 'bahaya': True},
        {'label': 'Bahaya',    'ppm': 200, 'hsv': [23, 94, 89],    'bahaya': True}
    ],
    "MERKURI": [
        {'label': 'Aman',      'ppm': 0,    'hsv': [330, 1, 94],   'bahaya': False},
        {'label': 'Bahaya',    'ppm': 2,    'hsv': [289.4, 16, 82],'bahaya': True}
    ],
    "PESTISIDA": [
        {'label': 'Bahaya',    'ppm': 'High',     'hsv': [358.3, 88, 93], 'bahaya': True},
        {'label': 'Aman',      'ppm': 'Low',      'hsv': [216.4, 90, 53], 'bahaya': False}
    ]
}

def hitung_jarak_lab(hsv_user1, hsv_user2):
    # (Fungsi Color Distance sama seperti sebelumnya)
    def to_opencv_hsv(hsv):
        h_safe = min(max(hsv[0] / 2, 0), 179)
        s_safe = min(max(hsv[1] * 2.55, 0), 255)
        v_safe = min(max(hsv[2] * 2.55, 0), 255)
        return np.uint8([[[h_safe, s_safe, v_safe]]])

    mat1 = to_opencv_hsv(hsv_user1)
    mat2 = to_opencv_hsv(hsv_user2)
    lab1 = cv2.cvtColor(cv2.cvtColor(mat1, cv2.COLOR_HSV2BGR), cv2.COLOR_BGR2LAB)
    lab2 = cv2.cvtColor(cv2.cvtColor(mat2, cv2.COLOR_HSV2BGR), cv2.COLOR_BGR2LAB)
    L1, a1, b1 = int(lab1[0][0][0]), int(lab1[0][0][1]), int(lab1[0][0][2])
    L2, a2, b2 = int(lab2[0][0][0]), int(lab2[0][0][1]), int(lab2[0][0][2])
    return math.sqrt(((L1-L2)*0.5)**2 + ((a1-a2)*1.2)**2 + ((b1-b2)*1.2)**2)

# ======================= DEPENDENCIES =======================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None: raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(User).filter(User.email == email).first()
    if user is None: raise HTTPException(status_code=401, detail="User not found")
    return user

def get_current_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.admin.value:
        raise HTTPException(status_code=403, detail="Akses Admin Diperlukan")
    return current_user

# ======================= APP INITIALIZATION =======================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_db():
    # Seed data awal (Admin, Dapur Contoh)
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == "admin@mbg.com").first():
            admin_user = User(
                email="admin@mbg.com", 
                full_name="Super Admin", 
                hashed_password=get_password_hash("123"), 
                role=UserRole.admin.value
            )
            db.add(admin_user)
            db.commit()
    except Exception as e:
        print(f"Error seeding: {e}")
    finally:
        db.close()

# ======================= ENDPOINTS AUTH =======================
@app.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    return {"access_token": create_access_token(data={"sub": user.email}), "token_type": "bearer"}

@app.get("/users/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# ======================= ENDPOINTS SCANNER & PENGUJIAN =======================
@app.post("/scan")
async def scan_image(file: UploadFile = File(...), jenis_pengujian: str = Form(...)):
    if jenis_pengujian not in DATABASE_WARNA:
        raise HTTPException(status_code=400, detail="Jenis pengujian tidak valid")
    
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Simple Color Detection Logic
    img = cv2.resize(img, (50, 50))
    avg_color_row = np.average(img, axis=0)
    avg_color = np.average(avg_color_row, axis=0)
    avg_pixel = np.uint8([[avg_color]])
    hsv = cv2.cvtColor(avg_pixel, cv2.COLOR_BGR2HSV)[0][0]
    
    detected_hsv = [float(hsv[0]*2), float(hsv[1]/2.55), float(hsv[2]/2.55)] # Scale ke 360, 100, 100

    db_target = DATABASE_WARNA[jenis_pengujian]
    best = None
    min_dist = float('inf')

    for ref in db_target:
        dist = hitung_jarak_lab(detected_hsv, ref['hsv'])
        if dist < min_dist:
            min_dist = dist
            best = ref

    return {
        "status": "success",
        "info_zat": jenis_pengujian,
        "deteksi_warna": {"H": detected_hsv[0], "S": detected_hsv[1], "V": detected_hsv[2]},
        "hasil_analisa": {
            "label": best['label'],
            "estimasi_ppm": best['ppm'],
            "bahaya": best['bahaya'],
            "kemiripan_jarak": round(min_dist, 2)
        }
    }

@app.post("/pengujian/", response_model=PengujianResponse)
def create_pengujian(
    data: PengujianCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    new_data = HasilPengujian(
        **data.dict(),
        user_id=current_user.id,
        # Default semua pending agar masuk ke tab approval masing-masing role
        status_petugas="pending",
        status_chef="pending",
        status_kepala="pending"
    )
    db.add(new_data)
    db.commit()
    db.refresh(new_data)
    return new_data

# [UPDATE ENDPOINT APPROVAL]
# Logic agar update status sesuai Role yang login

@app.put("/pengujian/{id}/approval", response_model=PengujianResponse)
def approval_pengujian(
    id: int,
    approval_data: ApprovalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(HasilPengujian).filter(HasilPengujian.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")

    # VALIDASI & LOGIC UPDATE BERDASARKAN ROLE
    # Hanya user yang sesuai role dan berada di dapur yang sama (kecuali admin)
    
    is_admin = current_user.role == UserRole.admin.value
    is_same_kitchen = (item.dapur_id == current_user.dapur_id)

    if not is_admin and not is_same_kitchen:
         raise HTTPException(status_code=403, detail="Akses ditolak: Beda Dapur")

    # Update kolom yang spesifik berdasarkan role user yang login
    if current_user.role == UserRole.petugas_monitoring.value:
        item.status_petugas = approval_data.status
    elif current_user.role == UserRole.kepala_chef.value:
        item.status_chef = approval_data.status
    elif current_user.role == UserRole.kepala_dapur.value:
        item.status_kepala = approval_data.status
    elif is_admin:
        # Jika admin, anggap menyetujui semuanya (opsional, atau bisa pilih salah satu)
        item.status_petugas = approval_data.status
        item.status_chef = approval_data.status
        item.status_kepala = approval_data.status
    else:
        raise HTTPException(status_code=403, detail="Role tidak memiliki wewenang approval")

    item.approved_by = current_user.full_name
    item.catatan = approval_data.catatan
    
    db.commit()
    db.refresh(item)
    return item

@app.get("/pengujian/", response_model=List[PengujianResponse])
def get_pengujian(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Query Data
    query = db.query(HasilPengujian)
    
    # Filter Role
    if current_user.role == UserRole.admin.value:
        results = query.all()
    elif current_user.dapur_id:
        results = query.filter(HasilPengujian.dapur_id == current_user.dapur_id).all()
    else:
        results = query.filter(HasilPengujian.user_id == current_user.id).all()
        
    # Mapping Data ke Schema Response (termasuk nama petugas)
    output = []
    for item in results:
        # Ambil nama petugas dari relasi user
        nama_petugas_str = item.user.full_name if item.user else "Unknown"
        nama_dapur_str = item.dapur.nama_dapur if item.dapur else "Unknown"
        
        output.append({
            "id": item.id,
            "parameter_uji": item.parameter_uji,
            "tanggal": item.tanggal,
            "jam": item.jam,
            "nama_sampel": item.nama_sampel,
            "baku_mutu": item.baku_mutu,
            "hasil_interpretasi": item.hasil_interpretasi,
            "dapur_id": item.dapur_id,
            "user_id": item.user_id,
            "nama_petugas": nama_petugas_str, # <--- PENTING
            "nama_dapur": nama_dapur_str,     # <--- PENTING
            "status_petugas": item.status_petugas,
            "status_chef": item.status_chef,
            "status_kepala": item.status_kepala,
            "approved_by": item.approved_by,
            "catatan": item.catatan
        })
    return output
# [BARU] ENDPOINT APPROVAL
@app.put("/pengujian/{id}/approval", response_model=PengujianResponse)
def approval_pengujian(
    id: int,
    approval_data: ApprovalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(HasilPengujian).filter(HasilPengujian.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")

    # VALIDASI HAK AKSES
    # Hanya Admin ATAU (Kepala Dapur di dapur yang sama) yang boleh approve
    is_admin = current_user.role == UserRole.admin.value
    is_kepala_dapur = (current_user.role == UserRole.kepala_dapur.value) and (current_user.dapur_id == item.dapur_id)

    if not (is_admin or is_kepala_dapur):
        raise HTTPException(status_code=403, detail="Anda tidak memiliki wewenang untuk approval ini")

    item.status_approval = approval_data.status
    item.approved_by = current_user.full_name
    item.catatan = approval_data.catatan
    
    db.commit()
    db.refresh(item)
    return item

@app.delete("/pengujian/{id}")
def delete_pengujian(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(HasilPengujian).filter(HasilPengujian.id == id).first()
    if not item: raise HTTPException(404, "Not found")
    
    # User hanya bisa hapus punya sendiri (jika belum diapprove) atau Admin hapus bebas
    if current_user.role != UserRole.admin.value:
        if item.user_id != current_user.id:
            raise HTTPException(403, "Forbidden")
        if item.status_approval == "approved":
            raise HTTPException(400, "Data yang sudah disetujui tidak dapat dihapus")

    db.delete(item)
    db.commit()
    return {"message": "Deleted"}

# ======================= ENDPOINTS DAPUR & USER =======================
@app.post("/dapurs/", response_model=DapurResponse)
def create_dapur(dapur: DapurCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    new_dapur = Dapur(**dapur.dict())
    db.add(new_dapur)
    db.commit()
    db.refresh(new_dapur)
    return new_dapur

@app.get("/dapurs/", response_model=List[DapurResponse])
def get_dapurs(db: Session = Depends(get_db)):
    return db.query(Dapur).all()

# [BARU] GET DETAIL DAPUR UNTUK DASHBOARD
@app.get("/dapurs/{dapur_id}/detail", response_model=DapurResponse)
def get_dapur_detail(dapur_id: int, db: Session = Depends(get_db)):
    dapur = db.query(Dapur).filter(Dapur.id == dapur_id).first()
    if not dapur:
        raise HTTPException(status_code=404, detail="Dapur not found")
    
    # Ambil Users di dapur ini
    users_dapur = db.query(User).filter(User.dapur_id == dapur_id).all()
    
    # Filter Nama berdasarkan Role
    kepala_dapur = next((u.full_name for u in users_dapur if u.role == UserRole.kepala_dapur.value), "-")
    kepala_chef = next((u.full_name for u in users_dapur if u.role == UserRole.kepala_chef.value), "-")
    petugas_list = [u.full_name for u in users_dapur if u.role == UserRole.petugas_monitoring.value]

    # Return manual mapping karena Pydantic model DapurResponse sudah kita siapkan field tambahannya
    return {
        "id": dapur.id,
        "nama_dapur": dapur.nama_dapur,
        "nomor_dapur": dapur.nomor_dapur,
        "lokasi": dapur.lokasi,
        "kepala_dapur_nama": kepala_dapur,
        "kepala_chef_nama": kepala_chef,
        "petugas_monitoring_names": petugas_list
    }

@app.delete("/dapurs/{dapur_id}")
def delete_dapur(dapur_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    dapur = db.query(Dapur).filter(Dapur.id == dapur_id).first()
    if not dapur: raise HTTPException(404, "Not found")
    db.delete(dapur)
    db.commit()
    return {"message": "Deleted"}

@app.post("/users/", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    
    hashed_pw = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_pw,
        role=user.role,
        dapur_id=user.dapur_id,
        # Logic otomatis: jika role kepala_dapur, set flag True (optional)
        is_kepala_dapur=(user.role == UserRole.kepala_dapur.value)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.get("/users/", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    return db.query(User).all()

@app.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int, 
    user_update: UserUpdate, 
    db: Session = Depends(get_db), 
    admin: User = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")

    if user_update.full_name: user.full_name = user_update.full_name
    if user_update.email: user.email = user_update.email
    
    if user_update.role: 
        user.role = user_update.role
        # Update flag legacy juga
        user.is_kepala_dapur = (user_update.role == UserRole.kepala_dapur.value)

    if user_update.dapur_id is not None: user.dapur_id = user_update.dapur_id
    if user_update.password: user.hashed_password = get_password_hash(user_update.password)

    db.commit()
    db.refresh(user)
    return user

@app.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}

@app.get("/dapurs/{dapur_id}/detail", response_model=DapurDetailResponse)
def get_dapur_detail(
    dapur_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    dapur = db.query(Dapur).filter(Dapur.id == dapur_id).first()
    if not dapur:
        raise HTTPException(status_code=404, detail="Dapur not found")
    
    # Ambil list user di dapur ini
    users = dapur.users
    
    # Filter nama berdasarkan role
    kepala_dapur = next((u.full_name for u in users if u.role == UserRole.kepala_dapur.value), "-")
    kepala_chef = next((u.full_name for u in users if u.role == UserRole.kepala_chef.value), "-")
    petugas_list = [u.full_name for u in users if u.role == UserRole.petugas_monitoring.value]
    
    return {
        "id": dapur.id,
        "nama_dapur": dapur.nama_dapur,
        "nomor_dapur": dapur.nomor_dapur,
        "lokasi": dapur.lokasi,
        "kepala_dapur_nama": kepala_dapur or "-",
        "kepala_chef_nama": kepala_chef or "-",
        "petugas_monitoring_names": petugas_list
    }

