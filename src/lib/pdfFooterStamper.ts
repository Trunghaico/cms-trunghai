import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
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

export interface FooterStampOptions {
  marginMode: 'STANDARD' | 'SAFE_SCALE'; // 'STANDARD' (Trường hợp A) | 'SAFE_SCALE' (Trường hợp B: co 94% + nâng lên)
  applyToAllPages: boolean; // true = giáp lai mọi trang, false = chỉ trang cuối
  signers?: FooterSignerInfo[];
  documentCode: string;
  documentTitle?: string;
  customMarginBottom?: number; // Mặc định 12pt
  customMarginRight?: number;  // Mặc định 20pt
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
  const badgeH = 28; // Chiều cao thu gọn 28pt (thay vì 38pt cồng kềnh trước đây)
  const gap = 6;     // Khoảng cách trống hoàn toàn giữa các con dấu phòng ban tách rời nhau
  const stampWidth = count === 1 ? badgeW : (count * badgeW + (count - 1) * gap);
  const stampHeight = badgeH;
  return { badgeW, badgeH, gap, stampWidth, stampHeight };
}

/**
 * 1. Tạo hình ảnh tem giáp lai chân trang (Footer Stamp Badge) bằng HTML5 Canvas
 * - Luôn sắp xếp theo thứ tự quy trình phê duyệt (B1, B2, B3...)
 * - Mỗi dấu phòng ban TÁCH RỜI NHAU hoàn toàn (có khoảng trống trong suốt ở giữa)
 * - Thu nhỏ gọn gàng (cao 28pt), hiển thị cực kỳ sắc nét ở tỷ lệ 3x DPI chuẩn tiếng Việt
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
    ctx.fillText(`[B${stepNum}] ${cleanDept}`, textX, badgeY + 8);

    // Dòng 2: Họ và tên người phê duyệt
    let signerName = signer.name || 'Người phê duyệt';
    if (signerName.length > 18) {
      signerName = signerName.slice(0, 17) + '…';
    }
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 6.8px "Segoe UI", Arial, sans-serif';
    ctx.fillText(signerName, textX, badgeY + 16.5);

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
    ctx.font = '500 5.2px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`${roleTitle} • ${dateStr}`, textX, badgeY + 24);

    // Chữ ký tay nét mờ nếu có chữ ký ảnh riêng
    if (signer.signatureImage && signer.signatureImage.length > 50 && signer.signatureImage.startsWith('data:image')) {
      try {
        const img = new Image();
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 500);
          img.onload = () => {
            clearTimeout(timer);
            resolve();
          };
          img.onerror = () => {
            clearTimeout(timer);
            resolve();
          };
          img.src = signer.signatureImage!;
        });
        if (img.width > 0) {
          ctx.save();
          ctx.globalAlpha = 0.22;
          ctx.drawImage(img, badgeX + badgeW - 32, badgeY + 3, 30, 22);
          ctx.restore();
        }
      } catch {
        // Bỏ qua lỗi ảnh
      }
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * 2. Backend Injection: Đọc toàn bộ các trang PDF, tính toán kích thước thực tế
 * và dán tem giáp lai chân trang (Footer Stamp) của các phòng ban phê duyệt
 * (Các dấu phòng ban tách rời nhau, tự động sắp xếp theo thứ tự quy trình)
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
  const marginBottom = options.customMarginBottom ?? 12;

  // Tạo tài liệu xuất chuẩn hóa, đồng bộ chiều hướng từng trang (khổ dọc / khổ ngang)
  const outputDoc = await PDFDocument.create();

  for (let i = 0; i < totalPages; i++) {
    const sourcePage = sourceDoc.getPage(i);
    const { width: rawW, height: rawH } = sourcePage.getSize();
    const rot = (sourcePage.getRotation().angle % 360 + 360) % 360;

    // 1. Nhận diện chính xác kích thước và hướng nhìn thực tế của từng trang (Khổ dọc hay Khổ ngang)
    const visualWidth = (rot === 90 || rot === 270) ? rawH : rawW;
    const visualHeight = (rot === 90 || rot === 270) ? rawW : rawH;
    const isLandscape = visualWidth > visualHeight; // true = Khổ ngang, false = Khổ dọc

    // 2. Tạo trang mới với kích thước chuẩn hóa theo đúng hướng hiển thị (rotation = 0)
    const [embeddedPage] = await outputDoc.embedPages([sourcePage]);
    const newPage = outputDoc.addPage([visualWidth, visualHeight]);

    const pageNumber = i + 1;
    const isTargetPage = options.applyToAllPages || pageNumber === totalPages;

    if (isTargetPage) {
      let scale = 1;
      let scaledW = visualWidth;
      let scaledH = visualHeight;
      let offsetX = 0;
      let offsetY = 0;

      if (options.marginMode === 'SAFE_SCALE') {
        // Co lề an toàn:
        // - Với khổ ngang (Landscape): Chiều cao trang nhỏ hơn (~595pt), co 92% và chừa 36pt đáy
        // - Với khổ dọc (Portrait): Chiều cao trang lớn (~842pt), co 94% và chừa 38pt đáy
        if (isLandscape) {
          scale = 0.92;
          scaledW = visualWidth * scale;
          scaledH = visualHeight * scale;
          offsetX = (visualWidth - scaledW) / 2;
          offsetY = 36;
        } else {
          scale = 0.94;
          scaledW = visualWidth * scale;
          scaledH = visualHeight * scale;
          offsetX = (visualWidth - scaledW) / 2;
          offsetY = 38;
        }
      }

      // Vẽ nội dung trang gốc đã chuẩn hóa theo góc xoay rot:
      if (rot === 0) {
        newPage.drawPage(embeddedPage, {
          x: offsetX,
          y: offsetY,
          width: scaledW,
          height: scaledH,
        });
      } else if (rot === 90) {
        newPage.drawPage(embeddedPage, {
          x: offsetX,
          y: offsetY + scaledH,
          width: scaledH,
          height: scaledW,
          rotate: degrees(-90),
        });
      } else if (rot === 180) {
        newPage.drawPage(embeddedPage, {
          x: offsetX + scaledW,
          y: offsetY + scaledH,
          width: scaledW,
          height: scaledH,
          rotate: degrees(180),
        });
      } else if (rot === 270) {
        newPage.drawPage(embeddedPage, {
          x: offsetX + scaledW,
          y: offsetY,
          width: scaledH,
          height: scaledW,
          rotate: degrees(90),
        });
      }

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
      // - Nếu là KHỔ DỌC: dán ở đáy khổ dọc (X = visualWidth - stampW - marginRight, Y = 5 hoặc marginBottom)
      // - Nếu là KHỔ NGANG: dán ở đáy khổ ngang (X = visualWidth - stampW - marginRight, Y = 5 hoặc marginBottom)
      const stampX = Math.max(15, visualWidth - stampWidth - marginRight);
      const stampY = options.marginMode === 'SAFE_SCALE' ? 5 : marginBottom;

      newPage.drawImage(stampImage, {
        x: stampX,
        y: stampY,
        width: stampWidth,
        height: stampHeight,
      });
    } else {
      // Trang không dán tem thì vẽ nguyên bản chuẩn hóa theo đúng hướng hiển thị
      if (rot === 0) {
        newPage.drawPage(embeddedPage, {
          x: 0,
          y: 0,
          width: visualWidth,
          height: visualHeight,
        });
      } else if (rot === 90) {
        newPage.drawPage(embeddedPage, {
          x: 0,
          y: visualHeight,
          width: visualHeight,
          height: visualWidth,
          rotate: degrees(-90),
        });
      } else if (rot === 180) {
        newPage.drawPage(embeddedPage, {
          x: visualWidth,
          y: visualHeight,
          width: visualWidth,
          height: visualHeight,
          rotate: degrees(180),
        });
      } else if (rot === 270) {
        newPage.drawPage(embeddedPage, {
          x: visualWidth,
          y: 0,
          width: visualHeight,
          height: visualWidth,
          rotate: degrees(90),
        });
      }
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
    marginMode: options?.marginMode ?? 'SAFE_SCALE', // Mặc định dùng kịch bản B (Co 94% an toàn)
    applyToAllPages: options?.applyToAllPages ?? true, // Mặc định giáp lai tất cả các trang
    documentCode: doc.code,
    documentTitle: doc.title,
    signers,
    customMarginBottom: options?.customMarginBottom ?? 20,
    customMarginRight: options?.customMarginRight ?? 30,
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
