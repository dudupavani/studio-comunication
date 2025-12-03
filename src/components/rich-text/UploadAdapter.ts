"use client";

const BUCKET = "message-text-editor-comunicados";

type Loader = {
  file?: Promise<File>;
};

function buildFilePath(orgId: string, fileName: string) {
  const sanitizedName = fileName
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_");
  const filePath = `org_${orgId}/${Date.now()}_${sanitizedName}`;
  if (!filePath.startsWith("org_")) {
    throw new Error("Path inválido para upload.");
  }
  return filePath;
}

export default class UploadAdapter {
  private loader: Loader;
  private orgId: string | null;
  private supabase: any;

  constructor(loader: Loader, supabaseClient: any, orgId: string | null) {
    this.loader = loader;
    this.supabase = supabaseClient;
    this.orgId = orgId;
  }

  async upload(): Promise<{ default: string }> {
    const file = await this.loader.file;
    if (!file) {
      throw new Error("Nenhum arquivo recebido para upload.");
    }

    if (!this.orgId) {
      throw new Error("Org ID ausente para upload.");
    }

    const {
      data: { session },
      error: sessionError,
    } = await this.supabase.auth.getSession();
    if (sessionError) {
      console.error("CKEDITOR_UPLOAD_SESSION_ERROR", sessionError);
      throw new Error("Falha ao recuperar sessão para upload.");
    }

    if (!session) {
      throw new Error("Not authenticated");
    }

    const filePath = buildFilePath(this.orgId, file.name);
    console.log("CKEDITOR_UPLOAD_PATH", { filePath, orgId: this.orgId });

    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (error || !data?.path) {
      console.error("CKEDITOR_UPLOAD_ERROR", error);
      throw new Error(error?.message || "Falha ao enviar a imagem para o servidor.");
    }

    const publicPath = data.path || filePath;
    const { data: urlData } = this.supabase.storage
      .from(BUCKET)
      .getPublicUrl(publicPath);

    console.log("CKEDITOR_UPLOAD_PUBLIC_URL", urlData?.publicUrl);

    if (!urlData?.publicUrl) {
      throw new Error("Não foi possível gerar a URL pública da imagem.");
    }

    return { default: urlData.publicUrl };
  }

  abort() {
    // CKEditor chama abort em cancelamentos; não há suporte nativo no upload do Supabase.
    return;
  }
}

export { BUCKET as CKEDITOR_STORAGE_BUCKET };
