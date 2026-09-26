import React, { useState } from 'react';
import { TeMaProvider, useTeMa } from './context/TeMaContext';
import { MobileFrame } from './components/MobileFrame';
import { RoleSelectionView } from './components/RoleSelectionView';
import { StudentHomeView } from './components/StudentHomeView';
import { StudentHistoryView } from './components/StudentHistoryView';
import { TeacherRecapView } from './components/TeacherRecapView';
import { TeacherSettingsView } from './components/TeacherSettingsView';
import { AdminSettingsView } from './components/AdminSettingsView';
import { RoleAuthModal } from './components/RoleAuthModal';
import { PrintReportModal } from './components/PrintReportModal';
import { getTodayDateString } from './utils/helpers';
import { motion, AnimatePresence } from 'motion/react';

function TeMaMain() {
  const {
    activeRole,
    activeStudentTab,
    activeGuruTab,
  } = useTeMa();

  const [authModalState, setAuthModalState] = useState<{
    isOpen: boolean;
    role: 'guru' | 'admin';
  }>({
    isOpen: false,
    role: 'guru',
  });

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printFilterParams, setPrintFilterParams] = useState({
    startDate: getTodayDateString(),
    endDate: getTodayDateString(),
    date: getTodayDateString(),
    classId: 'all',
    industryId: 'all',
    departmentId: 'all',
  });

  const handleOpenPrintModal = (params: {
    startDate?: string;
    endDate?: string;
    date?: string;
    classId: string;
    industryId: string;
    departmentId: string;
  }) => {
    setPrintFilterParams({
      startDate: params.startDate || params.date || getTodayDateString(),
      endDate: params.endDate || params.date || getTodayDateString(),
      date: params.date || params.endDate || getTodayDateString(),
      classId: params.classId || 'all',
      industryId: params.industryId || 'all',
      departmentId: params.departmentId || 'all',
    });
    setIsPrintModalOpen(true);
  };

  return (
    <MobileFrame>
      <AnimatePresence mode="wait">
        {/* ==================== 1. LANDING: PILIHAN 3 PERAN ==================== */}
        {activeRole === 'guest' && (
          <motion.div
            key="role_selection"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="flex-1 flex flex-col"
          >
            <RoleSelectionView
              onSelectGuru={() => setAuthModalState({ isOpen: true, role: 'guru' })}
              onSelectAdmin={() => setAuthModalState({ isOpen: true, role: 'admin' })}
            />
          </motion.div>
        )}

        {/* ==================== 2. PORTAL MURID ==================== */}
        {activeRole === 'murid' && (
          <React.Fragment key="murid_role_group">
            {activeStudentTab === 'home' && (
              <motion.div
                key="student_home"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <StudentHomeView />
              </motion.div>
            )}

            {activeStudentTab === 'history' && (
              <motion.div
                key="student_history"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <StudentHistoryView />
              </motion.div>
            )}
          </React.Fragment>
        )}

        {/* ==================== 3. PORTAL GURU ==================== */}
        {activeRole === 'guru' && (
          <React.Fragment key="guru_role_group">
            {activeGuruTab === 'recap' && (
              <motion.div
                key="guru_recap"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <TeacherRecapView onOpenPrintModal={handleOpenPrintModal} />
              </motion.div>
            )}

            {activeGuruTab !== 'recap' && (
              <motion.div
                key="guru_master_data"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <TeacherSettingsView />
              </motion.div>
            )}
          </React.Fragment>
        )}

        {/* ==================== 4. PORTAL ADMINISTRATOR ==================== */}
        {activeRole === 'admin' && (
          <motion.div
            key="admin_settings"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <AdminSettingsView />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role Passcode Authentication Modal */}
      <RoleAuthModal
        isOpen={authModalState.isOpen}
        targetRole={authModalState.role}
        onClose={() => setAuthModalState({ isOpen: false, role: 'guru' })}
        onSuccess={() => setAuthModalState({ isOpen: false, role: 'guru' })}
      />

      {/* Print Report Modal */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        filterParams={printFilterParams}
      />
    </MobileFrame>
  );
}

export default function App() {
  return (
    <TeMaProvider>
      <TeMaMain />
    </TeMaProvider>
  );
}
