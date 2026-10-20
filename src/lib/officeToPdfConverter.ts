import { normalizeFileToPdf } from './pdfFooterStamper';

/**
 * Module chuyển đổi và chuẩn hóa tài liệu văn phòng (.docx, .xlsx, .pptx) và hình ảnh sang định dạng PDF chuẩn A4.
 * Đảm bảo 100% các tệp đính kèm được đồng bộ hóa thành PDF trước khi chuyển qua quy trình phê duyệt & đóng dấu giáp lai chân trang.
 */

export interface ConversionResult {
  pdfBytes: Uint8Array;
  fileName: string;
  isConverted: boolean;
}

/**
 * Chuẩn hóa tệp văn phòng hoặc ảnh sang PDF
 */
export async function convertOfficeOrImageToPdf(file: File): Promise<ConversionResult> {
  return await normalizeFileToPdf(file);
}

export { normalizeFileToPdf };
