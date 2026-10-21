import { PDFDocument, rgb, StandardFonts, degrees, PDFName, decodePDFRawStream } from 'pdf-lib';
import { DocumentItem, ApprovalStep } from '../types';
import { formatDate } from './storage';
import { getSecureFileUrl } from './nasStorageService';

/**
 * Helper chuyển chuỗi tiếng Việt có dấu sang không dấu (ASCII an toàn cho chuẩn WinAnsi của PDF)
 * để tránh tuyệt đối lỗi: Error: WinAnsi cannot encode "..." (0x0110)
 */
export function toSafePdfAscii(str: string | undefined | null): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu tiếng Việt
    .replace(/[đĐ]/g, (c) => (c === 'đ' ? 'd' : 'D'))
    .replace(/[^\x20-\x7E]/g, ' ') // Thay thế ký tự ngoài ASCII 32-126
    .replace(/\s+/g, ' ')
    .trim();
}

export interface FooterSignerInfo {
  name: string;
  roleTitle?: string;
  department?: string;
  signatureImage?: string;
  signedAt?: string;
  stepOrder?: number;
}

export interface PageOrientationResult {
  pageIndex: number;
  isLandscape: boolean;
  finalRotation: number;
  visualWidth: number;
  visualHeight: number;
  confidence: number;
  dominantAngle: number;
  reason: string;
  method: 'AI Text Stream Matrix' | 'AI Scanned Image OCR' | 'Geometric Bounds';
}

export interface FooterStampOptions {
  marginMode: 'STANDARD' | 'SAFE_SCALE'; // 'STANDARD' (Trường hợp A) | 'SAFE_SCALE' (Trường hợp B: co an toàn + nâng lên)
  applyToAllPages: boolean; // true = giáp lai mọi trang, false = chỉ trang cuối
  signers?: FooterSignerInfo[];
  documentCode: string;
  documentTitle?: string;
  customMarginBottom?: number; // Mặc định 18pt (đảm bảo an toàn không bị máy in cắt lề dưới)
  customMarginRight?: number;  // Mặc định 20pt
  autoDetectTextOrientation?: boolean; // Tự động dùng AI nhận diện trang nằm ngang và nằm dọc theo chữ
  pageOrientationMode?: 'AUTO' | 'LANDSCAPE' | 'PORTRAIT'; // 'AUTO': AI nhận diện từng trang riêng biệt | 'LANDSCAPE': Ép tất cả ngang | 'PORTRAIT': Ép tất cả dọc
  pageOrientationOverrides?: Record<number, 'AUTO' | 'LANDSCAPE' | 'PORTRAIT'>; // Tùy chỉnh riêng cho từng trang
  pageRotations?: Record<number, number>; // Góc xoay riêng từng trang (0, 90, 180, 270)
  manualRotation?: number; // Góc xoay bổ sung đồng loạt (0, 90, 180, 270)
}

/**
 * Helper luôn sắp xếp danh sách người ký theo đúng thứ tự quy trình phê duyệt (stepOrder)
 */
export function sortSignersByApprovalOrder(signers: FooterSignerInfo[]): FooterSignerInfo[] {
  return signers.slice().sort((a, b) => (a.stepOrder ?? 0) - (b.stepOrder ?? 0));
}

/**
 * Tính toán kích thước tem giáp lai chân trang (gọn gàng, thanh thoát, chuyên nghiệp)
 * Mỗi con dấu phòng ban là một khối độc lập tách rời nhau bởi khoảng cách gap
 */
export function getFooterStampDimensions(signerCount: number): {
  badgeW: number;
  badgeH: number;
  gap: number;
  stampWidth: number;
  stampHeight: number;
} {
  const count = Math.max(1, signerCount);
  // Chiều rộng con dấu mỗi phòng ban: 1 ban: 138pt | 2 ban: 116pt | 3 ban: 108pt | 4+ ban: 100pt
  const badgeW = count === 1 ? 138 : (count === 2 ? 116 : (count === 3 ? 108 : 100));
  const badgeH = 30; // Chiều cao 30pt (thông thoáng lề trên dưới, tránh bị cắt chữ khi in)
  const gap = 6;     // Khoảng cách trống hoàn toàn giữa các con dấu phòng ban tách rời nhau
  const stampWidth = count === 1 ? badgeW : (count * badgeW + (count - 1) * gap);
  const stampHeight = badgeH;
  return { badgeW, badgeH, gap, stampWidth, stampHeight };
}

/**
 * 1. Tạo hình ảnh tem giáp lai chân trang (Footer Stamp Badge) bằng HTML5 Canvas
 * - Luôn sắp xếp theo thứ tự quy trình phê duyệt (B1, B2, B3...)
 * - Mỗi dấu phòng ban TÁCH RỜI NHAU hoàn toàn (có khoảng trống trong suốt ở giữa)
 * - Chữ ký hiển thị sắc nét, đậm màu mực, không bị mờ nhạt
 */
export async function createFooterStampCanvas(
  signerOrSigners: FooterSignerInfo | FooterSignerInfo[],
  docCode: string,
  pageIndex: number,
  totalPages: number
): Promise<string> {
  const rawList = Array.isArray(signerOrSigners) ? signerOrSigners : [signerOrSigners];
  const signers = sortSignersByApprovalOrder(rawList);
  const count = signers.length;

  const { badgeW, badgeH, gap, stampWidth, stampHeight } = getFooterStampDimensions(count);
  const scale = 3;

  const canvas = document.createElement('canvas');
  canvas.width = stampWidth * scale;
  canvas.height = stampHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(scale, scale);

  // Lưu ý: Nền canvas mặc định trong suốt (transparent) để giữa các con dấu phòng ban có khoảng hở tách rời nhau hoàn toàn!

  for (let idx = 0; idx < count; idx++) {
    const signer = signers[idx];
    const badgeX = idx * (badgeW + gap);
    const badgeY = 0;
    const r = 3.5;

    // 1. Khung thẻ con dấu độc lập của phòng ban (nền trắng sạch, bo góc tinh tế, viền đỏ sang trọng)
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#dc2626'; // Đỏ mộc chuẩn nhận diện Trung Hải
    ctx.lineWidth = 0.8;

    ctx.beginPath();
    ctx.moveTo(badgeX + r, badgeY);
    ctx.lineTo(badgeX + badgeW - r, badgeY);
    ctx.quadraticCurveTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + r);
    ctx.lineTo(badgeX + badgeW, badgeY + badgeH - r);
    ctx.quadraticCurveTo(badgeX + badgeW, badgeY + badgeH, badgeX + badgeW - r, badgeY + badgeH);
    ctx.lineTo(badgeX + r, badgeY + badgeH);
    ctx.quadraticCurveTo(badgeX, badgeY + badgeH, badgeX, badgeY + badgeH - r);
    ctx.lineTo(badgeX, badgeY + r);
    ctx.quadraticCurveTo(badgeX, badgeY, badgeX + r, badgeY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Viền bảo mật nét đứt mảnh bên trong từng con dấu
    ctx.setLineDash([2, 1.5]);
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.25)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(badgeX + 2, badgeY + 2, badgeW - 4, badgeH - 4);
    ctx.setLineDash([]);

    // 2. Huy hiệu dấu mộc tròn vi mô bên trái con dấu (Micro Stamp Seal)
    const circleX = badgeX + 11;
    const circleY = badgeY + badgeH / 2;
    const circleR = 7.5;

    // Vòng tròn mờ nền đỏ nhạt
    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
    ctx.fill();

    // Vòng tròn đỏ mộc
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
    ctx.stroke();

    // Vòng tròn nét đứt bảo mật
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.4)';
    ctx.lineWidth = 0.45;
    ctx.beginPath();
    ctx.arc(circleX, circleY, circleR - 2, 0, Math.PI * 2);
    ctx.stroke();

    // Dấu tick xanh xác thực ở giữa
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(circleX, circleY, 3.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(circleX - 1.8, circleY);
    ctx.lineTo(circleX - 0.4, circleY + 1.5);
    ctx.lineTo(circleX + 1.8, circleY - 1.4);
    ctx.stroke();

    // 3. Nội dung thông tin phê duyệt của phòng ban (3 dòng sắc nét, thu nhỏ gọn gàng)
    const textX = badgeX + 21.5;
    ctx.textAlign = 'left';

    // Dòng 1: [B1] TÊN PHÒNG BAN THEO QUY TRÌNH
    const rawDept = signer.department || signer.roleTitle || 'PHÒNG DUYỆT';
    let cleanDept = rawDept
      .replace(/^PHÒNG\s+/i, 'P. ')
      .replace(/PHÒNG TÀI CHÍNH KẾ TOÁN/i, 'P. TÀI CHÍNH KT')
      .replace(/PHÒNG KỸ THUẬT THI CÔNG/i, 'P. KỸ THUẬT TC')
      .replace(/PHÒNG KỸ THUẬT & DỰ ÁN/i, 'P. KỸ THUẬT DA')
      .replace(/BAN TỔNG GIÁM ĐỐC/i, 'BAN TỔNG GIÁM ĐỐC')
      .toUpperCase();

    if (cleanDept.length > 18) {
      cleanDept = cleanDept.slice(0, 17) + '…';
    }

    const stepNum = signer.stepOrder ?? idx + 1;
    ctx.fillStyle = '#b91c1c';
    ctx.font = 'bold 5.8px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`[B${stepNum}] ${cleanDept}`, textX, badgeY + 8.5);

    // Dòng 2: Họ và tên người phê duyệt
    let signerName = signer.name || 'Người phê duyệt';
    if (signerName.length > 18) {
      signerName = signerName.slice(0, 17) + '…';
    }
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 6.8px "Segoe UI", Arial, sans-serif';
    ctx.fillText(signerName, textX, badgeY + 17);

    // Dòng 3: Chức vụ & Ngày duyệt
    const roleTitle = (signer.roleTitle || 'Phê duyệt')
      .replace(/^Trưởng phòng/i, 'TP.')
      .replace(/^Tổng Giám Đốc/i, 'TGĐ')
      .replace(/^Chuyên viên/i, 'CV.');

    let dateStr = '';
    if (signer.signedAt) {
      try {
        const d = new Date(signer.signedAt);
        dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
      } catch {
        dateStr = formatDate(signer.signedAt).split(' ')[0];
      }
    } else {
      const now = new Date();
      dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '500 5.4px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`${roleTitle} • ${dateStr}`, textX, badgeY + 25);

    // 4. Chữ ký tay: Vẽ ảnh chữ ký rõ ràng sắc nét hoặc tạo chữ ký bút mực xanh phẩy nghệ thuật
    const sigImgStr = signer.signatureImage;
    const hasImageSignature = !!(
      sigImgStr && 
      sigImgStr.length > 30 && 
      (sigImgStr.startsWith('data:image') || sigImgStr.startsWith('http') || sigImgStr.startsWith('blob:'))
    );

    if (hasImageSignature) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 600);
          img.onload = () => {
            clearTimeout(timer);
            resolve();
          };
          img.onerror = () => {
            clearTimeout(timer);
            resolve();
          };
          img.src = sigImgStr!;
        });
        if (img.width > 0) {
          ctx.save();
          // Tăng độ rõ nét chữ ký lên 0.72 và dùng chế độ hòa trộn 'multiply' để loại bỏ nền trắng, giữ trọn nét mực đậm đà
          ctx.globalAlpha = 0.72;
          ctx.globalCompositeOperation = 'multiply';
          ctx.drawImage(img, badgeX + badgeW - 35, badgeY + 2.5, 33, 25);
          ctx.restore();
        }
      } catch {
        // Bỏ qua lỗi ảnh
      }
    } else {
      // Khi chưa có ảnh vẽ tay: Vẽ chữ ký bút mực xanh phẩy điệu nghệ rõ nét
      ctx.save();
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = '#1d4ed8'; // Mực xanh bút ký chuẩn doanh nghiệp
      ctx.font = 'italic 700 8.5px "Brush Script MT", "Segoe Script", cursive, sans-serif';
      ctx.textAlign = 'right';
      const parts = (signer.name || 'Trung Hải').trim().split(/\s+/);
      const shortSign = parts.length > 1 ? `${parts[parts.length - 2][0]}. ${parts[parts.length - 1]}` : parts[0];
      ctx.fillText(shortSign, badgeX + badgeW - 5, badgeY + 17);
      
      // Nét móc gạch chân chữ ký thanh thoát
      ctx.strokeStyle = '#1d4ed8';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(badgeX + badgeW - 28, badgeY + 19.5);
      ctx.bezierCurveTo(badgeX + badgeW - 20, badgeY + 20.5, badgeX + badgeW - 12, badgeY + 18.5, badgeX + badgeW - 4, badgeY + 20);
      ctx.stroke();
      ctx.restore();
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Phân tích độ biến thiên vi mô của ảnh quét để nhận diện bảng tính / nội dung ngang trong trang scan đứng
 */
async function detectImageOrientationFromBytes(bytes: Uint8Array): Promise<boolean | null> {
  if (typeof window === 'undefined' || typeof createImageBitmap === 'undefined') return null;
  try {
    const blob = new Blob([bytes as any]);
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    const w = 80;
    const h = 120;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      if (typeof (bitmap as any).close === 'function') (bitmap as any).close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    if (typeof (bitmap as any).close === 'function') (bitmap as any).close();
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let horizDiffSum = 0;
    let vertDiffSum = 0;
    for (let y = 2; y < h - 2; y += 2) {
      for (let x = 2; x < w - 2; x += 2) {
        const idx = (y * w + x) * 4;
        const lum = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const lumR = (data[idx + 8] + data[idx + 9] + data[idx + 10]) / 3;
        const lumB = (data[idx + w * 8] + data[idx + w * 8 + 1] + data[idx + w * 8 + 2]) / 3;
        horizDiffSum += Math.abs(lumR - lum);
        vertDiffSum += Math.abs(lumB - lum);
      }
    }
    // Với bảng kê / bảng tính xoay ngang quét theo chiều đứng, các đường kẻ cột dọc và chuỗi chữ chạy dọc
    // tạo nên độ chênh lệch đạo hàm ngang vượt trội so với đạo hàm dọc
    if (horizDiffSum > vertDiffSum * 1.35) {
      return true;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Trích xuất chuỗi ký tự trên trang PDF để phân tích ngữ cảnh (nhận diện bảng biểu vs văn bản hành chính)
 */
function extractPageTextSnippets(str: string): string {
  let text = '';
  const parenRegex = /\(([^()]{2,})\)/g;
  const hexRegex = /<([0-9a-fA-F]{4,})>/g;
  let match;
  while ((match = parenRegex.exec(str)) !== null) {
    text += ' ' + match[1];
  }
  while ((match = hexRegex.exec(str)) !== null) {
    const hex = match[1];
    let d = '';
    for (let k = 0; k < hex.length - 1; k += 2) {
      const code = parseInt(hex.substr(k, 2), 16);
      if (code >= 32 && code <= 126) d += String.fromCharCode(code);
    }
    if (d.length >= 2) text += ' ' + d;
  }
  return text;
}

/**
 * 2. AI TỰ ĐỘNG NHẬN DIỆN KHỔ TRANG NẰM NGANG & NẰM DỌC CHO TỪNG TRANG ĐỘC LẬP (Per-Page AI Analysis)
 * Phân tích toán tử ma trận văn bản Tm, cm và cấu trúc nội dung của RIÊNG TRANG ĐÓ để xác định chính xác:
 * - Khổ dọc (Portrait) khi chữ đọc xuôi dòng theo chiều đứng
 * - Khổ ngang (Landscape) khi trang là bảng tính, bản vẽ có chữ quay ngang 90° hoặc trang khổ rộng
 * Tuyệt đối không để 1 trang ngang làm xoay ngang toàn bộ các trang khác trong tệp.
 */
export async function detectPageOrientationByText(
  sourcePage: any,
  context: any,
  pageIndex: number = 0
): Promise<PageOrientationResult> {
  const { width: rawW, height: rawH } = sourcePage.getSize();
  const pageRotation = (sourcePage.getRotation().angle % 360 + 360) % 360;

  // Kích thước trực quan ban đầu theo góc xoay trang có sẵn trong tệp
  const initialVisualW = (pageRotation === 90 || pageRotation === 270) ? rawH : rawW;
  const initialVisualH = (pageRotation === 90 || pageRotation === 270) ? rawW : rawH;

  // 1. Nếu bản thân trang đã có kích thước khổ ngang (chiều rộng > chiều cao):
  if (initialVisualW > initialVisualH * 1.05) {
    return {
      pageIndex,
      isLandscape: true,
      finalRotation: pageRotation,
      visualWidth: initialVisualW,
      visualHeight: initialVisualH,
      confidence: 0.99,
      dominantAngle: 0,
      method: 'Geometric Bounds',
      reason: `Trang ${pageIndex + 1}: Khổ ngang chuẩn (${Math.round(initialVisualW)}x${Math.round(initialVisualH)}pt)`,
    };
  }

  let angleCounts: Record<number, number> = { 0: 0, 90: 0, 180: 0, 270: 0 };
  let hasText = false;
  let totalTextSamples = 0;
  let pageTextSnippets = '';

  // 2. Phân tích nội dung luồng dữ liệu (Contents stream) CỦA RIÊNG TRANG NÀY
  try {
    const contentsRef = sourcePage.node.get(PDFName.of('Contents'));
    if (contentsRef) {
      const lookup = context.lookup(contentsRef);
      if (lookup) {
        let streamObjs: any[] = [];
        if (typeof lookup.asArray === 'function') {
          streamObjs = lookup.asArray().map((r: any) => context.lookup(r) || r);
        } else if (lookup.array) {
          streamObjs = lookup.array.map((r: any) => context.lookup(r) || r);
        } else {
          streamObjs = [lookup];
        }

        for (const streamObj of streamObjs) {
          if (!streamObj) continue;
          let decodedBytes: Uint8Array | undefined;
          try {
            if (typeof streamObj.decode === 'function') {
              decodedBytes = streamObj.decode();
            } else if (typeof decodePDFRawStream === 'function') {
              decodedBytes = decodePDFRawStream(streamObj).decode();
            }
          } catch {
            try {
              if (typeof streamObj.getContents === 'function') {
                decodedBytes = streamObj.getContents();
              }
            } catch {
              continue;
            }
          }
          if (!decodedBytes) continue;

          let str = '';
          const len = Math.min(decodedBytes.length, 250000);
          for (let b = 0; b < len; b++) {
            str += String.fromCharCode(decodedBytes[b]);
          }

          // Trích xuất các đoạn văn bản thực tế xuất hiện trên chính trang này
          pageTextSnippets += ' ' + extractPageTextSnippets(str);

          // Phân tích ma trận chuyển đổi tọa độ Tm và cm: a b c d e f Tm / cm
          const matrixRegex = /(-?[\d\.]+)\s+(-?[\d\.]+)\s+(-?[\d\.]+)\s+(-?[\d\.]+)\s+(-?[\d\.]+)\s+(-?[\d\.]+)\s+(?:Tm|cm)/g;
          let match;
          while ((match = matrixRegex.exec(str)) !== null) {
            const a = parseFloat(match[1]);
            const b = parseFloat(match[2]);
            if (isNaN(a) || isNaN(b) || (Math.abs(a) < 0.001 && Math.abs(b) < 0.001)) continue;
            const angleRad = Math.atan2(b, a);
            let angleDeg = Math.round((angleRad * 180 / Math.PI) % 360);
            if (angleDeg < 0) angleDeg += 360;

            if (angleDeg >= 315 || angleDeg < 45) angleCounts[0]++;
            else if (angleDeg >= 45 && angleDeg < 135) angleCounts[90]++;
            else if (angleDeg >= 135 && angleDeg < 225) angleCounts[180]++;
            else if (angleDeg >= 225 && angleDeg < 315) angleCounts[270]++;
            hasText = true;
            totalTextSamples++;
          }
        }
      }
    }
  } catch (err) {
    console.warn(`Lỗi phân tích ma trận chữ trang ${pageIndex + 1}:`, err);
  }

  // 3. Phân tích góc xoay chữ thực tế trên trang:
  if (hasText && totalTextSamples > 0) {
    let dominantTextAngle = 0;
    let maxCount = angleCounts[0];
    for (const a of [90, 180, 270]) {
      if (angleCounts[a] > maxCount) {
        maxCount = angleCounts[a];
        dominantTextAngle = a;
      }
    }

    const screenTextAngle = (dominantTextAngle + 360 - pageRotation) % 360;

    // A. Nếu đa số chữ trên trang này xoay nghiêng 90° hoặc 270° (bảng tính, bản vẽ xoay ngang)
    if (screenTextAngle === 90 || screenTextAngle === 270) {
      const finalRotation = (pageRotation + (screenTextAngle === 90 ? 90 : 270)) % 360;
      return {
        pageIndex,
        isLandscape: true,
        finalRotation,
        visualWidth: Math.max(initialVisualW, initialVisualH),
        visualHeight: Math.min(initialVisualW, initialVisualH),
        confidence: 0.98,
        dominantAngle: screenTextAngle,
        method: 'AI Text Stream Matrix',
        reason: `Trang ${pageIndex + 1}: AI phát hiện bảng tính xoay ${screenTextAngle}° • Khổ ngang (Landscape)`,
      };
    }

    // B. Kiểm tra nội dung văn bản cụ thể trên chính trang này:
    const isLetterPage = /(?:giấy đề nghị|giay de nghi|tờ trình|to trinh|đơn xin|don xin|quyết định|quyet dinh|thông báo|thong bao|kính gửi|kinh gui|cộng hòa xã hội|cong hoa xa hoi)/i.test(pageTextSnippets);
    const isTablePage = /(?:bảng kê|bang ke|bảng tính|bang tinh|bảng tổng hợp|bang tong hop|danh sách chi tiết|danh sach chi tiet|báo cáo tài chính|bao cao tai chinh|bản vẽ|ban ve)/i.test(pageTextSnippets);

    if (isLetterPage) {
      // Trang văn bản hành chính đọc dọc
      return {
        pageIndex,
        isLandscape: false,
        finalRotation: pageRotation,
        visualWidth: initialVisualW,
        visualHeight: initialVisualH,
        confidence: 0.99,
        dominantAngle: 0,
        method: 'AI Text Stream Matrix',
        reason: `Trang ${pageIndex + 1}: Văn bản hành chính đọc chuẩn • Khổ dọc (Portrait)`,
      };
    }

    if (isTablePage && !isLetterPage) {
      // Trang bảng kê/bảng tính nằm ngang
      return {
        pageIndex,
        isLandscape: true,
        finalRotation: (pageRotation + 90) % 360,
        visualWidth: initialVisualH,
        visualHeight: initialVisualW,
        confidence: 0.95,
        dominantAngle: 90,
        method: 'AI Text Stream Matrix',
        reason: `Trang ${pageIndex + 1}: Bảng kê chi tiết • Khổ ngang (Landscape)`,
      };
    }

    // Nếu chữ đọc xuôi 0° bình thường
    if (angleCounts[0] >= 3) {
      return {
        pageIndex,
        isLandscape: false,
        finalRotation: pageRotation,
        visualWidth: initialVisualW,
        visualHeight: initialVisualH,
        confidence: 0.98,
        dominantAngle: 0,
        method: 'AI Text Stream Matrix',
        reason: `Trang ${pageIndex + 1}: Chữ đọc chuẩn • Khổ dọc (Portrait)`,
      };
    }
  }

  // 4. Kiểm tra ảnh quét (Scanned PDF Image XObject) trên riêng trang này
  try {
    const resRef = sourcePage.node.get(PDFName.of('Resources'));
    if (resRef) {
      const res = context.lookup(resRef);
      const resDict = res?.dict || (res?.get ? res : null);
      if (resDict) {
        const xObjRef = resDict.get(PDFName.of('XObject'));
        if (xObjRef) {
          const xObjs = context.lookup(xObjRef);
          if (xObjs && typeof xObjs.entries === 'function') {
            for (const [, ref] of xObjs.entries()) {
              const obj = context.lookup(ref);
              const dict = obj?.dict || (obj?.get ? obj : null);
              if (dict) {
                const subtype = dict.get(PDFName.of('Subtype'));
                if (subtype && subtype.name === 'Image') {
                  const w = dict.get(PDFName.of('Width'))?.numberValue;
                  const h = dict.get(PDFName.of('Height'))?.numberValue;
                  if (w && h) {
                    if (w > h * 1.15) {
                      return {
                        pageIndex,
                        isLandscape: true,
                        finalRotation: (pageRotation === 90 || pageRotation === 270) ? pageRotation : 0,
                        visualWidth: Math.max(initialVisualW, initialVisualH),
                        visualHeight: Math.min(initialVisualW, initialVisualH),
                        confidence: 0.95,
                        dominantAngle: 0,
                        method: 'AI Scanned Image OCR',
                        reason: `Trang ${pageIndex + 1}: Bản scan đồ họa khổ ngang (${w}x${h}px)`,
                      };
                    }
                  }

                  if (obj.contents) {
                    const filter = dict.get(PDFName.of('Filter'));
                    const filterName = filter?.name || (filter?.array ? filter.array[0]?.name : '');
                    if (filterName === 'DCTDecode') {
                      const isScanLandscape = await detectImageOrientationFromBytes(obj.contents);
                      if (isScanLandscape) {
                        return {
                          pageIndex,
                          isLandscape: true,
                          finalRotation: (pageRotation + 90) % 360,
                          visualWidth: Math.max(initialVisualW, initialVisualH),
                          visualHeight: Math.min(initialVisualW, initialVisualH),
                          confidence: 0.96,
                          dominantAngle: 90,
                          method: 'AI Scanned Image OCR',
                          reason: `Trang ${pageIndex + 1}: Bảng tính ngang trong bản scan đứng (${w}x${h}px)`,
                        };
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch {
    // ignore
  }

  // 5. Dự phòng theo hình học trang
  return {
    pageIndex,
    isLandscape: false,
    finalRotation: pageRotation,
    visualWidth: initialVisualW,
    visualHeight: initialVisualH,
    confidence: 0.85,
    dominantAngle: 0,
    method: 'Geometric Bounds',
    reason: `Trang ${pageIndex + 1}: Khổ dọc chuẩn (Portrait)`,
  };
}

/**
 * Quét toàn bộ các trang trong file PDF và trả về kết quả nhận diện khổ trang bằng AI cho từng trang
 */
export async function analyzePdfPagesOrientation(
  pdfBytes: ArrayBuffer | Uint8Array
): Promise<PageOrientationResult[]> {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const total = doc.getPageCount();
  const results: PageOrientationResult[] = [];
  for (let i = 0; i < total; i++) {
    results.push(await detectPageOrientationByText(doc.getPage(i), doc.context, i));
  }
  return results;
}

/**
 * 3. Backend Injection: Đọc toàn bộ các trang PDF, nhận diện khổ ngang/dọc độc lập cho từng trang bằng AI,
 * và dán tem giáp lai chân trang (Footer Stamp) với khoảng lề đáy an toàn chống mất tem khi in.
 */
export async function stampPdfWithFooterSeal(
  pdfBytes: ArrayBuffer | Uint8Array,
  options: FooterStampOptions
): Promise<Uint8Array> {
  const sourceDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const totalPages = sourceDoc.getPageCount();

  // Xác định danh sách các phòng ban ký duyệt và luôn sắp xếp theo đúng quy trình phê duyệt
  const rawSigners: FooterSignerInfo[] = (options.signers && options.signers.length > 0)
    ? options.signers
    : [{
        name: 'ĐỖ TRUNG HẢI',
        roleTitle: 'Tổng Giám Đốc',
        department: 'Ban Tổng Giám Đốc',
        signedAt: new Date().toISOString(),
        stepOrder: 1,
      }];

  const signersToStamp = sortSignersByApprovalOrder(rawSigners);
  const count = signersToStamp.length;
  const { stampWidth, stampHeight } = getFooterStampDimensions(count);
  const marginRight = options.customMarginRight ?? 20;

  // Lề đáy an toàn cho máy in: Luôn tối thiểu 18pt (~6.35mm) để các máy in văn phòng (HP, Canon, Brother, Epson)
  // tuyệt đối không bị cắt mất chân tem khi in ra giấy!
  const safeMarginBottom = Math.max(18, options.customMarginBottom ?? 18);

  // Tạo tài liệu xuất chuẩn hóa, đồng bộ chiều hướng từng trang độc lập (hỗ trợ trang dọc xen kẽ trang ngang)
  const outputDoc = await PDFDocument.create();

  for (let i = 0; i < totalPages; i++) {
    const sourcePage = sourceDoc.getPage(i);
    const { width: rawW, height: rawH } = sourcePage.getSize();
    const rawRot = (sourcePage.getRotation().angle % 360 + 360) % 360;

    // 1. Nhận diện khổ trang và góc xoay chuẩn hóa CHO TỪNG TRANG RIÊNG BIỆT
    let isLandscape: boolean;
    let baseRotation: number;

    // Xem trang i này có bị ghi đè riêng không:
    const pageOverride = options.pageOrientationOverrides?.[i];
    const effectiveMode = pageOverride || options.pageOrientationMode || (options.autoDetectTextOrientation !== false ? 'AUTO' : 'SOURCE');

    if (effectiveMode === 'LANDSCAPE') {
      isLandscape = true;
      baseRotation = rawW < rawH ? 90 : 0;
    } else if (effectiveMode === 'PORTRAIT') {
      isLandscape = false;
      baseRotation = rawW > rawH ? 90 : 0;
    } else if (effectiveMode === 'AUTO') {
      // Phân tích độc lập nội dung của chính trang i này:
      const aiResult = await detectPageOrientationByText(sourcePage, sourceDoc.context, i);
      isLandscape = aiResult.isLandscape;
      baseRotation = aiResult.finalRotation;
    } else {
      const initialVisualW = (rawRot === 90 || rawRot === 270) ? rawH : rawW;
      const initialVisualH = (rawRot === 90 || rawRot === 270) ? rawW : rawH;
      isLandscape = initialVisualW > initialVisualH;
      baseRotation = rawRot;
    }

    // Góc xoay bổ sung riêng của trang i (nếu có) hoặc góc xoay chung
    const pageRot = (options.pageRotations?.[i] ?? options.manualRotation ?? 0) % 360;
    const finalRot = (baseRotation + pageRot + 360) % 360;

    // Kích thước trực quan thực tế của trang i xuất ra theo góc xoay finalRot
    let visualWidth: number;
    let visualHeight: number;
    if (finalRot === 90 || finalRot === 270) {
      visualWidth = rawH;
      visualHeight = rawW;
    } else {
      visualWidth = rawW;
      visualHeight = rawH;
    }

    // 2. Tạo trang mới với kích thước chuẩn hóa của riêng trang này (Dọc hoặc Ngang)
    const [embeddedPage] = await outputDoc.embedPages([sourcePage]);
    const newPage = outputDoc.addPage([visualWidth, visualHeight]);

    const pageNumber = i + 1;
    const isTargetPage = options.applyToAllPages || pageNumber === totalPages;

    let scale = 1;
    let offsetBottom = 0;

    if (isTargetPage && options.marginMode === 'SAFE_SCALE') {
      // Co an toàn: chừa khoảng trống đáy >= 50pt cho tem giáp lai 30pt
      if (visualWidth > visualHeight) {
        scale = 0.895;
        offsetBottom = 50;
      } else {
        scale = 0.925;
        offsetBottom = 52;
      }
    }

    const sW = rawW * scale;
    const sH = rawH * scale;

    let scaledW_drawn: number;
    let scaledH_drawn: number;
    if (finalRot === 90 || finalRot === 270) {
      scaledW_drawn = sH;
      scaledH_drawn = sW;
    } else {
      scaledW_drawn = sW;
      scaledH_drawn = sH;
    }

    const offsetX = (visualWidth - scaledW_drawn) / 2;
    const offsetY = offsetBottom;

    // Vẽ nội dung trang gốc chuẩn hóa tọa độ chính xác cho cả 4 góc xoay
    if (finalRot === 0) {
      newPage.drawPage(embeddedPage, {
        x: offsetX,
        y: offsetY,
        width: sW,
        height: sH,
        rotate: degrees(0),
      });
    } else if (finalRot === 90) {
      // Xoay 90° xuôi chiều kim đồng hồ: điểm gốc cần cộng thêm chiều cao sW
      newPage.drawPage(embeddedPage, {
        x: offsetX,
        y: offsetY + sW,
        width: sW,
        height: sH,
        rotate: degrees(-90),
      });
    } else if (finalRot === 180) {
      newPage.drawPage(embeddedPage, {
        x: offsetX + sW,
        y: offsetY + sH,
        width: sW,
        height: sH,
        rotate: degrees(180),
      });
    } else if (finalRot === 270) {
      newPage.drawPage(embeddedPage, {
        x: offsetX + sH,
        y: offsetY,
        width: sW,
        height: sH,
        rotate: degrees(90),
      });
    }

    if (isTargetPage) {
      // 3. Tạo hình ảnh tem giáp lai chân trang (các phòng ban tách rời nhau, sắp xếp theo quy trình)
      const stampDataUri = await createFooterStampCanvas(
        signersToStamp,
        options.documentCode,
        pageNumber,
        totalPages
      );
      const base64 = stampDataUri.replace(/^data:image\/png;base64,/, '');
      const stampBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const stampImage = await outputDoc.embedPng(stampBytes);

      // 4. Vị trí dán tem:
      // Luôn đặt ở góc dưới bên phải theo hướng nhìn thực tế của trang (bên dưới chữ ký của bảng tính ngang)
      // stampY luôn >= 18pt (chuẩn an toàn phần cứng của mọi máy in văn phòng)
      const stampX = Math.max(15, visualWidth - stampWidth - marginRight);
      const stampY = safeMarginBottom;

      newPage.drawImage(stampImage, {
        x: stampX,
        y: stampY,
        width: stampWidth,
        height: stampHeight,
      });
    }
  }

  return await outputDoc.save();
}

/**
 * 3. Chuẩn hóa tệp tải lên (.docx, .xlsx, ảnh, .pdf) sang chuẩn PDF
 * Đảm bảo hệ thống luôn xử lý đồng bộ trên một định dạng PDF thống nhất
 */
export async function normalizeFileToPdf(file: File): Promise<{
  pdfBytes: Uint8Array;
  fileName: string;
  isConverted: boolean;
}> {
  const fileNameLower = file.name.toLowerCase();

  // Kiểm tra nếu là file PDF tải lên
  const buf = await file.arrayBuffer();
  const h = new Uint8Array(buf.slice(0, 4));
  const isPdf = (h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46) || fileNameLower.endsWith('.pdf') || file.type === 'application/pdf';

  if (isPdf) {
    return {
      pdfBytes: new Uint8Array(buf),
      fileName: file.name,
      isConverted: false,
    };
  }

  throw new Error('Hệ thống không chuyển đổi file Word/Excel. Tính năng đóng dấu giáp lai chỉ áp dụng cho tệp định dạng .PDF tải lên.');
}

/**
 * 4. Tạo file PDF chuẩn từ hồ sơ DocumentItem (khi chưa có file đính kèm thực tế)
 */
export async function createStandardDocumentPdf(doc: DocumentItem): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  const a4Width = 595.28;
  const a4Height = 841.89;

  for (let p = 1; p <= 2; p++) {
    const page = pdfDoc.addPage([a4Width, a4Height]);

    // Viền khung văn bản trang trọng
    page.drawRectangle({
      x: 36,
      y: 36,
      width: a4Width - 72,
      height: a4Height - 72,
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 1,
    });

    // Header Quốc hiệu & Tiêu ngữ
    page.drawText('CONG TY CO PHAN XAY DUNG VA DAU TU TRUNG HAI', {
      x: 48,
      y: a4Height - 65,
      size: 9,
      font: helveticaBold,
      color: rgb(0.1, 0.15, 0.25),
    });

    page.drawText(toSafePdfAscii(`So: ${doc.code || 'BM-2026/TH'} - He thong DMS`), {
      x: 48,
      y: a4Height - 78,
      size: 8,
      font: helvetica,
      color: rgb(0.4, 0.45, 0.55),
    });

    page.drawText('CONG HOA XA HOI CHU NGHIA VIET NAM', {
      x: a4Width - 250,
      y: a4Height - 65,
      size: 9,
      font: helveticaBold,
      color: rgb(0.1, 0.15, 0.25),
    });

    page.drawText('Doc lap - Tu do - Hanh phuc', {
      x: a4Width - 215,
      y: a4Height - 78,
      size: 8,
      font: timesRoman,
      color: rgb(0.3, 0.35, 0.45),
    });

    page.drawLine({
      start: { x: a4Width - 210, y: a4Height - 82 },
      end: { x: a4Width - 110, y: a4Height - 82 },
      thickness: 0.8,
      color: rgb(0.5, 0.55, 0.65),
    });

    page.drawLine({
      start: { x: 48, y: a4Height - 95 },
      end: { x: a4Width - 48, y: a4Height - 95 },
      thickness: 1,
      color: rgb(0.8, 0.83, 0.88),
    });

    if (p === 1) {
      const safeTitle = toSafePdfAscii(doc.title || 'HO SO TRINH KY PHE DUYET').toUpperCase();
      page.drawText(safeTitle, {
        x: 60,
        y: a4Height - 140,
        size: 14,
        font: helveticaBold,
        color: rgb(0.08, 0.12, 0.2),
      });

      const safeCategory = toSafePdfAscii(doc.category || 'To trinh');
      const safePriority = toSafePdfAscii(doc.priority || 'NORMAL');
      const safeDate = new Date(doc.createdAt).toLocaleDateString('en-GB');

      page.drawText(toSafePdfAscii(`Loai ho so: ${safeCategory} | Do khan: ${safePriority} | Ngay lap: ${safeDate}`), {
        x: 60,
        y: a4Height - 160,
        size: 9,
        font: helvetica,
        color: rgb(0.35, 0.4, 0.5),
      });

      page.drawText('NOI DUNG CHI TIET TRINH KY:', {
        x: 60,
        y: a4Height - 195,
        size: 10,
        font: helveticaBold,
        color: rgb(0.15, 0.2, 0.3),
      });

      const bodyLines = [
        '1. Can cu Quy che phan cap tham quyen phe duyet va chu truong dau tu cua Cong ty.',
        '2. Can cu vao ke hoach trien khai thi cong cong trinh va tien do giai ngan du an.',
        '3. Kinh trinh Ban Tong Giam Doc va cac Phong ban chuc nang xem xet phe duyet noi dung.',
        '4. Cac don vi phong ban chiu trach nhiem thuc hien theo dung quy dinh hien hanh.',
        '5. Ho so duoc trinh ky dien tu voi day du xac thuc chu ky so cua cac cap tham quyen.'
      ];

      bodyLines.forEach((line, i) => {
        page.drawText(line, {
          x: 60,
          y: a4Height - 225 - (i * 24),
          size: 9.5,
          font: helvetica,
          color: rgb(0.15, 0.18, 0.25),
        });
      });
    } else {
      page.drawText('PHU LUC CHI TIET & BANG DANH MUC HANG MUC (TRANG 2)', {
        x: 60,
        y: a4Height - 130,
        size: 13,
        font: helveticaBold,
        color: rgb(0.1, 0.15, 0.25),
      });

      page.drawText('Chi tiet cac hang muc vat tu, bien ban nghiem thu va bang ke thanh toan.', {
        x: 60,
        y: a4Height - 150,
        size: 9,
        font: helvetica,
        color: rgb(0.4, 0.45, 0.55),
      });
    }

    page.drawText(`Trang ${p} / 2`, {
      x: a4Width / 2 - 20,
      y: 48,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.55, 0.65),
    });
  }

  return await pdfDoc.save();
}

/**
 * 5. Tải về file PDF đã dán dấu giáp lai chân trang hoàn thiện
 */
export async function downloadFooterStampedPdf(
  doc: DocumentItem,
  existingPdfSource?: ArrayBuffer | Uint8Array | string | null,
  options?: Partial<FooterStampOptions>
): Promise<Uint8Array> {
  let sourceBytes: Uint8Array | ArrayBuffer;

  if (existingPdfSource && existingPdfSource !== '#') {
    if (typeof existingPdfSource === 'string') {
      if (existingPdfSource.startsWith('data:application/pdf;base64,')) {
        const base64 = existingPdfSource.replace('data:application/pdf;base64,', '');
        sourceBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      } else {
        const fetchUrl = getSecureFileUrl(existingPdfSource);
        const res = await fetch(fetchUrl);
        if (res.ok) {
          const buf = await res.arrayBuffer();
          const h = new Uint8Array(buf.slice(0, 4));
          const isPdf = h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46;
          if (isPdf) {
            sourceBytes = buf;
          } else {
            throw new Error('Tệp đính kèm không phải định dạng .PDF. Tính năng đóng dấu giáp lai chỉ áp dụng cho tệp .PDF tải lên.');
          }
        } else {
          throw new Error(`Không thể tải tệp PDF đính kèm từ máy chủ lưu trữ (Mã HTTP: ${res.status}).`);
        }
      }
    } else {
      sourceBytes = existingPdfSource;
    }
  } else {
    sourceBytes = await createStandardDocumentPdf(doc);
  }

  // Lấy danh sách các ban đã duyệt
  const approvedSteps = (doc.steps || []).filter(s => s.status === 'APPROVED');
  const signers: FooterSignerInfo[] = approvedSteps.map(s => ({
    name: s.approverName,
    roleTitle: s.approverTitle,
    department: s.department,
    signatureImage: s.signatureImage,
    signedAt: s.decisionDate,
  }));

  if (signers.length === 0) {
    signers.push({
      name: doc.creatorName || 'Người lập hồ sơ',
      roleTitle: doc.creatorTitle || 'Chuyên viên',
      department: doc.department,
      signedAt: doc.createdAt,
    });
  }

  const finalOptions: FooterStampOptions = {
    marginMode: options?.marginMode ?? 'SAFE_SCALE', // Mặc định dùng kịch bản B (Co an toàn)
    applyToAllPages: options?.applyToAllPages ?? true, // Mặc định giáp lai tất cả các trang
    documentCode: doc.code,
    documentTitle: doc.title,
    signers,
    customMarginBottom: options?.customMarginBottom ?? 18,
    customMarginRight: options?.customMarginRight ?? 20,
    autoDetectTextOrientation: options?.autoDetectTextOrientation ?? true,
  };

  const stampedBytes = await stampPdfWithFooterSeal(sourceBytes, finalOptions);

  // Kích hoạt tải về trên trình duyệt
  const blob = new Blob([stampedBytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${toSafePdfAscii(doc.code || 'TH_DOC').replace(/[^a-zA-Z0-9_-]/g, '_')}_Giap_Lai_Chan_Trang.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);

  return stampedBytes;
}
