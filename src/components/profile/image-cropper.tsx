// src/components/profile/image-cropper.tsx
"use client";

import { useState, useRef } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  Crop,
  PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react"; // Import the Trash2 icon

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropper({
  onCrop,
  preview,
  onRemove,
}: {
  onCrop: (blob: Blob) => void;
  preview: string | null;
  onRemove: () => void;
}) {
  const [imgSrc, setImgSrc] = useState("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number>(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener("load", () =>
        setImgSrc(reader.result?.toString() || "")
      );
      reader.readAsDataURL(e.target.files[0]);
      setIsModalOpen(true);

      // Reset the file input value to allow selecting the same file again
      e.target.value = "";
    }
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspect));
  }

  async function handleCrop() {
    if (completedCrop?.width && completedCrop?.height && imgRef.current) {
      const croppedImageUrl = await getCroppedImg(
        imgRef.current,
        completedCrop,
        "newFile.jpeg"
      );
      onCrop(croppedImageUrl);
      setIsModalOpen(false);
    }
  }

  function getCroppedImg(
    image: HTMLImageElement,
    crop: PixelCrop,
    fileName: string
  ): Promise<Blob> {
    const canvas = document.createElement("canvas");
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No 2d context");
    }

    const pixelRatio = window.devicePixelRatio;
    canvas.width = crop.width * pixelRatio;
    canvas.height = crop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas is empty"));
            return;
          }
          (blob as any).name = fileName;
          resolve(blob);
        },
        "image/jpeg",
        1
      );
    });
  }

  const handleRemove = () => {
    setImgSrc("");
    setCrop(undefined);
    setCompletedCrop(undefined);
    onRemove();
  };

  return (
    <div className="mb-8">
      <Input
        type="file"
        accept="image/*"
        onChange={onSelectFile}
        ref={fileInputRef}
        className="hidden"
      />
      <div className="relative">
        <div
          className="w-40 h-40 rounded-full border-2 border-white shadow-md flex items-center justify-center cursor-pointer"
          onClick={() => fileInputRef.current?.click()}>
          {preview ? (
            <Image
              src={preview}
              alt="Avatar preview"
              width={160}
              height={160}
              className="rounded-full object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full border-2 border-dashed hover:border-border hover:bg-accent transition rounded-full flex items-center justify-center text-muted-foreground">
              <span>Imagem de perfil</span>
            </div>
          )}
        </div>
        {preview && (
          <Button
            type="button"
            size="icon"
            className="absolute top-2 right-2 rounded-full w-8 h-8 bg-card border border-border text-foreground hover:bg-accent"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recortar Imagem</DialogTitle>
          </DialogHeader>
          {imgSrc && (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              minWidth={160}
              minHeight={160}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                alt="Prévia de recorte"
                src={imgSrc}
                onLoad={onImageLoad}
                style={{ maxHeight: "60vh" }}
                loading="lazy"
                decoding="async"
              />
            </ReactCrop>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrop}>Recortar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
