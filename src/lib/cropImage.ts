// Canvas-based crop, used by AvatarCropModal to turn a react-easy-crop pixel selection into an
// actual uploadable File before it ever reaches profile-client.ts's uploadAvatar.
"use client";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.src = src;
  });
}

export async function getCroppedImageFile(
  imageSrc: string,
  crop: { x: number; y: number; width: number; height: number },
  fileName: string
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas produced an empty blob"));
          return;
        }
        resolve(new File([blob], fileName, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
  });
}
