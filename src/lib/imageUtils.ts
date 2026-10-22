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

/**
 * Vẽ bản xem trước cắt ảnh đại diện tương tác với tâm căn chỉnh và mặt nạ tròn
 */
export const drawAvatarCropPreview = (
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  zoom: number,
  pan: { x: number; y: number },
  rotation: number = 0,
  viewportSize: number = 280
): void => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = viewportSize;
  canvas.height = viewportSize;

  ctx.clearRect(0, 0, viewportSize, viewportSize);

  // Nền tối
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, viewportSize, viewportSize);

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return;

  const baseScale = Math.max(viewportSize / w, viewportSize / h);
  const currentScale = baseScale * zoom;

  const drawW = w * currentScale;
  const drawH = h * currentScale;

  ctx.save();
  ctx.translate(viewportSize / 2 + pan.x, viewportSize / 2 + pan.y);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  // Mặt nạ che viền tròn
  ctx.save();
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.beginPath();
  ctx.rect(0, 0, viewportSize, viewportSize);
  const radius = (viewportSize - 16) / 2;
  ctx.arc(viewportSize / 2, viewportSize / 2, radius, 0, Math.PI * 2, true);
  ctx.fill();

  // Vòng tròn viền định hướng
  ctx.strokeStyle = '#38bdf8'; // sky-400
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(viewportSize / 2, viewportSize / 2, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Tâm chữ thập căn chỉnh chính giữa
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  // Trục dọc
  ctx.beginPath();
  ctx.moveTo(viewportSize / 2, viewportSize / 2 - 24);
  ctx.lineTo(viewportSize / 2, viewportSize / 2 + 24);
  ctx.stroke();

  // Trục ngang
  ctx.beginPath();
  ctx.moveTo(viewportSize / 2 - 24, viewportSize / 2);
  ctx.lineTo(viewportSize / 2 + 24, viewportSize / 2);
  ctx.stroke();

  // Điểm tâm trung tâm
  ctx.setLineDash([]);
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(viewportSize / 2, viewportSize / 2, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

/**
 * Xuất ảnh đại diện đã được người dùng tùy chỉnh góc căn giữa, phóng to/thu nhỏ sang định dạng chuẩn 256x256
 */
export const exportCustomCroppedAvatar = async (
  img: HTMLImageElement,
  zoom: number,
  pan: { x: number; y: number },
  rotation: number = 0,
  viewportSize: number = 280,
  targetSize: number = 256,
  quality: number = 0.85
): Promise<ProcessedImageResult> => {
  return new Promise((resolve, reject) => {
    try {
      const targetCanvas = document.createElement('canvas');
      targetCanvas.width = targetSize;
      targetCanvas.height = targetSize;
      const ctx = targetCanvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Trình duyệt không hỗ trợ Canvas 2D.'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) {
        reject(new Error('Kích thước ảnh không hợp lệ.'));
        return;
      }

      const baseScale = Math.max(viewportSize / w, viewportSize / h);
      const currentScale = baseScale * zoom;

      const ratio = targetSize / viewportSize;
      const drawW = w * currentScale * ratio;
      const drawH = h * currentScale * ratio;

      ctx.save();
      ctx.translate(targetSize / 2 + pan.x * ratio, targetSize / 2 + pan.y * ratio);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      let format = 'image/webp';
      let dataUrl = '';
      try {
        dataUrl = targetCanvas.toDataURL(format, quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          format = 'image/jpeg';
          dataUrl = targetCanvas.toDataURL(format, quality);
        }
      } catch {
        format = 'image/jpeg';
        dataUrl = targetCanvas.toDataURL(format, quality);
      }

      targetCanvas.toBlob(
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
            targetCanvas.toBlob(
              (fallbackBlob) => {
                if (fallbackBlob) {
                  const fallbackDataUrl = targetCanvas.toDataURL('image/jpeg', quality);
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
      reject(new Error(err.message || 'Lỗi khi xuất ảnh đại diện đã cắt.'));
    }
  });
};

/**
 * Nạp bất kỳ URL ảnh nào sang chuỗi DataURL cục bộ để xử lý trên Canvas không bị dính lỗi CORS
 */
export const loadImgToDataUrl = async (url: string): Promise<string> => {
  if (!url || url.startsWith('data:')) return url;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return url;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string || url);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
};
