"use client";

import {
  useCallback,
  type ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useToast } from "@/hooks/use-toast";
import {
  createComposerBlockId,
  isBlockedAttachment,
  parseJson,
  revokeBlobUrl,
} from "./publication-composer-utils";
import type {
  CommunityFeedItem,
  PublicationComposerBlock,
  PublicationComposerController,
  PublicationComposerMode,
} from "./types";

type UsePublicationComposerParams = {
  selectedCommunityId: string | null;
  selectedSpaceId: string | null;
  onPublished?: () => void;
};

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export function usePublicationComposer({
  selectedCommunityId,
  selectedSpaceId,
  onPublished,
}: UsePublicationComposerParams): PublicationComposerController {
  const { toast } = useToast();
  const [createPublicationOpen, setCreatePublicationOpen] = useState(false);
  const [composerMode, setComposerMode] =
    useState<PublicationComposerMode>("create");
  const [activeFeedItem, setActiveFeedItem] = useState<CommunityFeedItem | null>(
    null,
  );
  const [composerSpaceId, setComposerSpaceId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [publicationTitle, setPublicationTitle] = useState("");
  const [publicationCoverPath, setPublicationCoverPath] = useState("");
  const [publicationCoverUrl, setPublicationCoverUrl] = useState("");
  const [publicationBlocks, setPublicationBlocks] = useState<
    PublicationComposerBlock[]
  >([]);
  const [coverEditMode, setCoverEditMode] = useState(false);
  const [coverEditSrc, setCoverEditSrc] = useState("");
  const [uploadingCover, setUploadingCover] = useState(false);
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
  const [publishingPost, setPublishingPost] = useState(false);
  const isEditingPublication = composerMode === "edit";
  const isViewingPublication = composerMode === "view";
  const publicationBlocksRef = useRef<PublicationComposerBlock[]>([]);
  const publicationCoverPathRef = useRef("");
  const initialStoragePathsRef = useRef<Set<string>>(new Set());
  const pendingDeletePathsRef = useRef<Set<string>>(new Set());
  const imageDraftPreviewUrlRef = useRef("");
  const attachmentDraftRef = useRef<{
    file: File;
    fileName: string;
    sizeBytes: number;
    mimeType: string;
    fileUrl: string;
  } | null>(null);

  const publicationCanPublish = useMemo(
    () => publicationTitle.trim().length > 0,
    [publicationTitle],
  );

  useEffect(() => {
    publicationBlocksRef.current = publicationBlocks;
  }, [publicationBlocks]);

  useEffect(() => {
    publicationCoverPathRef.current = publicationCoverPath;
  }, [publicationCoverPath]);

  useEffect(() => {
    imageDraftPreviewUrlRef.current = imageDraftPreviewUrl;
  }, [imageDraftPreviewUrl]);

  useEffect(() => {
    attachmentDraftRef.current = attachmentDraft;
  }, [attachmentDraft]);

  function collectStoragePaths(
    blocks: PublicationComposerBlock[],
    coverPath?: string,
  ) {
    return Array.from(
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
  }

  const getUploadsEndpoint = useCallback(() => {
    if (!selectedCommunityId || !composerSpaceId) {
      throw new Error("Contexto da comunidade indisponível para upload.");
    }
    return `/api/communities/${selectedCommunityId}/spaces/${composerSpaceId}/uploads`;
  }, [composerSpaceId, selectedCommunityId]);

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

  const removePostsFile = useCallback(async (path: string) => {
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
  }, [getUploadsEndpoint]);

  const queueOrRemovePath = useCallback((path: string) => {
    if (!path) return;
    const isInitialPath = initialStoragePathsRef.current.has(path);
    if (isEditingPublication && isInitialPath) {
      pendingDeletePathsRef.current.add(path);
      return;
    }
    void removePostsFile(path);
  }, [isEditingPublication, removePostsFile]);

  const cleanupPublicationStorageFiles = useCallback((
    blocks: PublicationComposerBlock[],
    coverPath?: string,
  ) => {
    const initialPaths = initialStoragePathsRef.current;
    const paths = collectStoragePaths(blocks, coverPath).filter(
      (path) => !initialPaths.has(path),
    );
    if (!paths.length) return;
    paths.forEach((path) => {
      void removePostsFile(path);
    });
    pendingDeletePathsRef.current.clear();
  }, [removePostsFile]);

  useEffect(() => {
    return () => {
      cleanupPublicationStorageFiles(
        publicationBlocksRef.current,
        publicationCoverPathRef.current,
      );
      revokeBlobUrl(imageDraftPreviewUrlRef.current);
      if (attachmentDraftRef.current) {
        revokeBlobUrl(attachmentDraftRef.current.fileUrl);
      }
    };
  }, [cleanupPublicationStorageFiles]);

  function handleCoverFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      toast({
        title: "Arquivo muito grande",
        description: "A capa deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

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
        setCoverEditSrc(result);
        setCoverEditMode(true);
      }
    };
    reader.readAsDataURL(file);
  }

  async function applyPositionedCover(blob: Blob) {
    try {
      setUploadingCover(true);
      const file = new File([blob], "cover.jpg", { type: "image/jpeg" });
      const uploaded = await uploadFileToPostsStorage(file, "cover");

      if (publicationCoverPath) {
        queueOrRemovePath(publicationCoverPath);
      }

      setPublicationCoverPath(uploaded.path);
      setPublicationCoverUrl(uploaded.url);
      setCoverEditMode(false);
      setCoverEditSrc("");
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

  function cancelCoverEdit() {
    setCoverEditSrc("");
    setCoverEditMode(false);
  }

  async function removePublicationCover() {
    if (publicationCoverPath) {
      queueOrRemovePath(publicationCoverPath);
    }
    setPublicationCoverPath("");
    setPublicationCoverUrl("");
    setCoverEditSrc("");
    setCoverEditMode(false);
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
        queueOrRemovePath(removed.imagePath);
      }
      if (removed?.type === "attachment") {
        queueOrRemovePath(removed.filePath);
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

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

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

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      toast({
        title: "Arquivo muito grande",
        description: "O anexo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

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

  function openCreatePublication() {
    setComposerMode("create");
    setActiveFeedItem(null);
    setEditingPostId(null);
    setComposerSpaceId(selectedSpaceId);
    initialStoragePathsRef.current = new Set();
    pendingDeletePathsRef.current.clear();
    setPublicationTitle("");
    setPublicationCoverPath("");
    setPublicationCoverUrl("");
    setPublicationBlocks([]);
    setCoverEditMode(false);
    setCoverEditSrc("");
    setCreatePublicationOpen(true);
  }

  async function openPublication(
    item: CommunityFeedItem,
    mode: Extract<PublicationComposerMode, "view" | "edit">,
  ) {
    try {
      const endpoint = `/api/communities/${item.communityId}/spaces/${item.spaceId}/posts/${item.id}`;
      const payload = await parseJson<{
        item: {
          id: string;
          title: string;
          coverPath?: string | null;
          coverUrl?: string | null;
          authorName?: string | null;
          authorAvatarUrl?: string | null;
          createdAt?: string | null;
          blocks?: PublicationComposerBlock[];
          reactions?: CommunityFeedItem["reactions"];
        };
      }>(await fetch(endpoint, { cache: "no-store" }));

      const nextBlocks = Array.isArray(payload.item.blocks) ? payload.item.blocks : [];
      const nextCoverPath = payload.item.coverPath ?? "";
      initialStoragePathsRef.current = new Set(
        collectStoragePaths(nextBlocks, nextCoverPath || undefined),
      );
      pendingDeletePathsRef.current.clear();
      setComposerMode(mode);
      setActiveFeedItem({
        ...item,
        reactions: payload.item.reactions ?? item.reactions ?? [],
        authorName: payload.item.authorName ?? item.authorName ?? null,
        authorAvatarUrl:
          payload.item.authorAvatarUrl ?? item.authorAvatarUrl ?? null,
        createdAt: payload.item.createdAt ?? item.createdAt,
      });
      setEditingPostId(item.id);
      setComposerSpaceId(item.spaceId);
      setPublicationTitle(payload.item.title ?? "");
      setPublicationCoverPath(nextCoverPath);
      setPublicationCoverUrl(payload.item.coverUrl ?? "");
      setPublicationBlocks(nextBlocks);
      setCoverEditMode(false);
      setCoverEditSrc("");
      setCreatePublicationOpen(true);
    } catch (error) {
      toast({
        title: "Erro ao carregar publicação",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os dados da publicação.",
        variant: "destructive",
      });
    }
  }

  async function openViewPublication(item: CommunityFeedItem) {
    await openPublication(item, "view");
  }

  async function openEditPublication(item: CommunityFeedItem) {
    await openPublication(item, "edit");
  }

  function startEditingCurrentPublication() {
    if (!editingPostId) return;
    setComposerMode("edit");
  }

  async function handlePublish() {
    if (!selectedCommunityId || !composerSpaceId) {
      toast({
        title: "Contexto indisponível",
        description: "Selecione uma comunidade e um espaço antes de publicar.",
        variant: "destructive",
      });
      return;
    }

    if (!publicationTitle.trim()) {
      toast({
        title: "Título obrigatório",
        description: "Informe um título para a publicação.",
        variant: "destructive",
      });
      return;
    }

    try {
      setPublishingPost(true);

      const endpoint = editingPostId
        ? `/api/communities/${selectedCommunityId}/spaces/${composerSpaceId}/posts/${editingPostId}`
        : `/api/communities/${selectedCommunityId}/spaces/${composerSpaceId}/posts`;
      const res = await fetch(endpoint, {
        method: editingPostId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: publicationTitle.trim(),
          coverPath: publicationCoverPath || null,
          coverUrl: publicationCoverUrl || null,
          blocks: publicationBlocks,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error ?? "Não foi possível publicar.");
      }

      if (pendingDeletePathsRef.current.size > 0) {
        pendingDeletePathsRef.current.forEach((path) => {
          void removePostsFile(path);
        });
      }

      toast(
        editingPostId
          ? {
              title: "Publicação atualizada",
              description: "A publicação foi atualizada com sucesso.",
            }
          : {
              title: "Publicação criada",
              description: "A publicação foi publicada com sucesso.",
            },
      );

      // Skip cleanup on success — files are now referenced by the publication.
      initialStoragePathsRef.current = new Set();
      pendingDeletePathsRef.current.clear();
      setPublicationTitle("");
      setPublicationCoverPath("");
      setPublicationCoverUrl("");
      setPublicationBlocks([]);
      setEditingPostId(null);
      setActiveFeedItem(null);
      setComposerMode("create");
      setComposerSpaceId(null);
      setCoverEditMode(false);
      setCoverEditSrc("");
      setCreatePublicationOpen(false);

      onPublished?.();
    } catch (error) {
      toast({
        title: editingPostId ? "Erro ao atualizar publicação" : "Erro ao publicar",
        description:
          error instanceof Error
            ? error.message
            : editingPostId
              ? "Não foi possível atualizar a publicação."
              : "Não foi possível criar a publicação.",
        variant: "destructive",
      });
    } finally {
      setPublishingPost(false);
    }
  }

  function resetComposer() {
    cleanupPublicationStorageFiles(publicationBlocks, publicationCoverPath);
    initialStoragePathsRef.current = new Set();
    pendingDeletePathsRef.current.clear();
    setPublicationTitle("");
    setPublicationCoverPath("");
    setPublicationCoverUrl("");
    setPublicationBlocks([]);
    setEditingPostId(null);
    setActiveFeedItem(null);
    setComposerMode("create");
    setComposerSpaceId(null);
    setImageUploadDialogOpen(false);
    clearImageDraft();
    setAttachmentUploadDialogOpen(false);
    clearAttachmentDraft();
    setCoverEditMode(false);
    setCoverEditSrc("");
  }

  return {
    createPublicationOpen,
    setCreatePublicationOpen,
    openCreatePublication,
    openViewPublication,
    openEditPublication,
    startEditingCurrentPublication,
    composerMode,
    isViewingPublication,
    isEditingPublication,
    activeFeedItem,
    publishingPost,
    handlePublish,
    publicationTitle,
    setPublicationTitle,
    publicationCoverUrl,
    publicationBlocks,
    publicationCanPublish,
    coverEditMode,
    coverEditSrc,
    uploadingCover,
    applyPositionedCover,
    cancelCoverEdit,
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
