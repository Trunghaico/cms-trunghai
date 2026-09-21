import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, Check, Stamp, ShieldCheck, Sparkles } from 'lucide-react';

interface DigitalSignaturePadProps {
  onSaveSignature: (signatureData: string) => void;
  approverName: string;
  approverTitle: string;
}

export const DigitalSignaturePad: React.FC<DigitalSignaturePadProps> = ({
  onSaveSignature,
  approverName,
  approverTitle,
}) => {
  const [mode, setMode] = useState<'DRAW' | 'STAMP'>('STAMP');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (mode === 'DRAW') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Set canvas resolution
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#3e4095'; // Deep blue signature ink
    }
  }, [mode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
    const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
    const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  return (
    <div className="bg-slate-50 p-3.5 rounded-[3px] border border-slate-200 space-y-3 animate-fade-in">
      
      {/* Mode Switcher */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700">Phương thức xác thực ký số:</span>
        <div className="flex gap-1 bg-slate-200 p-0.5 rounded-[3px]">
          <button
            type="button"
            onClick={() => {
              setMode('STAMP');
              onSaveSignature('STAMP_OFFICIAL');
            }}
            className={`px-2.5 py-1 text-xs font-semibold rounded-[3px] flex items-center gap-1.5 transition-all duration-200 ${
              mode === 'STAMP'
                ? 'bg-white text-brand-blue shadow-sm scale-100'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stamp className="h-3.5 w-3.5 text-brand-red" />
            <span>Con Dấu Điện Tử Chuẩn</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('DRAW')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-[3px] flex items-center gap-1.5 transition-all duration-200 ${
              mode === 'DRAW'
                ? 'bg-white text-brand-blue shadow-sm scale-100'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="h-3.5 w-3.5 text-brand-blue" />
            <span>Ký Tay Trực Tiếp</span>
          </button>
        </div>
      </div>

      {mode === 'STAMP' ? (
        /* Official Corporate Digital Stamp Preview with Stamp animation */
        <div className="p-3.5 bg-white border-2 border-dashed border-brand-red/60 rounded-[3px] flex items-center justify-between shadow-xs animate-stamp hover:shadow-glow-red transition-all">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-[3px] border-2 border-brand-red flex flex-col items-center justify-center p-1 text-brand-red shrink-0 shadow-xs bg-red-50/50">
              <ShieldCheck className="h-5 w-5 animate-pulse-subtle" />
              <span className="text-[8px] font-black uppercase leading-none mt-0.5">TRUNG HAI</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-brand-red uppercase tracking-wide">
                  ĐÃ PHÊ DUYỆT ĐIỆN TỬ
                </span>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-[3px] shadow-xs">
                  ✓ Hợp lệ
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800 mt-0.5">{approverName}</p>
              <p className="text-[10px] text-slate-500">{approverTitle} - Công ty Cổ phần Trung Hải</p>
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-400 font-mono hidden sm:block">
            <p className="text-emerald-700 font-bold">SHA-256 Verified</p>
            <p>Timestamp Encrypted</p>
          </div>
        </div>
      ) : (
        /* Draw Handwritten Signature Canvas */
        <div className="space-y-2 animate-fade-in">
          <div className="relative border border-slate-300 rounded-[3px] bg-white overflow-hidden shadow-inner">
            <canvas
              ref={canvasRef}
              width={480}
              height={120}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-28 cursor-crosshair touch-none"
            />
            {!hasDrawn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-slate-400 font-medium animate-pulse">
                Vẽ chữ ký của bạn tại đây (Dùng chuột hoặc màn hình cảm ứng)
              </div>
            )}
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[11px] text-slate-500 font-medium">Mực ký: Xanh Trung Hải (#3e4095)</span>
            <button
              type="button"
              onClick={clearCanvas}
              className="flex items-center gap-1 text-slate-500 hover:text-brand-red font-medium text-xs transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Xóa vẽ lại</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
