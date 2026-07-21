"use client";

import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, Loader2 } from "lucide-react";
import { usePopupStore, type PopupType } from "@/store/popupStore";

const icons: Record<PopupType, React.ReactNode> = {
  alert: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
  confirm: <AlertCircle className="w-6 h-6 text-blue-500" />,
  success: <CheckCircle2 className="w-6 h-6 text-green-500" />,
  danger: <AlertCircle className="w-6 h-6 text-red-500" />,
  info: <Info className="w-6 h-6 text-blue-400" />,
};

export function SpecializedPopup() {
  const { isOpen, options, hide, confirm, cancel, isLoading } = usePopupStore();

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && hide()}>
      <AnimatePresence>
        {isOpen && options && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
                exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", bounce: 0.4, duration: 0.5 }}
                className="fixed left-[50%] top-[50%] z-[101] w-[90vw] max-w-[420px] translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-white/10 bg-[#0f0f13]/90 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl focus:outline-none"
              >
                <div className="flex items-start gap-4">
                  {options.type && (
                    <div className="flex-shrink-0 mt-1">
                      {icons[options.type]}
                    </div>
                  )}
                  <div className="flex-1">
                    <Dialog.Title className="text-lg font-semibold text-white tracking-tight">
                      {options.title}
                    </Dialog.Title>
                    {options.description && (
                      <Dialog.Description className="mt-2 text-sm leading-relaxed text-gray-400">
                        {options.description}
                      </Dialog.Description>
                    )}
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  {options.type === "confirm" && (
                    <button
                      onClick={cancel}
                      disabled={isLoading}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50"
                    >
                      {options.cancelText || "Cancel"}
                    </button>
                  )}
                  <button
                    onClick={confirm}
                    disabled={isLoading}
                    className="group relative px-4 py-2 rounded-xl text-sm font-medium text-white overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: options.type === "danger" 
                        ? "linear-gradient(to right, #ef4444, #dc2626)"
                        : "linear-gradient(to right, #3b82f6, #2563eb)",
                    }}
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity bg-white" />
                    <span className="flex items-center gap-2 relative z-10">
                      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {options.confirmText || "OK"}
                    </span>
                  </button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
