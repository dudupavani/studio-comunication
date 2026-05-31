export function isCommunityStoragePathOwnedByScope(args: {
  path: string;
  orgId: string;
  communityId: string;
  spaceId: string;
}) {
  const path = args.path.trim();
  if (!path || path.includes("\\") || path.startsWith("/")) {
    return false;
  }

  const segments = path.split("/");
  if (segments.length < 4) {
    return false;
  }

  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return false;
  }

  return (
    segments[0] === args.orgId &&
    segments[1] === args.communityId &&
    segments[2] === args.spaceId
  );
}

export function getInvalidCommunityStoragePaths(args: {
  orgId: string;
  communityId: string;
  spaceId: string;
  coverPath?: string | null;
  blocks: unknown[];
}) {
  const paths = new Set<string>();

  if (args.coverPath) {
    paths.add(args.coverPath);
  }

  for (const block of args.blocks) {
    if (!block || typeof block !== "object") continue;
    const item = block as Record<string, unknown>;

    const imagePath = typeof item.imagePath === "string" ? item.imagePath : null;
    const filePath = typeof item.filePath === "string" ? item.filePath : null;

    if (imagePath) paths.add(imagePath);
    if (filePath) paths.add(filePath);
  }

  return Array.from(paths).filter(
    (path) =>
      !isCommunityStoragePathOwnedByScope({
        path,
        orgId: args.orgId,
        communityId: args.communityId,
        spaceId: args.spaceId,
      })
  );
}
