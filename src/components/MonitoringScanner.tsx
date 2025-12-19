import React, { useState, useRef, useEffect } from 'react';
import Cropper, { type ReactCropperElement } from 'react-cropper';
import "cropperjs/dist/cropper.css";
import { 
  Camera, Image as ImageIcon, FlaskConical, ScanLine, RotateCcw, 
  AlertTriangle, CheckCircle, Info, Calendar, Clock, Activity, 
  ChevronRight, X, Crop, Save, Loader2, MapPin, Edit, ArrowLeft,
  ShieldAlert, ShieldCheck
} from 'lucide-react';
import { 
  scanImageService, 
  savePengujianService, 
  updatePengujianService, 
  getKitchens, 
  type ScanResult, 
  type UserProfile, 
  type Kitchen,
  type PengujianResult 
} from '../api';
import { AlertToast, useAlert } from './AlertToast';

const STANDARD_LIMITS: Record<string, string> = {
  'BORAX': '0 mg/L (Negatif)',
  'FORMALIN': '0 mg/L (Negatif)',
  'NITRAT': '50 mg/L',
  'MERKURI': '0.001 mg/L',
  'PESTISIDA': '0 mg/L (Residu Minimum)',
};

// Database referensi HSV dari backend (FULL DATA DIKEMBALIKAN)
const HSV_DATABASE: Record<string, Array<{label: string; ppm: number | string; hsv: [number, number, number]; bahaya: boolean}>> = {
  "BORAX": [
    {'label': 'Negatif (Aman)', 'ppm': 0,      'hsv': [58.3, 79, 85], 'bahaya': false},
    {'label': 'Positif Rendah', 'ppm': 50,     'hsv': [41.8, 77, 86], 'bahaya': true},
    {'label': 'Positif Sedang', 'ppm': 100,    'hsv': [36.4, 75, 85], 'bahaya': true},
    {'label': 'Positif',        'ppm': 150,    'hsv': [22.0, 72, 82], 'bahaya': true},
    {'label': 'Positif',        'ppm': 200,    'hsv': [21.6, 71, 83], 'bahaya': true},
    {'label': 'Bahaya Tinggi',  'ppm': 5000,   'hsv': [1.2, 73, 77],  'bahaya': true},
    {'label': 'Sangat Bahaya',  'ppm': 10000,  'hsv': [355.2, 81, 73],'bahaya': true},
    {'label': 'Sangat Bahaya',  'ppm': 12000,  'hsv': [356.4, 81, 73],'bahaya': true}
  ],
  "FORMALIN": [
    {'label': 'Negatif',   'ppm': 0,   'hsv': [0, 0, 100],     'bahaya': false},
    {'label': 'Rendah',    'ppm': 10,  'hsv': [329, 19, 79],   'bahaya': true},
    {'label': 'Sedang',    'ppm': 25,  'hsv': [309.2, 38, 59], 'bahaya': true},
    {'label': 'Bahaya',    'ppm': 50,  'hsv': [313.9, 49, 55], 'bahaya': true},
    {'label': 'Bahaya',    'ppm': 100, 'hsv': [311.1, 53, 51], 'bahaya': true},
    {'label': 'Sangat Bahaya', 'ppm': 200, 'hsv': [328, 33, 18], 'bahaya': true}
  ],
  "NITRAT": [
    {'label': 'Negatif',   'ppm': 0,   'hsv': [0, 0, 100],     'bahaya': false},
    {'label': 'Rendah',    'ppm': 5,   'hsv': [55.5, 35, 89],  'bahaya': false},
    {'label': 'Rendah',    'ppm': 10,  'hsv': [57.3, 77, 90],  'bahaya': false},
    {'label': 'Sedang',    'ppm': 20,  'hsv': [55.6, 100, 91], 'bahaya': true},
    {'label': 'Sedang',    'ppm': 40,  'hsv': [52, 100, 91],   'bahaya': true},
    {'label': 'Tinggi',    'ppm': 80,  'hsv': [44, 100, 90],   'bahaya': true},
    {'label': 'Sangat Tinggi', 'ppm': 160, 'hsv': [30.8, 95, 160], 'bahaya': true},
    {'label': 'Bahaya',    'ppm': 200, 'hsv': [23, 94, 89],    'bahaya': true},
    {'label': 'Sangat Bahaya', 'ppm': 250, 'hsv': [16.9, 96, 87],  'bahaya': true}
  ],
  "MERKURI": [
    {'label': 'Non-detect (Aman)',     'ppm': 0,    'hsv': [330, 1, 94],   'bahaya': false},
    {'label': 'Trace (Mungkin Aman)',  'ppm': 0.1,  'hsv': [274.3, 6, 93], 'bahaya': false},
    {'label': 'Borderline Positive',   'ppm': 0.5,  'hsv': [297.1, 9, 89], 'bahaya': true},
    {'label': 'Low-Moderate',          'ppm': 1,    'hsv': [280, 11, 88],  'bahaya': true},
    {'label': 'Moderate',              'ppm': 2,    'hsv': [289.4, 16, 82],'bahaya': true},
    {'label': 'High (Perlu Tindakan)', 'ppm': 5,    'hsv': [290.7, 23, 78],'bahaya': true}
  ],
  "PESTISIDA": [
    {'label': 'High (Bahaya)',    'ppm': 'High',     'hsv': [358.3, 88, 93], 'bahaya': true},
    {'label': 'Medium (Waspada)', 'ppm': 'Medium',   'hsv': [57.1, 92, 96],  'bahaya': true},
    {'label': 'Low',              'ppm': 'Low',      'hsv': [216.4, 90, 53], 'bahaya': false},
    {'label': 'Very Low (Aman)',  'ppm': 'Very Low', 'hsv': [143.1, 85, 56], 'bahaya': false}
  ]
};

interface ScannerProps {
  user: UserProfile | null;
  editData?: PengujianResult | null;
  onCancelEdit?: () => void;
}

export const MonitoringScanner: React.FC<ScannerProps> = ({ user, editData, onCancelEdit }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [kitchenList, setKitchenList] = useState<Kitchen[]>([]);
  
  const [jenisUji, setJenisUji] = useState<string>('');
  const [selectedDapurId, setSelectedDapurId] = useState<number | string>('');
  
  const { alerts, removeAlert, success, error, warning, info } = useAlert();
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':'),
    namaBahan: '',
    hasilInterpretasi: '',
    bakuMutu: '',
    statusBahaya: false 
  });

  const cropperRef = useRef<ReactCropperElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const CHEMICAL_LIST = [
    { value: 'BORAX', label: '🧪 Borax' },
    { value: 'FORMALIN', label: '☠️ Formalin' },
    { value: 'NITRAT', label: '💧 Nitrat' },
    { value: 'MERKURI', label: '🌡️ Merkuri' },
    { value: 'PESTISIDA', label: '🍃 Pestisida' },
  ];

  // 1. INIT DATA & LOGIC FILTER DAPUR
  useEffect(() => {
    const initData = async () => {
        if (!user) return; 

        try {
            const allKitchens = await getKitchens();
            let finalKitchens = allKitchens;
            let targetId = '';

            // SKENARIO 1: MODE EDIT
            if (editData) {
                targetId = editData.dapur_id.toString();
                setJenisUji(editData.parameter_uji);
                
                const isBahaya = editData.hasil_interpretasi > editData.baku_mutu && editData.baku_mutu > 0;
                setFormData({
                    date: editData.tanggal,
                    time: editData.jam, 
                    namaBahan: editData.nama_sampel,
                    hasilInterpretasi: editData.hasil_interpretasi.toString() + " mg/L",
                    bakuMutu: editData.baku_mutu.toString(),
                    statusBahaya: isBahaya
                });
                setResult(null);
                setImageSrc(null);
            } 
            // SKENARIO 2: MODE BARU (Non-Admin punya dapur_id)
            else if (user.role !== 'admin' && user.dapur_id) {
                // Filter list hanya dapur milik user
                finalKitchens = allKitchens.filter(k => k.id === user.dapur_id);
                
                // AUTO SELECT: Jika cuma ada 1 dapur, langsung pilih!
                if (finalKitchens.length > 0) {
                    targetId = finalKitchens[0].id.toString();
                }
            }
            // SKENARIO 3: ADMIN (Bebas pilih, tidak auto select kecuali cuma ada 1 dapur)
            else if (allKitchens.length === 1) {
                targetId = allKitchens[0].id.toString();
            }

            setKitchenList(finalKitchens);
            if (targetId) {
                setSelectedDapurId(targetId);
            }

        } catch (error) {
            console.error("Gagal inisialisasi data scanner", error);
        }
    };
    initData();
  }, [user, editData]);

  // Auto-fill Baku Mutu
  useEffect(() => {
    if (jenisUji) {
      setFormData(prev => ({ ...prev, bakuMutu: STANDARD_LIMITS[jenisUji] || '-' }));
    }
  }, [jenisUji]);

  // Auto-fill Hasil & Status
  useEffect(() => {
    if (result) {
      const nilai = typeof result.hasil_analisa.estimasi_ppm === 'number' 
        ? `${result.hasil_analisa.estimasi_ppm} mg/L` 
        : result.hasil_analisa.estimasi_ppm.toString();
        
      setFormData(prev => ({ 
          ...prev, 
          hasilInterpretasi: nilai,
          statusBahaya: result.hasil_analisa.bahaya 
      }));
    }
  }, [result]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setResult(null);
        setFormData(prev => ({ ...prev, hasilInterpretasi: '', statusBahaya: false }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = () => {
    // Validasi Diperketat
    if (!selectedDapurId) return error("Dapur Tidak Dipilih", "Mohon pilih lokasi dapur untuk pengujian");
    if (!jenisUji) return error("Parameter Uji Kosong", "Silakan pilih jenis zat yang akan diuji");
    if (!formData.namaBahan) return error("Nama Sampel Diperlukan", "Masukkan nama atau deskripsi sampel");
    
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    setLoading(true);
    cropper.getCroppedCanvas().toBlob(async (blob) => {
      if (blob) {
        try {
          const data = await scanImageService(blob, jenisUji);
          setResult(data);
        } catch (err) {
          error("Analisa Gagal", "Terjadi kesalahan saat menganalisa gambar.");
        } finally {
          setLoading(false);
        }
      }
    }, 'image/jpeg');
  };

  const extractNumber = (str: string): number => {
    const match = str.match(/[\d\.]+/);
    return match ? parseFloat(match[0]) : 0;
  };

  // Fungsi untuk menghitung jarak HSV (DIKEMBALIKAN UNTUK RENDER INFO)
  const findClosestHSVReference = (detectedHSV: {H: number; S: number; V: number}, chemicalType: string) => {
    const database = HSV_DATABASE[chemicalType];
    if (!database) return null;

    let closestMatch = database[0];
    let minDistance = Infinity;

    database.forEach(ref => {
      const hDiff = Math.min(Math.abs(detectedHSV.H - ref.hsv[0]), 360 - Math.abs(detectedHSV.H - ref.hsv[0]));
      const sDiff = Math.abs(detectedHSV.S - ref.hsv[1]);
      const vDiff = Math.abs(detectedHSV.V - ref.hsv[2]);
      
      const distance = hDiff * 1.5 + sDiff * 0.8 + vDiff * 0.8;
      
      if (distance < minDistance) {
        minDistance = distance;
        closestMatch = ref;
      }
    });

    return { match: closestMatch, distance: minDistance };
  };

  const handleSaveToDB = async () => {
    setIsSaving(true);
    try {
      if (editData) {
          if (!formData.namaBahan) return error("Nama Sampel Kosong", "Nama sampel harus diisi sebelum menyimpan");
          await updatePengujianService(editData.id, formData.namaBahan);
          success("Perbaruan Berhasil", `Sampel '${formData.namaBahan}' telah diperbarui`);
          if (onCancelEdit) onCancelEdit();
      } else {
          if (!result || !selectedDapurId) return;
          const payload = {
            parameter_uji: jenisUji,
            tanggal: formData.date,
            jam: formData.time + (formData.time.length === 5 ? ":00" : ""),
            nama_sampel: formData.namaBahan,
            baku_mutu: extractNumber(formData.bakuMutu),
            hasil_interpretasi: extractNumber(formData.hasilInterpretasi),
            dapur_id: Number(selectedDapurId)
          };
          await savePengujianService(payload);
          success("Penyimpanan Berhasil", `Data sampel '${formData.namaBahan}' telah disimpan`);
          resetScan(); 
      }
    } catch (err) {
      error("Penyimpanan Gagal", "Terjadi kesalahan saat menyimpan data.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReCrop = () => {
    setResult(null); 
    setFormData(prev => ({ ...prev, hasilInterpretasi: '', statusBahaya: false })); 
  };

  const resetScan = () => {
    setImageSrc(null);
    setResult(null);
    if (!editData) {
        setJenisUji('');
        setFormData({
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':'),
            namaBahan: '',
            hasilInterpretasi: '',
            bakuMutu: '',
            statusBahaya: false
        });
        
        if (user?.role === 'admin') {
            setSelectedDapurId('');
        }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500 pb-10">
      <AlertToast alerts={alerts} onRemove={removeAlert} />
      
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
          {editData ? "Edit Data Pengujian" : ""}
        </h2>
        {editData && (
            <p className="text-xs text-orange-600 font-bold mt-1 bg-orange-50 inline-block px-3 py-1 rounded-full border border-orange-200">
                Mode Edit: Hanya Nama Sampel yang dapat diubah
            </p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden flex flex-col lg:flex-row min-h-[500px]">
        
        {/* --- PANEL KIRI: FORM --- */}
        <div className="w-full lg:w-5/12 p-6 border-b lg:border-b-0 lg:border-r border-gray-100 bg-white flex flex-col justify-between">
           <div className="space-y-4">
              
             {/* DROPDOWN LOKASI DAPUR (FILTERED & AUTO SELECT) */}
              <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block flex items-center gap-1">
                    <MapPin size={12}/> Lokasi Dapur
                  </label>
                  <select 
                      value={selectedDapurId} 
                      onChange={(e) => setSelectedDapurId(e.target.value)}
                      // PERBAIKAN: Gunakan (user?.role !== 'admin') sebagai pengganti is_kepala_dapur
                      disabled={!!editData || (user?.role !== 'admin' && kitchenList.length === 1)} 
                      className={`w-full p-2.5 border rounded-lg text-sm font-semibold outline-none ${
                        (!!editData || (user?.role !== 'admin' && kitchenList.length === 1))
                        ? 'bg-gray-100 text-gray-600 border-gray-200 cursor-not-allowed' 
                        : 'bg-white border-gray-300 focus:ring-2 focus:ring-blue-500'
                      }`}
                  >
                      {/* Tampilkan Placeholder hanya jika Admin (list banyak) dan belum pilih */}
                      {kitchenList.length > 1 && <option value="">-- Pilih Lokasi Dapur --</option>}
                      
                      {kitchenList.map(k => (
                          <option key={k.id} value={k.id}>{k.nama_dapur} ({k.nomor_dapur})</option>
                      ))}
                  </select>
                  
                  {/* Feedback UI: Tampilkan pesan untuk user non-admin */}
                  {user?.role !== 'admin' && kitchenList.length === 1 && (
                      <p className="text-[10px] text-green-600 mt-1 font-medium flex items-center gap-1">
                        <CheckCircle size={10}/> Dapur Anda terpilih otomatis.
                      </p>
                  )}
              </div>

              <hr className="border-gray-100"/>

            <div>
  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
    Parameter Uji
  </label>

  <select 
    value={jenisUji} 
    disabled={!!editData}
    onChange={(e) => setJenisUji(e.target.value)}
    className={`w-full p-2.5 border rounded-lg text-sm font-semibold outline-none ${
      editData 
        ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
        : 'bg-white border-gray-300'
    }`}
  >
    <option value="" disabled>-- Pilih Zat --</option>
    {CHEMICAL_LIST.map(chem => (
      <option key={chem.value} value={chem.value}>
        {chem.label}
      </option>
    ))}
  </select>

  {/* Keterangan Informasi */}
  <p className="mt-2 text-xs text-gray-500 leading-relaxed">
    <span className="font-semibold text-gray-600">
      Catatan:
    </span>{' '}
    Parameter <span className="font-semibold">Mikrobiologi</span> saat ini
    belum tersedia dan akan segera ditambahkan
    <span className="italic"> (coming soon)</span>, meliputi:
    <span className="block ml-4 mt-1">
      • <span className="font-medium">E. coli</span><br />
      • <span className="font-medium">Coliform</span><br />
      • <span className="font-medium">Salmonella</span>
    </span>
  </p>
</div>


              <div className="grid grid-cols-2 gap-3">
                  <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Tanggal</label>
                      <div className="relative">
                          <input type="date" 
                              className={`w-full p-2 text-xs border rounded font-medium ${editData ? 'bg-gray-100 text-gray-500' : 'bg-gray-50'}`}
                              readOnly={!!editData}
                              value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} />
                      </div>
                  </div>
                  <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Jam</label>
                      <input type="time" 
                          className={`w-full p-2 text-xs border rounded font-medium ${editData ? 'bg-gray-100 text-gray-500' : 'bg-gray-50'}`}
                          readOnly={!!editData}
                          value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} />
                  </div>
              </div>

              <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">
                    Sampel {editData && <span className="text-blue-600">(Dapat Diedit)</span>}
                  </label>
                  <input type="text" placeholder="Contoh: Bakso, Tahu..." 
                      className={`w-full p-2 text-sm border rounded focus:ring-1 focus:ring-blue-500 outline-none font-medium ${
                        editData ? 'bg-white border-blue-300 ring-2 ring-blue-50' : ''
                      }`}
                      value={formData.namaBahan} onChange={(e) => setFormData({...formData, namaBahan: e.target.value})} />
              </div>
              
              <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">
                    Baku Mutu {!editData && <span className="text-gray-400">(Manual Edit OK)</span>}
                  </label>
                  <input type="text" 
                      className={`w-full p-2 text-xs border rounded font-medium outline-none ${
                        editData ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-300 focus:ring-1 focus:ring-blue-500'
                      }`}
                      readOnly={!!editData}
                      value={formData.bakuMutu} 
                      onChange={(e) => {
                          const newBaku = e.target.value;
                          const hasil = extractNumber(formData.hasilInterpretasi);
                          const baku = extractNumber(newBaku);
                          const isBahaya = baku === 0 ? hasil > 0 : hasil > baku;
                          setFormData({...formData, bakuMutu: newBaku, statusBahaya: isBahaya});
                      }}
                      placeholder="Contoh: 50 mg/L" />
              </div>

              {/* KOLOM HASIL & STATUS BADGE */}
              <div className="pt-2 border-t border-dashed border-gray-200">
                   <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-blue-600 block flex items-center gap-1">
                            <Activity size={12}/> Hasil Interpretasi
                        </label>
                        
                        {formData.hasilInterpretasi && (
                            formData.statusBahaya ? (
                                <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-200 flex items-center gap-1">
                                    <ShieldAlert size={10}/> POSITIF
                                </span>
                            ) : (
                                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold border border-green-200 flex items-center gap-1">
                                    <ShieldCheck size={10}/> NEGATIF
                                </span>
                            )
                        )}
                   </div>
                   
                   {!result && !formData.hasilInterpretasi && (
                       <div className="w-full p-3 text-xs text-gray-400 italic border border-dashed rounded-lg bg-gray-50">
                           Hasil scan akan muncul di sini setelah analisa
                       </div>
                   )}
                   
                   {(result || formData.hasilInterpretasi) && (
                       <>
                           <input type="text"
                               className={`w-full p-3 text-sm font-bold border rounded-lg outline-none focus:ring-1 ${
                                   editData ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white border-blue-300 focus:ring-blue-500'
                               }`}
                               readOnly={!!editData}
                               value={formData.hasilInterpretasi}
                               onChange={(e) => {
                                   const newValue = e.target.value;
                                   const hasil = extractNumber(newValue);
                                   const baku = extractNumber(formData.bakuMutu);
                                   const isBahaya = baku === 0 ? hasil > 0 : hasil > baku;
                                   setFormData({...formData, hasilInterpretasi: newValue, statusBahaya: isBahaya});
                               }}
                               placeholder="Contoh: 25 mg/L" />
                           
                           {!editData && result && (
                               <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                                   <p className="text-[11px] text-blue-700 leading-relaxed">
                                       <span className="font-bold block mb-1">💡 Catatan Validasi:</span>
                                       Jika hasil scan di atas tidak sesuai, Anda dapat mengubah nilai hasil interpretasi secara manual. Status akan otomatis diperbaharui.
                                   </p>
                               </div>
                           )}
                       </>
                   )}
              </div>
           </div>
        </div>

        {/* --- PANEL KANAN --- */}
        <div className="w-full lg:w-7/12 bg-gray-50 relative flex flex-col items-center justify-center p-8">
            {editData ? (
                <div className="text-center w-full max-w-xs animate-in zoom-in-95">
                    <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                        <Edit size={36}/>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Mode Edit Data</h3>
                    <p className="text-sm text-gray-500 mb-6 bg-white p-3 rounded-lg border border-gray-200">
                        Hasil scan bersifat permanen untuk menjaga integritas data lab. Anda hanya diizinkan mengubah keterangan nama sampel.
                    </p>
                    <button onClick={handleSaveToDB} disabled={isSaving} className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mb-3 transform active:scale-95">
                         {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                         SIMPAN PERUBAHAN
                    </button>
                    <button onClick={onCancelEdit} className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                         <ArrowLeft size={16}/> BATAL
                    </button>
                </div>
            ) : (
                <>
                    {!imageSrc && !result && (
                        <div className="text-center">
                            <div className="bg-white p-4 rounded-full shadow-sm mb-4 inline-block">
                                <ScanLine size={32} className="text-blue-500 opacity-50"/>
                            </div>
                            <h3 className="text-gray-700 font-bold mb-2">Upload Strip Uji</h3>
                            <p className="text-gray-400 text-xs mb-6 max-w-xs mx-auto">Ambil foto tegak lurus dengan pencahayaan cukup.</p>
                             <div className="flex gap-3 justify-center mt-4">
                                <input type="file" ref={cameraInputRef} accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
                                <button onClick={() => cameraInputRef.current?.click()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow hover:bg-blue-700 flex items-center gap-2"><Camera size={16}/> Kamera</button>
                                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
                                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-100 flex items-center gap-2"><ImageIcon size={16}/> Galeri</button>
                            </div>
                        </div>
                    )}
                    
                    {imageSrc && !result && (
                         <div className="w-full h-full flex flex-col">
                            <div className="flex-1 relative bg-black rounded-lg overflow-hidden">
                                <Cropper ref={cropperRef} style={{ height: "400px", width: "100%" }} initialAspectRatio={1} src={imageSrc} viewMode={1} background={false} responsive={true} autoCropArea={0.6} guides={true} />
                                <button onClick={resetScan} className="absolute top-2 right-2 bg-white/20 p-2 rounded-full hover:bg-white/40 text-white backdrop-blur-sm"><X size={16}/></button>
                            </div>
                            <button onClick={handleScan} disabled={loading} className="w-full py-3 bg-blue-600 text-white font-bold mt-4 rounded-xl shadow-md flex items-center justify-center gap-2">
                                {loading ? 'Memproses...' : <>ANALISA SEKARANG <ChevronRight size={16}/></>}
                            </button>
                         </div>
                    )}

                    {result && (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-4 animate-in zoom-in-95">
                             {/* CARD HASIL UTAMA */}
                             <div className={`w-full rounded-xl p-6 shadow-lg border-2 ${result.hasil_analisa.bahaya ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                <div className="flex items-center justify-center gap-3 mb-4">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${result.hasil_analisa.bahaya ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        {result.hasil_analisa.bahaya ? <AlertTriangle size={28}/> : <CheckCircle size={28}/>}
                                    </div>
                                    <div className="text-left">
                                        <h2 className={`text-2xl font-black ${result.hasil_analisa.bahaya ? 'text-red-600' : 'text-green-600'}`}>
                                            {result.hasil_analisa.bahaya ? "POSITIF" : "NEGATIF"}
                                        </h2>
                                        <p className="text-xs text-gray-500 font-medium">{result.hasil_analisa.label}</p>
                                    </div>
                                </div>

                                {/* INFO DETAIL HASIL */}
                                <div className="space-y-3 bg-white p-4 rounded-lg">
                                    {/* PPM */}
                                    <div className="flex justify-between items-center border-b pb-2">
                                        <span className="text-xs font-semibold text-gray-600 uppercase">PPM/Konsentrasi</span>
                                        <span className="text-sm font-bold text-gray-800">
                                            {typeof result.hasil_analisa.estimasi_ppm === 'number' 
                                                ? `${result.hasil_analisa.estimasi_ppm} mg/L` 
                                                : result.hasil_analisa.estimasi_ppm}
                                        </span>
                                    </div>

                                    {/* DETEKSI WARNA HSV */}
                                    <div className="border-b pb-2">
                                        <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Nilai HSV Terdeteksi</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="bg-gradient-to-r from-red-50 to-red-100 p-2 rounded text-center">
                                                <p className="text-[10px] font-bold text-gray-600">H (Hue)</p>
                                                <p className="text-lg font-black text-red-600">{result.deteksi_warna.H.toFixed(1)}°</p>
                                            </div>
                                            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-2 rounded text-center">
                                                <p className="text-[10px] font-bold text-gray-600">S (Sat.)</p>
                                                <p className="text-lg font-black text-yellow-600">{result.deteksi_warna.S.toFixed(1)}%</p>
                                            </div>
                                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-2 rounded text-center">
                                                <p className="text-[10px] font-bold text-gray-600">V (Value)</p>
                                                <p className="text-lg font-black text-blue-600">{result.deteksi_warna.V.toFixed(1)}%</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* PERBANDINGAN DENGAN REFERENSI */}
                                    {(() => {
                                        const refData = findClosestHSVReference(result.deteksi_warna, result.info_zat);
                                        if (!refData) return null;
                                        
                                        return (
                                            <div className="border-b pb-2">
                                                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">🎯 Perbandingan dengan Referensi</p>
                                                <div className="bg-gray-50 p-2.5 rounded-lg">
                                                    <p className="text-[10px] text-gray-700 font-bold mb-2">
                                                        Dekat dengan: <span className="text-blue-600">{refData.match.label}</span>
                                                    </p>
                                                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                                                        <div className="border border-gray-300 p-1.5 rounded bg-white">
                                                            <p className="text-gray-500 font-semibold">H</p>
                                                            <p className="font-bold text-gray-700">{refData.match.hsv[0].toFixed(1)}°</p>
                                                            <p className="text-red-500 text-[9px] mt-0.5">Δ {Math.abs(result.deteksi_warna.H - refData.match.hsv[0]).toFixed(1)}°</p>
                                                        </div>
                                                        <div className="border border-gray-300 p-1.5 rounded bg-white">
                                                            <p className="text-gray-500 font-semibold">S</p>
                                                            <p className="font-bold text-gray-700">{refData.match.hsv[1].toFixed(1)}%</p>
                                                            <p className="text-yellow-500 text-[9px] mt-0.5">Δ {Math.abs(result.deteksi_warna.S - refData.match.hsv[1]).toFixed(1)}%</p>
                                                        </div>
                                                        <div className="border border-gray-300 p-1.5 rounded bg-white">
                                                            <p className="text-gray-500 font-semibold">V</p>
                                                            <p className="font-bold text-gray-700">{refData.match.hsv[2].toFixed(1)}%</p>
                                                            <p className="text-blue-500 text-[9px] mt-0.5">Δ {Math.abs(result.deteksi_warna.V - refData.match.hsv[2]).toFixed(1)}%</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* JARAK KECOCOKAN WARNA */}
                                    <div>
                                        <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Jarak Kecocokan Warna</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                                                <div 
                                                    className="bg-gradient-to-r from-green-500 to-blue-500 h-full transition-all"
                                                    style={{width: `${Math.min((100 - result.hasil_analisa.kemiripan_jarak * 5), 100)}%`}}
                                                />
                                            </div>
                                            <span className="text-sm font-bold text-gray-700 min-w-max">{result.hasil_analisa.kemiripan_jarak.toFixed(2)}</span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-1">
                                            {result.hasil_analisa.kemiripan_jarak < 5 ? '✓ Sangat cocok' : result.hasil_analisa.kemiripan_jarak < 10 ? '✓ Cocok' : '⚠ Perlu verifikasi'}
                                        </p>
                                    </div>
                                </div>
                             </div>

                             {/* TOMBOL AKSI */}
                             <div className="w-full space-y-2">
                                <button onClick={handleSaveToDB} disabled={isSaving} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors">
                                    {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                                    {isSaving ? "Menyimpan..." : "SIMPAN HASIL"}
                                </button>
                                
                                <div className="flex gap-2">
                                    <button onClick={handleReCrop} className="flex-1 py-2 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors">Atur Crop</button>
                                    <button onClick={resetScan} className="flex-1 py-2 bg-gray-800 text-white rounded-lg font-bold text-xs hover:bg-gray-900 transition-colors">Sampel Baru</button>
                                </div>
                             </div>
                        </div>
                    )}
                </>
            )}
        </div>
      </div>
    </div>
  );
};