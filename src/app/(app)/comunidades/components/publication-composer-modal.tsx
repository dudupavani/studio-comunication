"use client";

import { FileText, ImagePlus, Paperclip, Type, X } from "lucide-react";
import ReactCrop from "react-image-crop";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ExpandableModal } from "@/components/ui/web-components/expandable-modal";
import { formatFileSize } from "./publication-composer-utils";
import type { PublicationComposerController } from "./types";

type PublicationComposerModalProps = {
  composer: PublicationComposerController;
};

export function PublicationComposerModal({
  composer,
}: PublicationComposerModalProps) {
  return (
    <>
      <ExpandableModal
        open={composer.createPublicationOpen}
        onOpenChange={(open) => {
          composer.setCreatePublicationOpen(open);
          if (open && composer.publicationBlocks.length === 0) {
            composer.addTextBlock();
          }
          if (!open) {
            composer.resetComposer();
          }
        }}
        header={<h3>Criar publicação</h3>}
        bodyClassName="space-y-6 px-6 py-5"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-md"
                onClick={composer.addTextBlock}>
                <Type size={20} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-md"
                onClick={composer.openImageUploadDialog}>
                <ImagePlus size={20} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-md"
                onClick={composer.openAttachmentUploadDialog}>
                <Paperclip size={20} />
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {composer.publicationCanPublish
                  ? "Pronto para publicar quando a API estiver conectada."
                  : "Informe um título para habilitar a publicação."}
              </p>
              <Button type="button" disabled={!composer.publicationCanPublish}>
                Publicar (em breve)
              </Button>
            </div>
          </div>
        }>
        <div className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <Input
              id="create-publication-title"
              value={composer.publicationTitle}
              onChange={(event) => composer.setPublicationTitle(event.target.value)}
              placeholder="Título da publicação"
              className="h-auto border-0 bg-transparent px-0 !text-2xl font-medium shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
            />
            <div className="flex items-center gap-2">
              <label htmlFor="publication-cover-file">
                <input
                  id="publication-cover-file"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={composer.handleCoverFileInput}
                />
                <Button type="button" variant="outline" asChild>
                  <span>
                    <ImagePlus className="h-4 w-4" />
                    Capa
                  </span>
                </Button>
              </label>
              {composer.publicationCoverUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void composer.removePublicationCover()}
                  aria-label="Remover capa">
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
          {composer.publicationCoverUrl ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={composer.publicationCoverUrl}
                alt="Prévia da capa da publicação"
                className="h-auto max-h-64 w-full object-cover"
              />
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          {composer.publicationBlocks.length > 0 ? (
            <div className="space-y-5">
              {composer.publicationBlocks.map((block, index) => {
                return (
                  <div key={block.id}>
                    {block.type === "text" ? (
                      <div className="group relative">
                        <Textarea
                          id={`publication-text-${block.id}`}
                          value={block.content}
                          onChange={(event) =>
                            composer.updateTextBlock(block.id, event.target.value)
                          }
                          placeholder={
                            index === 0 ? "Escreva algo" : "Continue escrevendo..."
                          }
                          className="min-h-32 resize-none border-0 bg-transparent px-0 text-base leading-7 shadow-none focus-visible:ring-0"
                        />
                        {composer.publicationBlocks.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="absolute right-0 top-0 opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={() => composer.removePublicationBlock(block.id)}
                            aria-label="Remover texto">
                            <X className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    ) : (
                      <>
                        {block.type === "image" ? (
                          <div className="group relative space-y-3">
                            <div className="overflow-hidden rounded-lg">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={block.imageUrl}
                                alt={block.alt || "Prévia da imagem"}
                                className="h-auto max-h-[460px] w-full object-cover"
                              />
                            </div>
                            <Input
                              id={`publication-image-alt-${block.id}`}
                              value={block.alt}
                              onChange={(event) =>
                                composer.updateImageBlock(block.id, event.target.value)
                              }
                              placeholder="Descrição da imagem (opcional)"
                              className="border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              size="icon-sm"
                              className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={() => composer.removePublicationBlock(block.id)}
                              aria-label="Remover imagem">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="group relative rounded-xl border border-border bg-muted/30 p-4">
                            <div className="flex items-start gap-3">
                              <div className="rounded-lg border border-border bg-background p-2 text-muted-foreground">
                                <FileText className="h-6 w-6" />
                              </div>
                              <div className="min-w-0 space-y-1">
                                <p className="truncate font-medium">{block.fileName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatFileSize(block.sizeBytes)}
                                </p>
                              </div>
                            </div>

                            {block.mimeType === "application/pdf" ? (
                              <div className="mt-4 overflow-hidden rounded-lg border border-border bg-background">
                                <embed
                                  src={block.fileUrl}
                                  type="application/pdf"
                                  className="h-72 w-full"
                                />
                              </div>
                            ) : block.mimeType.startsWith("image/") ? (
                              <div className="mt-4 overflow-hidden rounded-lg border border-border bg-background">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={block.fileUrl}
                                  alt={block.fileName}
                                  className="h-auto max-h-72 w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="mt-4 rounded-lg border border-dashed border-border px-4 py-8 text-center">
                                <p className="text-sm text-muted-foreground">
                                  Pré-visualização indisponível para este arquivo.
                                </p>
                              </div>
                            )}

                            <Button
                              type="button"
                              variant="secondary"
                              size="icon-sm"
                              className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={() => composer.removePublicationBlock(block.id)}
                              aria-label="Remover anexo">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </ExpandableModal>

      <Dialog
        modal={false}
        open={composer.coverCropDialogOpen}
        onOpenChange={(open) => {
          composer.setCoverCropDialogOpen(open);
          if (!open) {
            composer.clearCoverCropState();
          }
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recortar capa</DialogTitle>
            <DialogDescription>
              Ajuste o recorte da capa que será exibida no timeline.
            </DialogDescription>
          </DialogHeader>

          {composer.coverCropSrc ? (
            <ReactCrop
              crop={composer.coverCrop}
              onChange={(_, percentCrop) => composer.setCoverCrop(percentCrop)}
              onComplete={(crop) => composer.setCoverCompletedCrop(crop)}
              aspect={16 / 9}
              minWidth={320}
              minHeight={180}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={composer.coverImageRef}
                src={composer.coverCropSrc}
                alt="Recorte da capa"
                onLoad={composer.handleCoverImageLoad}
                className="max-h-[60vh] w-full object-contain"
              />
            </ReactCrop>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={composer.uploadingCover}
              onClick={() => composer.setCoverCropDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={composer.uploadingCover}
              onClick={() => void composer.saveCoverFromCrop()}>
              {composer.uploadingCover ? "Enviando..." : "Aplicar capa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        modal={false}
        open={composer.imageUploadDialogOpen}
        onOpenChange={(open) => {
          composer.setImageUploadDialogOpen(open);
          if (!open) {
            composer.clearImageDraft();
          }
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar imagem</DialogTitle>
            <DialogDescription>
              Selecione uma imagem para inserir no corpo da publicação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="publication-image-file">Arquivo de imagem</Label>
              <Input
                id="publication-image-file"
                type="file"
                accept="image/*"
                onChange={composer.handleImageDraftFile}
              />
            </div>

            {composer.imageDraftPreviewUrl ? (
              <div className="overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={composer.imageDraftPreviewUrl}
                  alt={composer.imageDraftAlt || "Prévia da imagem selecionada"}
                  className="h-auto max-h-72 w-full object-cover"
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="publication-image-draft-alt">
                Descrição da imagem (opcional)
              </Label>
              <Input
                id="publication-image-draft-alt"
                value={composer.imageDraftAlt}
                onChange={(event) => composer.setImageDraftAlt(event.target.value)}
                placeholder="Descreva a imagem"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={composer.uploadingImageDraft}
              onClick={() => composer.setImageUploadDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void composer.insertImageBlockFromDraft()}
              disabled={!composer.imageDraftFile || composer.uploadingImageDraft}>
              {composer.uploadingImageDraft ? "Enviando..." : "Inserir imagem"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        modal={false}
        open={composer.attachmentUploadDialogOpen}
        onOpenChange={(open) => {
          composer.setAttachmentUploadDialogOpen(open);
          if (!open) {
            composer.clearAttachmentDraft();
          }
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar anexo</DialogTitle>
            <DialogDescription>
              Selecione um arquivo para anexar na publicação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="publication-attachment-file">Arquivo</Label>
              <Input
                id="publication-attachment-file"
                type="file"
                onChange={composer.handleAttachmentDraftFile}
              />
              <p className="text-sm text-muted-foreground">
                Arquivos executáveis e arquivos .zip não são permitidos.
              </p>
            </div>

            {composer.attachmentDraft ? (
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg border border-border bg-background p-2 text-muted-foreground">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium">
                      {composer.attachmentDraft.fileName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(composer.attachmentDraft.sizeBytes)}
                    </p>
                  </div>
                </div>

                {composer.attachmentDraft.mimeType === "application/pdf" ? (
                  <div className="mt-4 overflow-hidden rounded-lg border border-border bg-background">
                    <embed
                      src={composer.attachmentDraft.fileUrl}
                      type="application/pdf"
                      className="h-64 w-full"
                    />
                  </div>
                ) : composer.attachmentDraft.mimeType.startsWith("image/") ? (
                  <div className="mt-4 overflow-hidden rounded-lg border border-border bg-background">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={composer.attachmentDraft.fileUrl}
                      alt={composer.attachmentDraft.fileName}
                      className="h-auto max-h-64 w-full object-cover"
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={composer.uploadingAttachmentDraft}
              onClick={() => composer.setAttachmentUploadDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void composer.insertAttachmentBlockFromDraft()}
              disabled={
                !composer.attachmentDraft || composer.uploadingAttachmentDraft
              }>
              {composer.uploadingAttachmentDraft ? "Enviando..." : "Inserir anexo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
