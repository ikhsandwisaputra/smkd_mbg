import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckCircle, XCircle, Clock, MapPin, Search, 
  ShieldCheck, AlertTriangle, Filter, User, TestTube 
} from 'lucide-react';
import { 
  getPengujianList, getKitchens, updateApprovalService,
  type PengujianResult, type Kitchen, type UserProfile 
} from '../api';

interface ApprovalManagerProps {
  user: UserProfile | null;
  onDataChange: () => void;
}

export const ApprovalManager: React.FC<ApprovalManagerProps> = ({ user, onDataChange }) => {
  const [data, setData] = useState<PengujianResult[]>([]);
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  // Filter Admin
  const [selectedDapurId, setSelectedDapurId] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pengujianRes, dapurRes] = await Promise.all([getPengujianList(), getKitchens()]);
      // Sort: Yang butuh tindakan (pending) ditaruh paling atas
      setData(pengujianRes.sort((a, b) => b.id - a.id));
      setKitchens(dapurRes);
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleAction = async (id: number, action: 'approved' | 'rejected') => {
    // Validasi sederhana
    const item = data.find(d => d.id === id);
    if (!item) return;
    
    const confirmMsg = action === 'approved' 
      ? `Setujui sampel '${item.nama_sampel}'?` 
      : `Tolak sampel '${item.nama_sampel}'?`;
      
    if (!window.confirm(confirmMsg)) return;

    try {
        await updateApprovalService(id, action);
        await loadData();
        onDataChange(); 
    } catch (error) { alert("Gagal update status."); }
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      // 1. FILTER TEXT (Sampel, Parameter, Petugas)
      const query = search.toLowerCase();
      const matchSearch = 
        item.nama_sampel.toLowerCase().includes(query) ||
        item.parameter_uji.toLowerCase().includes(query) ||
        item.nama_petugas.toLowerCase().includes(query);
      
      // 2. FILTER DAPUR (Logic: Admin bisa pilih, User terkunci di dapurnya)
      let matchDapur = true;
      if (user?.role === 'admin') {
          if (selectedDapurId) matchDapur = item.dapur_id === Number(selectedDapurId);
      } else if (user?.dapur_id) {
          matchDapur = item.dapur_id === user.dapur_id;
      }

      // 3. LOGIKA DATA HILANG/MUNCUL
      // Data HANYA hilang jika KETIGANYA sudah 'approved'.
      // Jika ada satu saja yang 'pending' atau 'rejected', data tetap MUNCUL.
      const isFullyApproved = 
          item.status_petugas === 'approved' && 
          item.status_chef === 'approved' && 
          item.status_kepala === 'approved';

      // Kita ingin menampilkan yang BELUM fully approved (Ongoing process)
      // Kecuali user ingin melihat history (bisa ditambahkan toggle nanti, tapi defaultnya ongoing)
      return matchSearch && matchDapur && !isFullyApproved;
    });
  }, [data, search, selectedDapurId, user]);

  // --- KOMPONEN KECIL UNTUK BADGE STATUS ---
  const StatusBadge = ({ role, status }: { role: string, status: string }) => {
     let bg = 'bg-gray-100 text-gray-400 border-gray-200';
     let icon = <Clock size={10} />;
     let text = 'Wait';

     if (status === 'approved') {
         bg = 'bg-green-100 text-green-700 border-green-200';
         icon = <CheckCircle size={10} />;
         text = 'OK';
     } else if (status === 'rejected') {
         bg = 'bg-red-100 text-red-600 border-red-200';
         icon = <XCircle size={10} />;
         text = 'Tolak';
     }

     return (
         <div className={`flex flex-col items-center justify-center px-2 py-1 rounded border ${bg} min-w-[50px]`}>
             <span className="text-[9px] font-bold uppercase mb-0.5">{role}</span>
             <div className="flex items-center gap-1 text-[10px] font-bold">
                 {icon} {text}
             </div>
         </div>
     );
  };

  return (
    <div className="space-y-6 animate-in fade-in">
        
        {/* --- HEADER & FILTER --- */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <ShieldCheck className="text-blue-600"/> Pusat Persetujuan
                </h2>
                <p className="text-xs text-gray-500">
                    Menampilkan data yang perlu konfirmasi berjenjang.
                </p>
            </div>
            
            <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Cari sampel / petugas..." 
                        className="pl-9 pr-3 py-2 text-sm border rounded-lg w-full md:w-64 focus:ring-1 focus:ring-blue-500 outline-none" 
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                    />
                </div>

                {/* Filter Dapur (Hanya Admin) */}
                {user?.role === 'admin' && (
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <select 
                            className="pl-9 pr-8 py-2 text-sm border rounded-lg appearance-none bg-white focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer hover:bg-gray-50"
                            value={selectedDapurId}
                            onChange={(e) => setSelectedDapurId(e.target.value)}
                        >
                            <option value="">Semua Unit Dapur</option>
                            {kitchens.map(k => (
                                <option key={k.id} value={k.id}>{k.nama_dapur}</option>
                            ))}
                        </select>
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={12} />
                    </div>
                )}
            </div>
        </div>

        {/* --- TABEL APPROVAL --- */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-gray-50 border-b text-gray-600 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">Waktu & Petugas</th>
                            {user?.role === 'admin' && <th className="p-4">Unit Dapur</th>}
                            <th className="p-4">Parameter Kimia</th>
                            <th className="p-4">Sampel</th>
                            <th className="p-4 text-center">Hasil Uji</th>
                            <th className="p-4 text-center">Status Organisasi</th>
                            <th className="p-4 text-center">Aksi Anda</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredData.length === 0 ? (
                            <tr><td colSpan={7} className="p-12 text-center text-gray-400 italic">
                                Tidak ada data yang menunggu persetujuan. <br/>Semua data selesai telah masuk ke tab "Data Pengujian".
                            </td></tr>
                        ) : filteredData.map((item) => {
                            // Logic Badge Hasil
                            const threshold = item.baku_mutu || 0;
                            const isBahaya = item.hasil_interpretasi > threshold;
                            
                            // Logic Aksi Tombol
                            // Tombol hanya muncul jika giliran user tersebut DAN statusnya masih pending
                            let canApprove = false;
                            let myStatus = 'pending';

                            if (user?.role === 'admin') {
                                // Admin bisa override semua, tapi kita cek apakah sudah full approved
                                canApprove = true; 
                            } else if (user?.role === 'petugas_monitoring') {
                                canApprove = item.status_petugas === 'pending';
                                myStatus = item.status_petugas;
                            } else if (user?.role === 'kepala_chef') {
                                canApprove = item.status_chef === 'pending';
                                myStatus = item.status_chef;
                            } else if (user?.role === 'kepala_dapur') {
                                canApprove = item.status_kepala === 'pending';
                                myStatus = item.status_kepala;
                            }

                            return (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    {/* KOLOM 1: Waktu & Petugas */}
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-700 text-xs flex items-center gap-1">
                                                <Clock size={10} className="text-gray-400"/> {item.tanggal}
                                            </span>
                                            <span className="text-[10px] text-gray-400 pl-3.5 mb-1">{item.jam}</span>
                                            
                                            <div className="flex items-center gap-1.5 mt-1 bg-blue-50 px-2 py-1 rounded-md w-max border border-blue-100">
                                                <User size={10} className="text-blue-500"/>
                                                <span className="text-[10px] font-bold text-blue-700 truncate max-w-[100px]" title={item.nama_petugas}>
                                                    {item.nama_petugas}
                                                </span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* KOLOM ADMIN: Nama Dapur */}
                                    {user?.role === 'admin' && (
                                        <td className="p-4 text-xs font-medium text-gray-600">
                                            {item.nama_dapur}
                                        </td>
                                    )}

                                    {/* KOLOM 2: Parameter */}
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                                <TestTube size={16}/>
                                            </div>
                                            <span className="font-bold text-gray-700 text-xs">{item.parameter_uji}</span>
                                        </div>
                                    </td>

                                    {/* KOLOM 3: Sampel */}
                                    <td className="p-4 font-medium text-gray-800 text-sm">
                                        {item.nama_sampel}
                                    </td>

                                    {/* KOLOM 4: Hasil & Status Kimia */}
                                    <td className="p-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="font-mono font-bold text-gray-800 text-sm">
                                                {item.hasil_interpretasi} mg/L
                                            </span>
                                            {isBahaya ? (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-full text-[10px] font-bold flex items-center gap-1">
                                                    <AlertTriangle size={8} className="fill-red-700 text-white"/> POSITIF
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded-full text-[10px] font-bold flex items-center gap-1">
                                                    <CheckCircle size={8} className="fill-green-700 text-white"/> NEGATIF
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    {/* KOLOM 5: Status Organisasi (3 Kotak) */}
                                    <td className="p-4">
                                        <div className="flex justify-center gap-2">
                                            <StatusBadge role="Petugas" status={item.status_petugas} />
                                            <StatusBadge role="Chef" status={item.status_chef} />
                                            <StatusBadge role="Kepala" status={item.status_kepala} />
                                        </div>
                                        <div className="text-center mt-2">
                                             {/* Keterangan Status Global */}
                                             {(item.status_petugas === 'rejected' || item.status_chef === 'rejected' || item.status_kepala === 'rejected') ? (
                                                 <span className="text-[10px] text-red-500 font-bold italic">Ditolak oleh salah satu pihak</span>
                                             ) : (
                                                 <span className="text-[10px] text-gray-400 italic">Menunggu persetujuan penuh</span>
                                             )}
                                        </div>
                                    </td>

                                    {/* KOLOM 6: Aksi */}
                                    <td className="p-4 text-center">
                                        {canApprove ? (
                                            <div className="flex flex-col gap-2">
                                                <button 
                                                    onClick={() => handleAction(item.id, 'approved')} 
                                                    className="w-full px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1"
                                                >
                                                    <CheckCircle size={12}/> SETUJU
                                                </button>
                                                <button 
                                                    onClick={() => handleAction(item.id, 'rejected')} 
                                                    className="w-full px-3 py-1.5 bg-white text-red-600 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-50 transition-all active:scale-95 flex items-center justify-center gap-1"
                                                >
                                                    <XCircle size={12}/> TOLAK
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="bg-gray-50 border border-gray-100 p-2 rounded-lg text-center">
                                                <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">Status Anda</p>
                                                {myStatus === 'approved' && <span className="text-green-600 font-bold text-xs block">DISETUJUI</span>}
                                                {myStatus === 'rejected' && <span className="text-red-600 font-bold text-xs block">DITOLAK</span>}
                                                {myStatus === 'pending' && <span className="text-gray-400 font-bold text-xs block">MENUNGGU</span>}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};