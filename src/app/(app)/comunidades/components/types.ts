import type { Crop, PixelCrop } from "react-image-crop";
import type {
  ChangeEvent,
  MutableRefObject,
  SyntheticEvent,
} from "react";

export type CommunityVisibility = "global" | "segmented";
export type SegmentType = "group" | "team";
export type SpaceType = "publicacoes" | "eventos";

export type SpaceItem = {
  id: string;
  communityId: string;
  orgId: string;
  name: string;
  spaceType: SpaceType;
  createdAt: string;
  updatedAt: string;
};

export type CommunityItem = {
  id: string;
  orgId: string;
  name: string;
  visibility: CommunityVisibility;
  segmentType: SegmentType | null;
  segmentTargetIds: string[];
  allowUnitMasterPost: boolean;
  allowUnitUserPost: boolean;
  spacesCount: number;
  canManage: boolean;
  canPost: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommunityDetail = Omit<CommunityItem, "spacesCount"> & {
  spaces: SpaceItem[];
};

export type SegmentOption = {
  id: string;
  name: string;
  membersCount?: number;
};

export type CommunityPayload = {
  name: string;
  visibility: CommunityVisibility;
  segmentType: SegmentType | null;
  segmentTargetIds: string[];
  allowUnitMasterPost: boolean;
  allowUnitUserPost: boolean;
};

export type SpacePayload = {
  name: string;
  spaceType: SpaceType;
};

export type PublicationComposerBlock =
  | {
      id: string;
      type: "text";
      content: string;
    }
  | {
      id: string;
      type: "image";
      imagePath: string;
      imageUrl: string;
      alt: string;
    }
  | {
      id: string;
      type: "attachment";
      fileName: string;
      sizeBytes: number;
      mimeType: string;
      filePath: string;
      fileUrl: string;
    };

export type CommunitiesModuleProps = {
  canManage: boolean;
  initialCommunityId?: string;
  initialSpaceId?: string;
};

export const DEFAULT_COMMUNITY_FORM: CommunityPayload = {
  name: "",
  visibility: "global",
  segmentType: null,
  segmentTargetIds: [],
  allowUnitMasterPost: true,
  allowUnitUserPost: false,
};

export const DEFAULT_SPACE_FORM: SpacePayload = {
  name: "",
  spaceType: "publicacoes",
};

export type PublicationComposerController = {
  createPublicationOpen: boolean;
  setCreatePublicationOpen: (open: boolean) => void;
  publicationTitle: string;
  setPublicationTitle: (value: string) => void;
  publicationCoverUrl: string;
  publicationBlocks: PublicationComposerBlock[];
  publicationCanPublish: boolean;
  coverCropDialogOpen: boolean;
  setCoverCropDialogOpen: (open: boolean) => void;
  coverCropSrc: string;
  coverCrop: Crop | undefined;
  setCoverCrop: (crop: Crop | undefined) => void;
  setCoverCompletedCrop: (crop: PixelCrop) => void;
  coverImageRef: MutableRefObject<HTMLImageElement | null>;
  uploadingCover: boolean;
  imageUploadDialogOpen: boolean;
  setImageUploadDialogOpen: (open: boolean) => void;
  imageDraftFile: File | null;
  imageDraftPreviewUrl: string;
  imageDraftAlt: string;
  setImageDraftAlt: (value: string) => void;
  uploadingImageDraft: boolean;
  attachmentUploadDialogOpen: boolean;
  setAttachmentUploadDialogOpen: (open: boolean) => void;
  attachmentDraft: {
    file: File;
    fileName: string;
    sizeBytes: number;
    mimeType: string;
    fileUrl: string;
  } | null;
  uploadingAttachmentDraft: boolean;
  addTextBlock: () => void;
  openImageUploadDialog: () => void;
  openAttachmentUploadDialog: () => void;
  removePublicationCover: () => Promise<void>;
  handleCoverFileInput: (event: ChangeEvent<HTMLInputElement>) => void;
  clearCoverCropState: () => void;
  handleCoverImageLoad: (event: SyntheticEvent<HTMLImageElement>) => void;
  saveCoverFromCrop: () => Promise<void>;
  updateTextBlock: (blockId: string, content: string) => void;
  updateImageBlock: (blockId: string, value: string) => void;
  removePublicationBlock: (blockId: string) => void;
  clearImageDraft: () => void;
  handleImageDraftFile: (event: ChangeEvent<HTMLInputElement>) => void;
  insertImageBlockFromDraft: () => Promise<void>;
  clearAttachmentDraft: () => void;
  handleAttachmentDraftFile: (
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
  insertAttachmentBlockFromDraft: () => Promise<void>;
  resetComposer: () => void;
};
