"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Loader2, Trash2, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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

const ASPECT = 16 / 9;
const MAX_WIDTH = 800;

type Props = {
  courseId: string;
  initialUrl?: string | null;
};

export function CourseCoverUploader({ courseId, initialUrl }: Props) {
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialUrl ?? null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [imgSrc, setImgSrc] = useState("");
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const hasCover = !!previewUrl;

  const onSelectFile = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImgSrc(reader.result?.toString() || "");
      setIsModalOpen(true);
      setCrop(undefined);
    });
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onSelectFile(file);
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, ASPECT));
  };

  const getCroppedBlob = useCallback(
    (image: HTMLImageElement, crop: PixelCrop): Promise<Blob> => {
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const originWidth = crop.width * scaleX;
      const originHeight = crop.height * scaleY;
      const scale = Math.min(1, MAX_WIDTH / originWidth);
      const targetWidth = originWidth * scale;
      const targetHeight = originHeight * scale;

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No canvas context");

      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        originWidth,
        originHeight,
        0,
        0,
        targetWidth,
        targetHeight
      );

      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Falha ao gerar imagem"));
              return;
            }
            resolve(blob);
          },
          "image/jpeg",
          0.92
        );
      });
    },
    []
  );

  const uploadBlob = async (blob: Blob) => {
    setUploading(true);
    try {
      const file = new File([blob], "cover.jpg", { type: "image/jpeg" });
      const formData = new FormData();
      formData.append("cover", file);

      const res = await fetch(`/api/learning/courses/${courseId}/cover`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Erro ao salvar capa");

      const url: string | null = json?.data?.coverUrl ?? null;
      if (url) {
        setPreviewUrl(url);
      }
      toast({ title: "Capa atualizada" });
    } catch (err: any) {
      toast({
        title: "Erro ao enviar imagem",
        description: String(err?.message || err),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCrop = async () => {
    if (completedCrop?.width && completedCrop?.height && imgRef.current) {
      const blob = await getCroppedBlob(imgRef.current, completedCrop);
      setIsModalOpen(false);
      await uploadBlob(blob);
    }
  };

  const removeCover = async () => {
    setUploading(true);
    try {
      const res = await fetch(`/api/learning/courses/${courseId}/cover`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Erro ao remover capa");
      setPreviewUrl(null);
      toast({ title: "Capa removida" });
    } catch (err: any) {
      toast({
        title: "Erro ao remover capa",
        description: String(err?.message || err),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const renderPreview = useMemo(() => {
    if (previewUrl) {
      return (
        <Image
          src={previewUrl}
          alt="Capa do curso"
          fill
          sizes="(max-width: 768px) 100vw, 800px"
          className="object-cover rounded-lg"
        />
      );
    }
    return (
      <div className="flex flex-col items-center justify-center text-center text-sm text-muted-foreground px-6">
        <UploadCloud className="h-8 w-8 mb-2" />
        <p className="font-medium">
          Arraste e solte uma imagem ou clique para selecionar
        </p>
        <p className="text-xs mt-2 text-muted-foreground">
          Dimensão recomendada 800×450px - Proporção 16:9
        </p>
      </div>
    );
  }, [previewUrl]);

  return (
    <div className="space-y-2 max-w-xl">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onSelectFile(e.target.files?.[0])}
      />

      <div
        className={cn(
          "relative flex justify-center items-center border-2 border-dashed rounded-lg aspect-video overflow-hidden transition",
          isDragging ? "border-primary bg-primary/5" : "border-gray-300"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}>
        {uploading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-white">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Processando...</span>
          </div>
        )}
        {hasCover && (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute top-2 right-2 z-10"
            onClick={(e) => {
              e.stopPropagation();
              removeCover();
            }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        {renderPreview}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Recortar capa</DialogTitle>
          </DialogHeader>
          {imgSrc ? (
            <div className="max-h-[70vh] overflow-auto">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={ASPECT}
                minWidth={50}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  alt="Pré-visualização"
                  src={imgSrc}
                  onLoad={onImageLoad}
                  style={{ maxHeight: "60vh" }}
                />
              </ReactCrop>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrop}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CourseCoverUploader;
