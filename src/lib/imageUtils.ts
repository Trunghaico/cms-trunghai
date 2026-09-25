/**
 * Tiện ích xử lý ảnh (Image Processing Utilities) cho TRUNGHAI CMS
 * Hỗ trợ tự động cắt vuông, nén ảnh đại diện (WebP/JPEG) với dung lượng siêu nhẹ (< 30KB)
 * Đảm bảo tối ưu tốc độ truyền tải, không tràn bộ nhớ LocalStorage và lưu trữ an toàn trên Database MinIO NAS.
 */

export interface ProcessedImageResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Tự động cắt vuông ở tâm và nén ảnh đại diện
 * @param file Tệp ảnh do người dùng tải lên (File hoặc Blob)
 * @param maxDimension Kích thước cạnh vuông mong muốn (mặc định 256px)
 * @param quality Chất lượng nén 0.1 - 1.0 (mặc định 0.85)
 */
export const compressAndCropAvatar = async (
  file: File | Blob,
  maxDimension: number = 256,
  quality: number = 0.85
): Promise<ProcessedImageResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onerror = () => {
      reject(new Error('Không thể đọc dữ liệu tệp ảnh. Vui lòng thử lại.'));
    };

    reader.onload = (e) => {
      const img = new Image();
      
      img.onerror = () => {
        reject(new Error('Định dạng tệp ảnh không hợp lệ hoặc bị lỗi.'));
      };

      img.onload = () => {
        try {
          const originalWidth = img.naturalWidth || img.width;
          const originalHeight = img.naturalHeight || img.height;

          if (originalWidth <= 0 || originalHeight <= 0) {
            reject(new Error('Kích thước ảnh không hợp lệ.'));
            return;
          }

          // Cắt vùng vuông ở chính giữa bức ảnh (Center Crop)
          const cropSize = Math.min(originalWidth, originalHeight);
          const cropX = (originalWidth - cropSize) / 2;
          const cropY = (originalHeight - cropSize) / 2;

          const targetSize = Math.min(cropSize, maxDimension);

          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Trình duyệt không hỗ trợ xử lý Canvas 2D.'));
            return;
          }

          // Kích hoạt thuật toán làm mịn và tái lấy mẫu chất lượng cao
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.drawImage(
            img,
            cropX,
            cropY,
            cropSize,
            cropSize,
            0,
            0,
            targetSize,
            targetSize
          );

          // Tạo định dạng WebP (ưu tiên) hoặc fallback sang JPEG
          let format = 'image/webp';
          let dataUrl = '';
          try {
            dataUrl = canvas.toDataURL(format, quality);
            if (!dataUrl.startsWith('data:image/webp')) {
              format = 'image/jpeg';
              dataUrl = canvas.toDataURL(format, quality);
            }
          } catch {
            format = 'image/jpeg';
            dataUrl = canvas.toDataURL(format, quality);
          }

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({
                  blob,
                  dataUrl,
                  width: targetSize,
                  height: targetSize,
                  sizeBytes: blob.size,
                });
              } else {
                // Fallback nếu browser không xuất được blob từ webp
                canvas.toBlob(
                  (fallbackBlob) => {
                    if (fallbackBlob) {
                      const fallbackDataUrl = canvas.toDataURL('image/jpeg', quality);
                      resolve({
                        blob: fallbackBlob,
                        dataUrl: fallbackDataUrl,
                        width: targetSize,
                        height: targetSize,
                        sizeBytes: fallbackBlob.size,
                      });
                    } else {
                      reject(new Error('Không thể tạo nhị phân ảnh từ Canvas.'));
                    }
                  },
                  'image/jpeg',
                  quality
                );
              }
            },
            format,
            quality
          );
        } catch (err: any) {
          reject(new Error(err.message || 'Lỗi khi xử lý nén ảnh đại diện.'));
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};
