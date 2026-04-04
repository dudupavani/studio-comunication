"use client";

import {
  type ChangeEvent,
  type SyntheticEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { type Crop, type PixelCrop } from "react-image-crop";

import { useToast } from "@/hooks/use-toast";
import {
  centerAspectCrop,
  createComposerBlockId,
  isBlockedAttachment,
  revokeBlobUrl,
} from "./publication-composer-utils";
import type {
  PublicationComposerBlock,
  PublicationComposerController,
} from "./types";

type UsePublicationComposerParams = {
  selectedCommunityId: string | null;
  selectedSpaceId: string | null;
};

export function usePublicationComposer({
  selectedCommunityId,
  selectedSpaceId,
}: UsePublicationComposerParams): PublicationComposerController {
  const { toast } = useToast();
  const [createPublicationOpen, setCreatePublicationOpen] = useState(false);
  const [publicationTitle, setPublicationTitle] = useState("");
  const [publicationCoverPath, setPublicationCoverPath] = useState("");
  const [publicationCoverUrl, setPublicationCoverUrl] = useState("");
  const [publicationBlocks, setPublicationBlocks] = useState<
    PublicationComposerBlock[]
  >([]);
  const [coverCropDialogOpen, setCoverCropDialogOpen] = useState(false);
  const [coverCropSrc, setCoverCropSrc] = useState("");
  const [coverCrop, setCoverCrop] = useState<Crop>();
  const [coverCompletedCrop, setCoverCompletedCrop] = useState<PixelCrop>();
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverImageRef = useRef<HTMLImageElement>(null);
  const [imageUploadDialogOpen, setImageUploadDialogOpen] = useState(false);
  const [imageDraftFile, setImageDraftFile] = useState<File | null>(null);
  const [imageDraftPreviewUrl, setImageDraftPreviewUrl] = useState("");
  const [imageDraftAlt, setImageDraftAlt] = useState("");
  const [uploadingImageDraft, setUploadingImageDraft] = useState(false);
  const [attachmentUploadDialogOpen, setAttachmentUploadDialogOpen] =
    useState(false);
  const [attachmentDraft, setAttachmentDraft] = useState<{
    file: File;
    fileName: string;
    sizeBytes: number;
    mimeType: string;
    fileUrl: string;
  } | null>(null);
  const [uploadingAttachmentDraft, setUploadingAttachmentDraft] =
    useState(false);

  const publicationCanPublish = useMemo(
    () => publicationTitle.trim().length > 0,
    [publicationTitle],
  );

  function getUploadsEndpoint() {
    if (!selectedCommunityId || !selectedSpaceId) {
      throw new Error("Contexto da comunidade indisponível para upload.");
    }
    return `/api/communities/${selectedCommunityId}/spaces/${selectedSpaceId}/uploads`;
  }

  async function uploadFileToPostsStorage(
    file: File,
    kind: "cover" | "image" | "attachment",
  ) {
    const endpoint = getUploadsEndpoint();
    const formData = new FormData();
    formData.append("kind", kind);
    formData.append("file", file);

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        payload?.error || "Não foi possível fazer upload do arquivo.",
      );
    }

    return payload.item as {
      kind: "cover" | "image" | "attachment";
      path: string;
      url: string;
      mimeType: string;
      fileName: string;
      sizeBytes: number;
    };
  }

  async function removePostsFile(path: string) {
    if (!path) return;
    try {
      const endpoint = getUploadsEndpoint();
      await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
    } catch {
      // ignore cleanup failures
    }
  }

  function cleanupPublicationStorageFiles(
    blocks: PublicationComposerBlock[],
    coverPath?: string,
  ) {
    const paths = Array.from(
      new Set(
        [
          ...blocks.flatMap((block) => {
            if (block.type === "image") return [block.imagePath];
            if (block.type === "attachment") return [block.filePath];
            return [];
          }),
          ...(coverPath ? [coverPath] : []),
        ].filter(Boolean),
      ),
    );
    if (!paths.length) return;
    paths.forEach((path) => {
      void removePostsFile(path);
    });
  }

  function clearCoverCropState() {
    setCoverCropSrc("");
    setCoverCrop(undefined);
    setCoverCompletedCrop(undefined);
  }

  function handleCoverImageLoad(event: SyntheticEvent<HTMLImageElement>) {
    const { width, height } = event.currentTarget;
    setCoverCrop(centerAspectCrop(width, height, 16 / 9));
  }

  function getCroppedImageBlob(
    image: HTMLImageElement,
    crop: PixelCrop,
  ): Promise<Blob> {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Não foi possível iniciar o crop da imagem.");
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = Math.max(1, Math.floor(crop.width * pixelRatio));
    canvas.height = Math.max(1, Math.floor(crop.height * pixelRatio));
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
      crop.height,
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Não foi possível gerar a imagem recortada."));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        0.92,
      );
    });
  }

  function handleCoverFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Arquivo inválido",
        description: "Selecione um arquivo de imagem válido.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setCoverCropSrc(result);
        setCoverCropDialogOpen(true);
      }
    };
    reader.readAsDataURL(file);
  }

  async function saveCoverFromCrop() {
    if (
      !coverCompletedCrop?.width ||
      !coverCompletedCrop?.height ||
      !coverImageRef.current
    ) {
      return;
    }

    try {
      setUploadingCover(true);
      const croppedBlob = await getCroppedImageBlob(
        coverImageRef.current,
        coverCompletedCrop,
      );
      const file = new File([croppedBlob], `cover-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      const uploaded = await uploadFileToPostsStorage(file, "cover");

      if (publicationCoverPath) {
        await removePostsFile(publicationCoverPath);
      }

      setPublicationCoverPath(uploaded.path);
      setPublicationCoverUrl(uploaded.url);
      setCoverCropDialogOpen(false);
      clearCoverCropState();
    } catch (error) {
      toast({
        title: "Falha ao enviar capa",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar a capa da publicação.",
        variant: "destructive",
      });
    } finally {
      setUploadingCover(false);
    }
  }

  async function removePublicationCover() {
    if (publicationCoverPath) {
      await removePostsFile(publicationCoverPath);
    }
    setPublicationCoverPath("");
    setPublicationCoverUrl("");
  }

  function addTextBlock() {
    setPublicationBlocks((current) => [
      ...current,
      {
        id: createComposerBlockId(),
        type: "text",
        content: "",
      },
    ]);
  }

  function addImageBlock(payload: {
    imagePath: string;
    imageUrl: string;
    alt: string;
  }) {
    setPublicationBlocks((current) => [
      ...current,
      {
        id: createComposerBlockId(),
        type: "image",
        imagePath: payload.imagePath,
        imageUrl: payload.imageUrl,
        alt: payload.alt,
      },
    ]);
  }

  function addAttachmentBlock(payload: {
    fileName: string;
    sizeBytes: number;
    mimeType: string;
    filePath: string;
    fileUrl: string;
  }) {
    setPublicationBlocks((current) => [
      ...current,
      {
        id: createComposerBlockId(),
        type: "attachment",
        fileName: payload.fileName,
        sizeBytes: payload.sizeBytes,
        mimeType: payload.mimeType,
        filePath: payload.filePath,
        fileUrl: payload.fileUrl,
      },
    ]);
  }

  function updateTextBlock(blockId: string, content: string) {
    setPublicationBlocks((current) =>
      current.map((block) =>
        block.id === blockId && block.type === "text"
          ? { ...block, content }
          : block,
      ),
    );
  }

  function updateImageBlock(blockId: string, value: string) {
    setPublicationBlocks((current) =>
      current.map((block) =>
        block.id === blockId && block.type === "image"
          ? { ...block, alt: value }
          : block,
      ),
    );
  }

  function removePublicationBlock(blockId: string) {
    setPublicationBlocks((current) => {
      const removed = current.find((block) => block.id === blockId);
      if (removed?.type === "image") {
        void removePostsFile(removed.imagePath);
      }
      if (removed?.type === "attachment") {
        void removePostsFile(removed.filePath);
      }
      return current.filter((block) => block.id !== blockId);
    });
  }

  function clearImageDraft() {
    setImageDraftFile(null);
    setImageDraftAlt("");
    setImageDraftPreviewUrl((current) => {
      revokeBlobUrl(current);
      return "";
    });
  }

  function openImageUploadDialog() {
    clearImageDraft();
    setImageUploadDialogOpen(true);
  }

  function clearAttachmentDraft() {
    setAttachmentDraft((current) => {
      if (current) {
        revokeBlobUrl(current.fileUrl);
      }
      return null;
    });
  }

  function openAttachmentUploadDialog() {
    clearAttachmentDraft();
    setAttachmentUploadDialogOpen(true);
  }

  function handleImageDraftFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Arquivo inválido",
        description: "Selecione um arquivo de imagem válido.",
        variant: "destructive",
      });
      return;
    }

    clearImageDraft();
    setImageDraftFile(file);
    setImageDraftPreviewUrl(URL.createObjectURL(file));
  }

  function handleAttachmentDraftFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (isBlockedAttachment(file)) {
      toast({
        title: "Arquivo não permitido",
        description:
          "Não é permitido anexar arquivos executáveis ou arquivos .zip.",
        variant: "destructive",
      });
      return;
    }

    clearAttachmentDraft();
    const fileUrl = URL.createObjectURL(file);
    setAttachmentDraft({
      file,
      fileName: file.name,
      sizeBytes: file.size,
      mimeType: file.type || "application/octet-stream",
      fileUrl,
    });
  }

  async function insertImageBlockFromDraft() {
    if (!imageDraftFile) return;

    try {
      setUploadingImageDraft(true);
      const uploaded = await uploadFileToPostsStorage(imageDraftFile, "image");
      addImageBlock({
        imagePath: uploaded.path,
        imageUrl: uploaded.url,
        alt: imageDraftAlt.trim(),
      });
      setImageUploadDialogOpen(false);
      clearImageDraft();
    } catch (error) {
      toast({
        title: "Falha ao enviar imagem",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível fazer upload da imagem.",
        variant: "destructive",
      });
    } finally {
      setUploadingImageDraft(false);
    }
  }

  async function insertAttachmentBlockFromDraft() {
    if (!attachmentDraft) return;

    try {
      setUploadingAttachmentDraft(true);
      const uploaded = await uploadFileToPostsStorage(
        attachmentDraft.file,
        "attachment",
      );
      addAttachmentBlock({
        fileName: attachmentDraft.fileName,
        sizeBytes: attachmentDraft.sizeBytes,
        mimeType: attachmentDraft.mimeType,
        filePath: uploaded.path,
        fileUrl: uploaded.url,
      });
      setAttachmentUploadDialogOpen(false);
      clearAttachmentDraft();
    } catch (error) {
      toast({
        title: "Falha ao enviar anexo",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível fazer upload do anexo.",
        variant: "destructive",
      });
    } finally {
      setUploadingAttachmentDraft(false);
    }
  }

  function resetComposer() {
    cleanupPublicationStorageFiles(publicationBlocks, publicationCoverPath);
    setPublicationTitle("");
    setPublicationCoverPath("");
    setPublicationCoverUrl("");
    setPublicationBlocks([]);
    setImageUploadDialogOpen(false);
    clearImageDraft();
    setAttachmentUploadDialogOpen(false);
    clearAttachmentDraft();
    setCoverCropDialogOpen(false);
    clearCoverCropState();
  }

  return {
    createPublicationOpen,
    setCreatePublicationOpen,
    publicationTitle,
    setPublicationTitle,
    publicationCoverUrl,
    publicationBlocks,
    publicationCanPublish,
    coverCropDialogOpen,
    setCoverCropDialogOpen,
    coverCropSrc,
    coverCrop,
    setCoverCrop,
    setCoverCompletedCrop,
    coverImageRef,
    uploadingCover,
    imageUploadDialogOpen,
    setImageUploadDialogOpen,
    imageDraftFile,
    imageDraftPreviewUrl,
    imageDraftAlt,
    setImageDraftAlt,
    uploadingImageDraft,
    attachmentUploadDialogOpen,
    setAttachmentUploadDialogOpen,
    attachmentDraft,
    uploadingAttachmentDraft,
    addTextBlock,
    openImageUploadDialog,
    openAttachmentUploadDialog,
    removePublicationCover,
    handleCoverFileInput,
    clearCoverCropState,
    handleCoverImageLoad,
    saveCoverFromCrop,
    updateTextBlock,
    updateImageBlock,
    removePublicationBlock,
    clearImageDraft,
    handleImageDraftFile,
    insertImageBlockFromDraft,
    clearAttachmentDraft,
    handleAttachmentDraftFile,
    insertAttachmentBlockFromDraft,
    resetComposer,
  };
}
