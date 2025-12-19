import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit, Search, Save, ArrowLeft, RefreshCw, Loader2, ChevronLeft, ChevronRight, MapPin, UserCog } from 'lucide-react';
import { 
  getUsers, getKitchens, createUser, updateUser, deleteUser,
  type UserProfile, type Kitchen, type UserPayload 
} from '../api';
import { Modal } from './Modal';
import { addLog } from '../history';

export const UserManager: React.FC = () => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [kitchenList, setKitchenList] = useState<Kitchen[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Form State
  const [formData, setFormData] = useState<Partial<UserPayload>>({});
  const [editingId, setEditingId] = useState<number | null>(null);

  // Modal State
  const [modalType, setModalType] = useState<'none' | 'delete'>('none');
  const [targetItem, setTargetItem] = useState<UserProfile | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
        const [usersRes, kitchensRes] = await Promise.all([getUsers(), getKitchens()]);
        setUsers(usersRes);
        setKitchenList(kitchensRes);
    } catch (error) { 
        console.error("Error loading data", error); 
    } finally { 
        setIsLoading(false); 
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.full_name || !formData.role) return alert("Data wajib diisi!");
    
    // Validasi: Jika bukan admin, wajib pilih dapur
    if (formData.role !== 'admin' && !formData.dapur_id) {
        return alert("Role selain Admin wajib memilih penugasan Dapur.");
    }

    try {
        const payload: UserPayload = {
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
            dapur_id: formData.role !== 'admin' && formData.dapur_id ? Number(formData.dapur_id) : null,
            ...(formData.password ? { password: formData.password } : {})
        };

        if (editingId) {
            await updateUser(editingId, payload);
            addLog('UPDATE', 'USER', `Update user: ${formData.full_name}`);
        } else {
            if (!payload.password) return alert("Password wajib untuk user baru");
            await createUser(payload);
            addLog('CREATE', 'USER', `Create user: ${formData.full_name}`);
        }
        await loadData();
        setView('list');
    } catch (error: any) {
        alert("Gagal menyimpan data user.");
    }
  };

  const handleDelete = async () => {
     if(targetItem) {
        try { 
            await deleteUser(targetItem.id); 
            addLog('DELETE', 'USER', `Hapus user: ${targetItem.full_name}`); 
            await loadData(); 
            setModalType('none'); 
        } catch (error) { alert("Gagal menghapus user."); }
     }
  };

  const openCreate = () => {
      setFormData({ email: '', full_name: '', role: 'petugas_monitoring', password: '', dapur_id: undefined });
      setEditingId(null); setView('form');
  };

  const openEdit = (u: UserProfile) => {
      setFormData({ 
          email: u.email, full_name: u.full_name, role: u.role, 
          dapur_id: u.dapur_id, password: '' 
      });
      setEditingId(u.id); setView('form');
  };

  const filteredData = useMemo(() => users.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) || 
    u.role.toLowerCase().includes(search.toLowerCase())
  ), [users, search]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-in fade-in">
       {/* HEADER */}
       <div className="flex justify-between items-center mb-6">
         <h2 className="text-xl font-bold text-gray-800">{view === 'list' ? 'Daftar Pengguna' : (editingId ? 'Edit User' : 'Tambah User')}</h2>
         {view === 'list' ? (
            <div className="flex gap-2">
                <button onClick={loadData} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">{isLoading ? <Loader2 className="animate-spin"/> : <RefreshCw size={18}/>}</button>
                <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex gap-2 items-center"><Plus size={16}/> Tambah</button>
            </div>
         ) : (
            <button onClick={() => setView('list')} className="text-gray-500 flex gap-2 items-center"><ArrowLeft size={16}/> Kembali</button>
         )}
       </div>

       {view === 'list' ? (
         <>
           <div className="mb-4 relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input type="text" placeholder="Cari user..." className="w-full pl-10 pr-4 py-2 border rounded-lg" value={search} onChange={e => setSearch(e.target.value)} />
           </div>

           <div className="w-full overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="p-4 w-12 text-center">No</th>
                            <th className="p-4">Nama & Email</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Unit Dapur</th>
                            <th className="p-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginatedData.map((item, index) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                            <td className="p-4 text-center text-gray-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                            <td className="p-4">
                                <div className="font-bold text-gray-800">{item.full_name}</div>
                                <div className="text-xs text-gray-500">{item.email}</div>
                            </td>
                            <td className="p-4">
                                <span className="px-2 py-1 bg-gray-100 rounded border border-gray-200 text-xs font-bold uppercase text-gray-600">
                                    {item.role.replace('_', ' ')}
                                </span>
                            </td>
                            <td className="p-4">
                                {item.role === 'admin' ? <span className="text-gray-400 text-xs italic">Semua Unit</span> : 
                                 item.dapur ? <div className="flex items-center gap-1"><MapPin size={14} className="text-blue-500"/> {item.dapur.nama_dapur}</div> : 
                                 <span className="text-red-400 text-xs italic">Belum Set</span>}
                            </td>
                            <td className="p-4 flex justify-center gap-2">
                                <button onClick={() => openEdit(item)} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded"><Edit size={16}/></button>
                                <button onClick={() => { setTargetItem(item); setModalType('delete'); }} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                </table>
           </div>
         </>
       ) : (
         <form onSubmit={handleSave} className="max-w-xl mx-auto space-y-4 pt-4">
            <div><label className="block text-sm font-bold mb-1">Nama Lengkap</label><input required className="w-full p-2.5 border rounded-lg" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} /></div>
            <div><label className="block text-sm font-bold mb-1">Email</label><input required type="email" className="w-full p-2.5 border rounded-lg" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
            <div><label className="block text-sm font-bold mb-1">Password</label><input type="password" className="w-full p-2.5 border rounded-lg" placeholder={editingId ? "Isi jika ingin ubah" : "Wajib isi"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div>
            
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Role & Penugasan</label>
                <select className="w-full p-2.5 border rounded-lg mb-3" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="petugas_monitoring">Petugas Monitoring</option>
                    <option value="kepala_dapur">Kepala Dapur</option>
                    <option value="kepala_chef">Kepala Chef</option>
                    <option value="admin">Administrator</option>
                </select>

                {formData.role !== 'admin' && (
                    <select required className="w-full p-2.5 border border-blue-200 bg-blue-50 rounded-lg" value={formData.dapur_id || ''} onChange={e => setFormData({...formData, dapur_id: Number(e.target.value)})}>
                        <option value="">-- Pilih Lokasi Dapur --</option>
                        {kitchenList.map(k => <option key={k.id} value={k.id}>{k.nama_dapur} ({k.nomor_dapur})</option>)}
                    </select>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setView('list')} className="px-4 py-2 text-gray-600">Batal</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">Simpan</button>
            </div>
         </form>
       )}
       
       <Modal isOpen={modalType === 'delete'} onClose={() => setModalType('none')} title="Hapus User" variant="danger">
            <p>Hapus user <b>{targetItem?.full_name}</b>?</p>
            <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setModalType('none')} className="px-4 py-2 bg-gray-100 rounded">Batal</button>
                <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded">Hapus</button>
            </div>
       </Modal>
    </div>
  );
};