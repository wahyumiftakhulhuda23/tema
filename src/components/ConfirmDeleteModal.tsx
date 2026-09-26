import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { playDelete, playTap } from '../utils/sound';

interface Props {
  isOpen: boolean;
  title: string;
  itemName: string;
  itemType?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDeleteModal: React.FC<Props> = ({
  isOpen,
  title,
  itemName,
  itemType = 'data',
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="bg-slate-900 border border-rose-500/30 rounded-3xl w-full max-w-xs p-5 shadow-2xl text-center relative overflow-hidden"
        >
          {/* Subtle red background glow */}
          <div className="absolute -top-12 -left-12 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

          <button
            onClick={() => {
              playTap();
              onClose();
            }}
            className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-3">
            <Trash2 className="w-6 h-6 animate-pulse" />
          </div>

          <h3 className="text-sm font-bold text-white">{title || 'Hapus Data?'}</h3>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Apakah Anda yakin ingin menghapus {itemType}{' '}
            <strong className="text-rose-400 font-semibold">&quot;{itemName}&quot;</strong>? Tindakan ini tidak dapat dibatalkan.
          </p>

          <div className="flex gap-2 mt-5">
            <button
              type="button"
              onClick={() => {
                playTap();
                onClose();
              }}
              className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                playDelete();
                onConfirm();
              }}
              className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
