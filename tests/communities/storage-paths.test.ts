import {
  getInvalidCommunityStoragePaths,
  isCommunityStoragePathOwnedByScope,
} from "@/lib/communities/storage-paths";

describe("lib/communities/storage-paths", () => {
  it("accepts paths owned by the current org, community and space", () => {
    expect(
      isCommunityStoragePathOwnedByScope({
        path: "org-1/community-1/space-1/file.png",
        orgId: "org-1",
        communityId: "community-1",
        spaceId: "space-1",
      }),
    ).toBe(true);
  });

  it("rejects paths outside the current scope", () => {
    expect(
      isCommunityStoragePathOwnedByScope({
        path: "org-2/community-1/space-1/file.png",
        orgId: "org-1",
        communityId: "community-1",
        spaceId: "space-1",
      }),
    ).toBe(false);
  });

  it("collects invalid paths from covers and blocks", () => {
    expect(
      getInvalidCommunityStoragePaths({
        orgId: "org-1",
        communityId: "community-1",
        spaceId: "space-1",
        coverPath: "org-1/community-1/space-1/cover.png",
        blocks: [
          {
            type: "image",
            imagePath: "org-1/community-1/space-1/image.png",
          },
          {
            type: "attachment",
            filePath: "org-2/community-1/space-1/file.pdf",
          },
        ],
      }),
    ).toEqual(["org-2/community-1/space-1/file.pdf"]);
  });
});
