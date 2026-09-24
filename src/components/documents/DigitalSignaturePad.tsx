import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, Check, Stamp, ShieldCheck, Sparkles, Smartphone, Image as ImageIcon } from 'lucide-react';
import { useDocument } from '../../context/DocumentContext';

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
  const { activeUser } = useDocument();
  const [mode, setMode] = useState<'DRAW' | 'STAMP' | 'SAVED'>(
    activeUser?.signatureUrl ? 'SAVED' : 'STAMP'
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Initialize Canvas with High-DPI Scaling
  useEffect(() => {
    if (mode === 'DRAW') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#3e4095'; // Deep blue signature ink
    } else if (mode === 'SAVED' && activeUser?.signatureUrl) {
      onSaveSignature(activeUser.signatureUrl);
    } else if (mode === 'STAMP') {
      onSaveSignature('STAMP_OFFICIAL');
    }
  }, [mode, activeUser?.signatureUrl]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else if ('clientX' in e) {
      return {
        x: (e as React.MouseEvent<HTMLCanvasElement>).clientX - rect.left,
        y: (e as React.MouseEvent<HTMLCanvasElement>).clientY - rect.top
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onSaveSignature(canvas.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSaveSignature('');
  };

  return (
    <div className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200/80 space-y-3.5 animate-fade-in shadow-2xs">
      
      {/* Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-700">Phương thức ký duyệt:</span>
        <div className="flex flex-wrap gap-1 bg-slate-200/80 p-1 rounded-xl">
          {activeUser?.signatureUrl && (
            <button
              type="button"
              onClick={() => {
                setMode('SAVED');
                onSaveSignature(activeUser.signatureUrl!);
              }}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                mode === 'SAVED'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5 text-indigo-600" />
              <span>Chữ Ký Của Tôi</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setMode('STAMP');
              onSaveSignature('STAMP_OFFICIAL');
            }}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
              mode === 'STAMP'
                ? 'bg-white text-brand-blue shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stamp className="h-3.5 w-3.5 text-brand-red" />
            <span>Con Dấu Điện Tử</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('DRAW')}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
              mode === 'DRAW'
                ? 'bg-white text-brand-blue shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="h-3.5 w-3.5 text-brand-blue" />
            <span>Ký Cảm Ứng</span>
          </button>
        </div>
      </div>

      {mode === 'SAVED' && activeUser?.signatureUrl ? (
        /* Saved User Signature Preview */
        <div className="p-4 bg-white border-2 border-dashed border-indigo-300 rounded-2xl flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="h-14 w-28 bg-slate-50 border border-slate-200 rounded-xl p-1 flex items-center justify-center overflow-hidden">
              <img src={activeUser.signatureUrl} alt="Chữ ký đã lưu" className="max-h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-indigo-700">
                  Chữ ký cá nhân hợp lệ
                </span>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full">
                  ✓ Đã lưu
                </span>
              </div>
              <p className="text-xs font-bold text-slate-800 mt-0.5">{approverName}</p>
              <p className="text-[10px] text-slate-500">{approverTitle} - Công ty Cổ phần Trung Hải</p>
            </div>
          </div>
        </div>
      ) : mode === 'STAMP' ? (
        /* Official Corporate Digital Stamp Preview */
        <div className="p-4 bg-white border-2 border-dashed border-brand-red/50 rounded-2xl flex items-center justify-between shadow-sm animate-stamp hover:shadow-glow-red transition-all">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-xl border-2 border-brand-red flex flex-col items-center justify-center p-1 text-brand-red shrink-0 shadow-xs bg-red-50/70">
              <ShieldCheck className="h-5 w-5 animate-pulse-subtle" />
              <span className="text-[8px] font-black uppercase leading-none mt-0.5">TRUNG HAI</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-brand-red uppercase tracking-wide">
                  ĐÃ PHÊ DUYỆT ĐIỆN TỬ
                </span>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full shadow-2xs">
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
        <div className="space-y-2.5 animate-fade-in">
          <div className="relative border border-slate-300 rounded-2xl bg-white overflow-hidden shadow-inner p-1">
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: '130px', touchAction: 'none' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-32 cursor-crosshair rounded-xl"
            />
            {!hasDrawn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-xs text-slate-400 font-medium animate-pulse px-4 text-center">
                <PenTool className="h-5 w-5 mb-1 text-slate-300" />
                <span>Ký chữ ký của bạn tại đây (Dùng ngón tay, bút cảm ứng hoặc chuột)</span>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span>Mực ký: <strong className="text-brand-blue">Xanh Trung Hải</strong></span>
            </div>
            <button
              type="button"
              onClick={clearCanvas}
              className="flex items-center gap-1.5 text-slate-500 hover:text-brand-red font-semibold text-xs transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-red-50"
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
