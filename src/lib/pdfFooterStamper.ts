import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { DocumentItem, ApprovalStep } from '../types';
import { formatDate } from './storage';
import { convertOfficeOrImageToPdf } from './officeToPdfConverter';

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
}

export interface FooterStampOptions {
  marginMode: 'STANDARD' | 'SAFE_SCALE'; // 'STANDARD' (Trường hợp A) | 'SAFE_SCALE' (Trường hợp B: co 94% + nâng lên)
  applyToAllPages: boolean; // true = giáp lai mọi trang, false = chỉ trang cuối
  signers?: FooterSignerInfo[];
  documentCode: string;
  documentTitle?: string;
  customMarginBottom?: number; // Mặc định 20pt
  customMarginRight?: number;  // Mặc định 30pt
}

/**
 * 1. Tạo hình ảnh tem giáp lai chân trang (Footer Stamp Badge) bằng HTML5 Canvas
 * Render ở tỷ lệ 3x DPI siêu nét, hỗ trợ phông chữ tiếng Việt UTF-8 chuẩn xác 100%
 */
export async function createFooterStampCanvas(
  signer: FooterSignerInfo,
  docCode: string,
  pageIndex: number,
  totalPages: number
): Promise<string> {
  const canvas = document.createElement('canvas');
  // Kích thước chuẩn cho tem giáp lai chân trang (230pt x 36pt @ 3x scale)
  const baseW = 230;
  const baseH = 36;
  const scale = 3;
  canvas.width = baseW * scale;
  canvas.height = baseH * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.scale(scale, scale);

  // 1. Nền thẻ tem với hiệu ứng bo góc mờ nhẹ (Glassmorphism trang trọng)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
  ctx.strokeStyle = '#dc2626'; // Đỏ mộc chuẩn nhận diện Trung Hải
  ctx.lineWidth = 1;

  const r = 4;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(baseW - r, 0);
  ctx.quadraticCurveTo(baseW, 0, baseW, r);
  ctx.lineTo(baseW, baseH - r);
  ctx.quadraticCurveTo(baseW, baseH, baseW - r, baseH);
  ctx.lineTo(r, baseH);
  ctx.quadraticCurveTo(0, baseH, 0, baseH - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Viền nét đứt bảo mật bên trong
  ctx.setLineDash([3, 2]);
  ctx.strokeStyle = 'rgba(220, 38, 38, 0.35)';
  ctx.strokeRect(2, 2, baseW - 4, baseH - 4);
  ctx.setLineDash([]);

  // 2. Huy hiệu dấu mộc tròn bên trái
  const circleX = 18;
  const circleY = baseH / 2;
  const circleR = 12;

  ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
  ctx.beginPath();
  ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
  ctx.stroke();

  // Dấu tick xanh hoặc chữ TH ở giữa
  ctx.fillStyle = '#059669';
  ctx.beginPath();
  ctx.arc(circleX, circleY, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(circleX - 3.5, circleY);
  ctx.lineTo(circleX - 1, circleY + 2.5);
  ctx.lineTo(circleX + 3.5, circleY - 2.5);
  ctx.stroke();

  // 3. Khối thông tin chi tiết
  const textX = 35;
  ctx.textAlign = 'left';

  // Dòng 1: Tiêu đề công ty & Xác thực
  ctx.fillStyle = '#991b1b';
  ctx.font = 'bold 7.5px "Segoe UI", Arial, sans-serif';
  ctx.fillText('CTY CP ĐẦU TƯ & XÂY DỰNG TRUNG HẢI', textX, 10);

  // Dòng 2: Người ký & Chức vụ
  const signerTitle = signer.roleTitle || 'Ban Phê Duyệt';
  const signerName = signer.name || 'Đại diện Trung Hải';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 8px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`✓ ĐÃ KÝ: ${signerName} (${signerTitle})`, textX, 20);

  // Dòng 3: Thời gian, Mã văn bản & Giáp lai số trang
  const timeStr = signer.signedAt 
    ? formatDate(signer.signedAt) 
    : new Date().toLocaleString('vi-VN', { hour12: false });
  ctx.fillStyle = '#64748b';
  ctx.font = '500 6.5px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`${timeStr} • ${docCode} • Trang ${pageIndex}/${totalPages}`, textX, 30);

  // 4. Nếu có chữ ký tay vẽ dạng Base64
  if (signer.signatureImage && signer.signatureImage.length > 50 && signer.signatureImage.startsWith('data:image')) {
    try {
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = signer.signatureImage!;
      });
      if (img.width > 0) {
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.drawImage(img, baseW - 55, 4, 48, 28);
        ctx.restore();
      }
    } catch {
      // Bỏ qua lỗi ảnh
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * 2. Backend Injection: Đọc toàn bộ các trang PDF, tính toán kích thước thực tế
 * và dán tem giáp lai chân trang (Footer Stamp) theo 2 kịch bản an toàn lề
 */
export async function stampPdfWithFooterSeal(
  pdfBytes: ArrayBuffer | Uint8Array,
  options: FooterStampOptions
): Promise<Uint8Array> {
  const sourceDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const totalPages = sourceDoc.getPageCount();

  // Xác định người ký đại diện (mặc định lấy người cuối cùng đã duyệt hoặc ban giám đốc)
  const primarySigner: FooterSignerInfo = (options.signers && options.signers.length > 0)
    ? options.signers[options.signers.length - 1]
    : {
        name: 'ĐỖ TRUNG HẢI',
        roleTitle: 'Tổng Giám Đốc',
        department: 'Ban Tổng Giám Đốc',
        signedAt: new Date().toISOString()
      };

  const stampWidth = 220; // pt
  const stampHeight = 34; // pt
  const marginRight = options.customMarginRight ?? 30; // 30pt
  const marginBottom = options.customMarginBottom ?? 20; // 20pt

  // =========================================================================
  // KỊCH BẢN B: NỘI DUNG TRÀN SÁT MÉP (ZERO-MARGIN / BẢNG BIỂU EXCEL SÁT ĐÁY)
  // Co nội dung gốc lại còn 94% và nâng nhẹ lên trên 38pt để lộ dải lề trắng tinh
  // =========================================================================
  if (options.marginMode === 'SAFE_SCALE') {
    const outputDoc = await PDFDocument.create();

    for (let i = 0; i < totalPages; i++) {
      const sourcePage = sourceDoc.getPage(i);
      const { width: pageWidth, height: pageHeight } = sourcePage.getSize();
      const pageNumber = i + 1;
      const isTargetPage = options.applyToAllPages || pageNumber === totalPages;

      const [embeddedPage] = await outputDoc.embedPages([sourcePage]);
      const newPage = outputDoc.addPage([pageWidth, pageHeight]);

      if (isTargetPage) {
        // Co nội dung lại 94% và nâng lên 38pt
        const scale = 0.94;
        const scaledW = pageWidth * scale;
        const scaledH = pageHeight * scale;
        const offsetX = (pageWidth - scaledW) / 2; // Căn giữa 2 bên
        const offsetY = 38; // Nâng lên 38pt từ đáy để lộ dải lề trắng tinh hoàn toàn không có chữ

        newPage.drawPage(embeddedPage, {
          x: offsetX,
          y: offsetY,
          width: scaledW,
          height: scaledH,
        });

        // Tạo tem giáp lai cho trang này
        const stampDataUri = await createFooterStampCanvas(
          primarySigner,
          options.documentCode,
          pageNumber,
          totalPages
        );
        const base64 = stampDataUri.replace(/^data:image\/png;base64,/, '');
        const stampBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const stampImage = await outputDoc.embedPng(stampBytes);

        // Đặt tem vào dải lề trắng an toàn ở chân trang: Y = 3pt
        const stampX = Math.max(10, pageWidth - stampWidth - marginRight);
        const stampY = 3;

        newPage.drawImage(stampImage, {
          x: stampX,
          y: stampY,
          width: stampWidth,
          height: stampHeight,
        });
      } else {
        // Trang không cần dán tem thì vẽ nguyên bản
        newPage.drawPage(embeddedPage, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        });
      }
    }

    return await outputDoc.save();
  }

  // =========================================================================
  // KỊCH BẢN A: VĂN BẢN CÓ LỀ TIÊU CHUẨN (STANDARD MARGIN >= 1.5 - 2CM)
  // Dán trực tiếp con dấu nhỏ vào vùng đáy: X = Width - stampW - 30pt; Y = 20pt
  // =========================================================================
  for (let i = 0; i < totalPages; i++) {
    const pageNumber = i + 1;
    const isTargetPage = options.applyToAllPages || pageNumber === totalPages;
    if (!isTargetPage) continue;

    const page = sourceDoc.getPage(i);
    const { width: pageWidth } = page.getSize();

    const stampDataUri = await createFooterStampCanvas(
      primarySigner,
      options.documentCode,
      pageNumber,
      totalPages
    );
    const base64 = stampDataUri.replace(/^data:image\/png;base64,/, '');
    const stampBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const stampImage = await sourceDoc.embedPng(stampBytes);

    const stampX = Math.max(10, pageWidth - stampWidth - marginRight);
    const stampY = marginBottom;

    page.drawImage(stampImage, {
      x: stampX,
      y: stampY,
      width: stampWidth,
      height: stampHeight,
    });
  }

  return await sourceDoc.save();
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

  // Trường hợp 1: Tệp đã là PDF sẵn
  if (fileNameLower.endsWith('.pdf') || file.type === 'application/pdf') {
    const buf = await file.arrayBuffer();
    return {
      pdfBytes: new Uint8Array(buf),
      fileName: file.name,
      isConverted: false,
    };
  }

  // Trường hợp 2: Tệp Office (.docx, .xlsx), hình ảnh hoặc văn bản khác
  // -> Phân tích cấu trúc thực tế và chuyển đổi sang PDF có nội dung và định dạng đầy đủ
  const convResult = await convertOfficeOrImageToPdf(file);
  return {
    pdfBytes: convResult.pdfBytes,
    fileName: convResult.fileName,
    isConverted: convResult.isConverted,
  };
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
        try {
          const res = await fetch(existingPdfSource);
          if (res.ok) {
            const buf = await res.arrayBuffer();
            const h = new Uint8Array(buf.slice(0, 4));
            const isPdf = h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46;
            if (isPdf) {
              sourceBytes = buf;
            } else {
              const fallbackName = typeof existingPdfSource === 'string'
                ? existingPdfSource.split('/').pop()?.split('?')[0] || `${doc.code}.docx`
                : `${doc.code}.docx`;
              const conv = await convertOfficeOrImageToPdf(new File([buf], fallbackName));
              sourceBytes = conv.pdfBytes;
            }
          } else {
            sourceBytes = await createStandardDocumentPdf(doc);
          }
        } catch {
          sourceBytes = await createStandardDocumentPdf(doc);
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
