import React from 'react';
import { ModalType } from './TrustModals';

interface FooterProps {
  onOpenModal?: (modal: ModalType) => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenModal }) => {
  return (
    <footer className="w-full bg-[#05070a] border-t border-[#1f2937] py-6 z-20 relative">
      <div className="max-w-[1440px] mx-auto px-4 md:px-10 flex flex-col md:flex-row justify-between items-center gap-4 font-mono text-xs text-[#b9caca]">
        <div className="flex items-center gap-3">
          <span className="font-sans font-bold text-[#00dce5] tracking-tight">NEXIS AI INTERVIEW AGENT</span>
          <span className="text-[#323539]">|</span>
          <span>© 2026 Nexis AI Interview Agent. All Rights Reserved.</span>
        </div>
        <div className="flex flex-wrap gap-6 items-center">
          <button
            onClick={() => onOpenModal?.('status')}
            className="hover:text-[#00dce5] underline transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse"></span>
            System Status
          </button>
          <button
            onClick={() => onOpenModal?.('privacy')}
            className="hover:text-[#00dce5] underline transition-colors cursor-pointer"
          >
            Privacy
          </button>
          <button
            onClick={() => onOpenModal?.('terms')}
            className="hover:text-[#00dce5] underline transition-colors cursor-pointer"
          >
            Terms
          </button>
          <button
            onClick={() => onOpenModal?.('license')}
            className="hover:text-[#00dce5] underline transition-colors cursor-pointer"
          >
            MIT License
          </button>
        </div>
      </div>
    </footer>
  );
};

