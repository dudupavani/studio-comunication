"use client";

type Props = {
  avatarUrl?: string | null;
  name?: string | null;
  subtitle?: string | null;
  fallback?: string | null;
};

function getInitials(name?: string | null) {
  const base = name?.trim();
  if (!base) return "NN";
  const parts = base.split(/\s+/);
  const initials = parts.slice(0, 2).map((p) => p.charAt(0).toUpperCase());
  return initials.join("") || "NN";
}

export default function UserSummary({
  avatarUrl,
  name,
  subtitle,
  fallback,
}: Props) {
  const displayName = name?.trim() || fallback || "Sem nome";
  const displaySubtitle = subtitle?.trim() || null;

  return (
    <div className="flex items-center gap-3">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={displayName}
          className="h-8 w-8 rounded-full object-cover border border-muted"
        />
      ) : (
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
          {getInitials(name ?? fallback)}
        </div>
      )}

      <div className="flex flex-col gap-1 ">
        <div className="font-medium text-left text-xs sm:text-sm text-foreground leading-4">
          {displayName}
        </div>
        {displaySubtitle ? (
          <div className="text-xs text-left text-muted-foreground">
            {displaySubtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}
