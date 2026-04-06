import {
  createComposerBlockId,
  extractFileExtension,
  formatFileSize,
  isBlockedAttachment,
  parseJson,
  revokeBlobUrl,
} from "@/app/(app)/comunidades/components/publication-composer-utils";

describe("publication-composer-utils", () => {
  it("formatFileSize handles invalid numbers and unit boundaries", () => {
    expect(formatFileSize(Number.NaN)).toBe("0 B");
    expect(formatFileSize(-1)).toBe("0 B");
    expect(formatFileSize(500)).toBe("500 B");
    expect(formatFileSize(1024)).toBe("1.00 KB");
    expect(formatFileSize(1024 * 1024)).toBe("1.00 MB");
  });

  it("extractFileExtension normalizes to lowercase and handles missing extension", () => {
    expect(extractFileExtension("arquivo.PDF")).toBe("pdf");
    expect(extractFileExtension("sem-extensao")).toBe("");
  });

  it("isBlockedAttachment blocks by extension and mime type", () => {
    const blockedExt = new File(["x"], "malware.EXE", {
      type: "text/plain",
    });
    const blockedMime = new File(["x"], "safe.txt", {
      type: "application/zip",
    });
    const allowed = new File(["x"], "documento.pdf", {
      type: "application/pdf",
    });

    expect(isBlockedAttachment(blockedExt)).toBe(true);
    expect(isBlockedAttachment(blockedMime)).toBe(true);
    expect(isBlockedAttachment(allowed)).toBe(false);
  });

  it("revokeBlobUrl only revokes blob urls", () => {
    const revokeSpy = jest
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);

    revokeBlobUrl("blob:https://app.test/id-1");
    revokeBlobUrl("https://cdn.test/file.png");

    expect(revokeSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith("blob:https://app.test/id-1");
    revokeSpy.mockRestore();
  });

  it("parseJson returns payload for success and throws message for failure", async () => {
    const okResponse = new Response(JSON.stringify({ item: { id: "1" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    await expect(parseJson<{ item: { id: string } }>(okResponse)).resolves.toEqual({
      item: { id: "1" },
    });

    const failResponse = new Response(JSON.stringify({ error: "Falha customizada" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
    await expect(parseJson(failResponse)).rejects.toThrow("Falha customizada");
  });

  it("createComposerBlockId returns a non-empty id", () => {
    expect(createComposerBlockId()).toEqual(expect.any(String));
    expect(createComposerBlockId().length).toBeGreaterThan(4);
  });
});
