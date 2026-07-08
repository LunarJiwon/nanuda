"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { getCroppedImageFile } from "@/lib/cropImage";

/** Shown right after picking a profile photo file, before it's ever previewed/uploaded — crops to
 * a square (matching the circular avatar it becomes) and hands back a real File. */
export function AvatarCropModal({
  imageSrc,
  fileName,
  onCancel,
  onCropped,
}: {
  imageSrc: string;
  fileName: string;
  onCancel: () => void;
  onCropped: (file: File) => void;
}) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels || processing) return;
    setProcessing(true);
    try {
      const file = await getCroppedImageFile(imageSrc, croppedAreaPixels, fileName);
      onCropped(file);
    } catch (err) {
      console.error("[profile] avatar crop failed", err);
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center px-6">
      <div className="w-full max-w-[380px] bg-white rounded-[8px] p-[18px]">
        <h3 className="font-bold text-[15px] mb-[12px]">프로필 사진 자르기</h3>
        <div className="relative w-full h-[280px] bg-[#f2f0ec] rounded-[4px] overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full mt-[14px]"
          aria-label="확대/축소"
        />
        <div className="flex gap-[8px] mt-[16px]">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 border border-[#e0ded8] bg-white text-[#54524c] text-[13.5px] font-medium py-[10px] rounded-[3px] cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={processing}
            className="flex-1 border border-[#0e0e0e] bg-[#0e0e0e] text-white text-[13.5px] font-semibold py-[10px] rounded-[3px] disabled:opacity-60 cursor-pointer"
          >
            {processing ? "적용 중…" : "적용"}
          </button>
        </div>
      </div>
    </div>
  );
}
