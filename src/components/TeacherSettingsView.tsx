import React, { useState, useMemo } from 'react';
import { useTeMa } from '../context/TeMaContext';
import { Student, Industry, INDONESIAN_DAYS } from '../types';
import {
  Building2,
  Users,
  Plus,
  Trash2,
  Edit2,
  X,
  CheckCircle2,
  Search,
  MapPin,
  Clock,
  GraduationCap
} from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { playTap } from '../utils/sound';

export const TeacherSettingsView: React.FC = () => {
  const {
    state,
    saveIndustry,
    deleteIndustry,
    saveStudent,
    deleteStudent,
  } = useTeMa();

  // Subtabs: 1. DUDI, 2. SISWA (Menu JURUSAN digabung ke dalam isian SISWA)
  const [activeSubTab, setActiveSubTab] = useState<'industries' | 'students'>('industries');

  // Search & Filter state for Students (NO class filter, NO NIS filter!)
  const [studentSearch, setStudentSearch] = useState('');

  // Modals for Create / Edit
  const [editingStudent, setEditingStudent] = useState<Partial<Student> | null>(null);
  const [editingIndustry, setEditingIndustry] = useState<Partial<Industry> | null>(null);

  // Custom Delete Modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'student' | 'industry';
    id: string;
    name: string;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Delete confirmation handler
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'student') {
      await deleteStudent(deleteTarget.id);
      showToast(`Data siswa "${deleteTarget.name}" berhasil dihapus.`);
    } else if (deleteTarget.type === 'industry') {
      await deleteIndustry(deleteTarget.id);
      showToast(`Industri "${deleteTarget.name}" berhasil dihapus.`);
    }

    setDeleteTarget(null);
  };

  // Student Save (Nama Siswa, Kelas, Jurusan, DUDI - Semua HURUF KAPITAL)
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent?.name || !editingStudent?.className || !editingStudent?.industryId) {
      showToast('Harap lengkapi DUDI, Nama Siswa, dan Kelas!', 'info');
      return;
    }

    await saveStudent({
      id: editingStudent.id,
      name: editingStudent.name.trim().toUpperCase(),
      className: editingStudent.className.trim().toUpperCase(),
      departmentName: (editingStudent.departmentName || '').trim().toUpperCase(),
      industryId: editingStudent.industryId,
      status: editingStudent.status || 'Aktif',
    });
    setEditingStudent(null);
    showToast('Data siswa, kelas & jurusan berhasil disimpan!');
  };

  // Industry Save (Hilangkan Latitude & Longitude dari form input - Otomatis HURUF KAPITAL)
  const handleSaveIndustry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIndustry?.name || !editingIndustry?.concentration) return;

    await saveIndustry({
      id: editingIndustry.id,
      name: editingIndustry.name.trim().toUpperCase(),
      concentration: editingIndustry.concentration.trim().toUpperCase(),
      address: (editingIndustry.address || '').trim().toUpperCase(),
      owner: (editingIndustry.owner || '').trim().toUpperCase(),
      phone: (editingIndustry.phone || '').trim().toUpperCase(),
      activeDays: editingIndustry.activeDays && editingIndustry.activeDays.length > 0
        ? editingIndustry.activeDays
        : ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
      workHours: (editingIndustry.workHours || '08:00 - 16:00').trim().toUpperCase(),
      latitude: editingIndustry.latitude || -6.9175,
      longitude: editingIndustry.longitude || 107.6191,
      radiusMeter: editingIndustry.radiusMeter || 250,
    });
    setEditingIndustry(null);
    showToast('Data DUDI berhasil disimpan!');
  };

  // Filtered Students: NO CLASS FILTER, NO NIS FILTER - Search by Name, Class, Jurusan, or Industry
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return (state.students || []).filter(student => {
      if (!q) return true;
      const matchName = student.name.toLowerCase().includes(q);
      const matchClass = student.className.toLowerCase().includes(q);
      const matchDept = (student.departmentName || '').toLowerCase().includes(q);
      const matchIndustry = (student.industryName || '').toLowerCase().includes(q);
      return matchName || matchClass || matchDept || matchIndustry;
    });
  }, [state.students, studentSearch]);

  // Distinct known class names for suggestion datalist
  const knownClasses = useMemo(() => {
    const set = new Set<string>();
    (state.students || []).forEach(s => {
      if (s.className) set.add(s.className.trim().toUpperCase());
    });
    (state.classes || []).forEach(c => {
      if (c.name) set.add(c.name.trim().toUpperCase());
    });
    return Array.from(set);
  }, [state.students, state.classes]);

  // Distinct known department names for suggestion datalist
  const knownDepartments = useMemo(() => {
    const set = new Set<string>();
    (state.departments || []).forEach(d => {
      if (d.name) set.add(d.name.trim().toUpperCase());
      if (d.code) set.add(d.code.trim().toUpperCase());
    });
    (state.students || []).forEach(s => {
      if (s.departmentName) set.add(s.departmentName.trim().toUpperCase());
    });
    return Array.from(set);
  }, [state.departments, state.students]);

  return (
    <div className="p-3.5 space-y-3.5 text-slate-100 pb-24">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 rounded-2xl bg-emerald-600/90 border border-emerald-400/30 text-white text-xs font-semibold flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-white/80 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Main Subtabs Ordered: 1. DUDI, 2. SISWA (Jurusan terintegrasi di Siswa) */}
      <div className="flex bg-slate-900 border border-slate-800 rounded-2xl p-1 gap-1 text-[11px] font-bold">
        {/* TAB 1: DUDI */}
        <button
          onClick={() => {
            playTap();
            setActiveSubTab('industries');
          }}
          className={`flex-1 py-2 px-1 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
            activeSubTab === 'industries'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>DUDI ({state.industries?.length || 0})</span>
        </button>

        {/* TAB 2: SISWA */}
        <button
          onClick={() => {
            playTap();
            setActiveSubTab('students');
          }}
          className={`flex-1 py-2 px-1 rounded-xl transition-all text-center flex items-center justify-center gap-1.5 ${
            activeSubTab === 'students'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>SISWA ({state.students?.length || 0})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* 1. MENU: DUDI                                                  */}
      {/* ============================================================== */}
      {activeSubTab === 'industries' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-400" />
                Data Mitra DUDI &amp; Hari Aktif
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Kelola industri, jadwal hari kerja aktif, dan jam kerja
              </p>
            </div>
            <button
              onClick={() => {
                playTap();
                setEditingIndustry({
                  name: '',
                  concentration: '',
                  address: '',
                  owner: '',
                  phone: '',
                  activeDays: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'],
                  workHours: '08:00 - 16:00',
                  latitude: -6.9175,
                  longitude: 107.6191,
                  radiusMeter: 250,
                });
              }}
              className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-md shadow-indigo-600/25 active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah DUDI
            </button>
          </div>

          {state.industries?.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
              <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-xs text-slate-400 font-medium">Belum ada data DUDI terdaftar.</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Tambahkan data industri pertama Anda melalui tombol di atas.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {state.industries?.map(industry => (
                <div
                  key={industry.id}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white uppercase truncate">{industry.name}</h4>
                      <p className="text-[10px] text-cyan-400 font-semibold uppercase">{industry.concentration}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          playTap();
                          setEditingIndustry(industry);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-colors"
                        title="Edit DUDI"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          playTap();
                          setDeleteTarget({
                            type: 'industry',
                            id: industry.id,
                            name: industry.name,
                          });
                        }}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                        title="Hapus DUDI"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 space-y-1 pt-1 border-t border-slate-800/80">
                    <p className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      <span className="truncate uppercase">{industry.address || 'Alamat belum disetel'}</span>
                    </p>
                    <p className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>Jam Kerja: {industry.workHours}</span>
                    </p>
                  </div>

                  {/* Active Days Pills */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {INDONESIAN_DAYS.map(day => {
                      const isActive = industry.activeDays?.includes(day);
                      return (
                        <span
                          key={day}
                          className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${
                            isActive
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-500 border border-slate-800'
                          }`}
                        >
                          {day}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. MENU: SISWA (NAMA SISWA, KELAS, JURUSAN & DUDI TERPADU)     */}
      {/* ============================================================== */}
      {activeSubTab === 'students' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" />
                Data Siswa
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Kelola siswa lengkap dengan kelas dan jurusan
              </p>
            </div>
            <button
              onClick={() => {
                playTap();
                setEditingStudent({
                  name: '',
                  className: '',
                  departmentName: '',
                  industryId: state.industries?.[0]?.id || '',
                  status: 'Aktif',
                });
              }}
              className="py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-md shadow-indigo-600/25 active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Siswa
            </button>
          </div>

          {/* Search Bar (NO CLASS FILTER, NO NIS FILTER - Input HURUF KAPITAL) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={e => setStudentSearch(e.target.value.toUpperCase())}
                placeholder="CARI NAMA, KELAS, ATAU JURUSAN SISWA..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 uppercase font-medium"
              />
            </div>
          </div>

          {/* Student Cards List */}
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
              <Users className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs text-slate-400 font-medium">Belum ada data siswa.</p>
              <p className="text-[10px] text-slate-500 max-w-[240px] mx-auto">
                Klik tombol &quot;Tambah Siswa&quot; untuk menginput nama siswa sekaligus kelas &amp; jurusannya.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map(student => (
                <div
                  key={student.id}
                  className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 shadow-sm transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white uppercase truncate">{student.name}</h4>
                    <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-cyan-400 font-bold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 uppercase">
                        {student.className}
                      </span>
                      {student.departmentName && (
                        <span className="text-indigo-300 font-semibold bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 uppercase">
                          {student.departmentName}
                        </span>
                      )}
                      <span>&bull;</span>
                      <span className="text-slate-300 truncate max-w-[150px] uppercase">{student.industryName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        playTap();
                        setEditingStudent(student);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-colors"
                      title="Edit Siswa"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        playTap();
                        setDeleteTarget({
                          type: 'student',
                          id: student.id,
                          name: student.name,
                        });
                      }}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                      title="Hapus Siswa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODALS: INPUT NAMA SISWA, KELAS & JURUSAN (TANPA NIS/NO HP)    */}
      {/* ============================================================== */}

      {/* 1. Modal Tambah / Edit Siswa */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden p-5 shadow-2xl space-y-3 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {editingStudent.id ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
                </h3>
                <p className="text-[10px] text-slate-400">
                  Input nama siswa, kelas, jurusan &amp; DUDI mitra
                </p>
              </div>
              <button onClick={() => setEditingStudent(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-3 text-xs">
              {/* 1. PILIH DUDI */}
              <div>
                <label className="text-[11px] text-amber-400 font-bold block mb-1">
                  1. Tempat Magang / Mitra DUDI:
                </label>
                <select
                  value={editingStudent.industryId || ''}
                  onChange={e => setEditingStudent({ ...editingStudent, industryId: e.target.value })}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-400 text-xs uppercase"
                  required
                >
                  <option value="">-- PILIH MITRA DUDI --</option>
                  {state.industries?.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name.toUpperCase()} ({i.concentration.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. IDENTITAS SISWA, KELAS & JURUSAN */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <label className="text-[11px] text-white font-bold block border-b border-slate-800 pb-1">
                  2. Identitas Siswa:
                </label>

                <div>
                  <label className="text-[10px] text-slate-300 block mb-0.5">Nama Lengkap Siswa:</label>
                  <input
                    type="text"
                    value={editingStudent.name || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value.toUpperCase() })}
                    placeholder="CONTOH: MUHAMMAD FAJAR RAMADHAN"
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-400 text-xs uppercase font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-300 block mb-0.5">
                    Kelas Siswa:
                  </label>
                  <input
                    type="text"
                    list="knownClassesList"
                    value={editingStudent.className || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, className: e.target.value.toUpperCase() })}
                    placeholder="CONTOH: XII RPL 1 ATAU XII DKV 2"
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-400 text-xs font-semibold uppercase"
                    required
                  />
                  <datalist id="knownClassesList">
                    {knownClasses.map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="text-[10px] text-slate-300 block mb-0.5">
                    Jurusan / Program Keahlian:
                  </label>
                  <input
                    type="text"
                    list="knownDepartmentsList"
                    value={editingStudent.departmentName || ''}
                    onChange={e => setEditingStudent({ ...editingStudent, departmentName: e.target.value.toUpperCase() })}
                    placeholder="CONTOH: RPL, DKV, TKRO, ATAU REKAYASA PERANGKAT LUNAK"
                    className="w-full py-2 px-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-indigo-400 text-xs font-semibold uppercase"
                  />
                  <datalist id="knownDepartmentsList">
                    {knownDepartments.map(d => (
                      <option key={d} value={d} />
                    ))}
                  </datalist>
                  <p className="text-[9px] text-slate-400 mt-0.5">
                    Ketik langsung nama atau singkatan jurusan.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30"
                >
                  Simpan Siswa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Tambah / Edit DUDI (TANPA FIELD LATITUDE & LONGITUDE GPS) */}
      {editingIndustry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden p-5 shadow-2xl space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-white">
                {editingIndustry.id ? 'Edit Data DUDI' : 'Tambah Mitra DUDI'}
              </h3>
              <button onClick={() => setEditingIndustry(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIndustry} className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">Nama Industri / DUDI:</label>
                <input
                  type="text"
                  value={editingIndustry.name || ''}
                  onChange={e => setEditingIndustry({ ...editingIndustry, name: e.target.value.toUpperCase() })}
                  placeholder="CONTOH: PT REKATAMA DIGITAL SOLUSI"
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-400 uppercase font-semibold"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">Konsentrasi Industri / Bidang:</label>
                <input
                  type="text"
                  value={editingIndustry.concentration || ''}
                  onChange={e => setEditingIndustry({ ...editingIndustry, concentration: e.target.value.toUpperCase() })}
                  placeholder="CONTOH: WEB &amp; MOBILE APP DEVELOPMENT"
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-400 uppercase font-semibold"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">Alamat Industri:</label>
                <textarea
                  rows={2}
                  value={editingIndustry.address || ''}
                  onChange={e => setEditingIndustry({ ...editingIndustry, address: e.target.value.toUpperCase() })}
                  placeholder="JL. SOEKARNO HATTA NO. 45"
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-400 resize-none uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">Pembimbing / Owner:</label>
                  <input
                    type="text"
                    value={editingIndustry.owner || ''}
                    onChange={e => setEditingIndustry({ ...editingIndustry, owner: e.target.value.toUpperCase() })}
                    placeholder="BAPAK HENDRA"
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-400 uppercase"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 font-semibold block mb-1">Jam Kerja:</label>
                  <input
                    type="text"
                    value={editingIndustry.workHours || '08:00 - 16:00'}
                    onChange={e => setEditingIndustry({ ...editingIndustry, workHours: e.target.value.toUpperCase() })}
                    placeholder="08:00 - 16:00"
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-cyan-400 uppercase"
                  />
                </div>
              </div>

              {/* Setting Hari Aktif */}
              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1.5">
                  Hari Kerja Aktif:
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {INDONESIAN_DAYS.map(day => {
                    const currentDays = editingIndustry.activeDays || [];
                    const isChecked = currentDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const updated = isChecked
                            ? currentDays.filter(d => d !== day)
                            : [...currentDays, day];
                          setEditingIndustry({ ...editingIndustry, activeDays: updated });
                        }}
                        className={`py-1 px-1 rounded-lg text-[10px] font-bold border transition-colors ${
                          isChecked
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[9px] text-slate-400 mt-1">
                  Siswa di industri ini otomatis terdata libur di luar hari yang dipilih.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingIndustry(null)}
                  className="w-1/2 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30"
                >
                  Simpan DUDI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <ConfirmDeleteModal
          isOpen={true}
          title={`Hapus ${deleteTarget.type === 'student' ? 'Siswa' : 'DUDI'}?`}
          itemName={deleteTarget.name}
          itemType={deleteTarget.type}
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
