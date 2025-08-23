// src/lib/log.ts

type AnyErr = unknown;

function normalizeSupabaseLike(err: any) {
  const out: Record<string, unknown> = {};
  const keys = ["message", "code", "hint", "details", "status", "name"];
  for (const k of keys) {
    if (err && err[k] != null) out[k] = err[k];
  }
  // Encadeamento de causa (se houver)
  if (err?.cause) {
    out.cause = normalizeSupabaseLike(err.cause);
  }
  return out;
}

export function toLoggableError(err: AnyErr) {
  // null/undefined
  if (err == null) {
    return {
      message: "Unknown error (null/undefined)",
      code: undefined,
      hint: undefined,
      name: undefined,
      details: undefined,
    };
  }

  // Error nativo
  if (err instanceof Error) {
    const anyErr = err as any;
    return {
      name: err.name,
      message: err.message || "Error",
      code: anyErr.code,
      hint: anyErr.hint,
      details: anyErr.details,
      stack: err.stack,
      cause:
        anyErr.cause instanceof Error
          ? {
              name: anyErr.cause.name,
              message: anyErr.cause.message,
              stack: anyErr.cause.stack,
            }
          : anyErr.cause
          ? normalizeSupabaseLike(anyErr.cause)
          : undefined,
    };
  }

  // Tipos primitivos
  if (typeof err !== "object") {
    return {
      message: String(err),
      code: undefined,
      hint: undefined,
      name: typeof err,
      details: err,
    };
  }

  // Objetos (Supabase/PostgREST/ custom)
  const e = err as Record<string, any>;
  const normalized = normalizeSupabaseLike(e);

  // Objeto vazio → não deixar {} “mudo”
  if (Object.keys(normalized).length === 0) {
    // última tentativa de serialização
    try {
      const raw = JSON.parse(JSON.stringify(e));
      if (raw && Object.keys(raw).length > 0) {
        return { message: "Non-Error object", details: raw };
      }
    } catch {
      /* ignore */
    }
    return {
      message: "Empty error object",
      name: "EmptyObject",
      details: e,
    };
  }

  // Assegura uma mensagem
  if (!normalized.message) {
    normalized.message = "Unknown error";
  }

  return normalized;
}

export function logError(
  context: string,
  err: AnyErr,
  extra?: Record<string, unknown>
) {
  const payload = toLoggableError(err);
  if (extra && Object.keys(extra).length > 0) {
    console.error(context, payload, { extra });
  } else {
    console.error(context, payload);
  }
}

// Opcional: helpers para diferenciar níveis
export function logWarn(context: string, data?: unknown) {
  if (data === undefined) console.warn(context);
  else console.warn(context, data);
}
export function logInfo(context: string, data?: unknown) {
  if (data === undefined) console.info(context);
  else console.info(context, data);
}
