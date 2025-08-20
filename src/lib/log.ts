// src/lib/log.ts

type AnyErr = unknown;

export function toLoggableError(err: AnyErr) {
  // Handle null/undefined directly
  if (err == null) {
    return {
      message: "Unknown error (null/undefined)",
      code: undefined,
      hint: undefined,
      name: undefined,
      details: err,
    };
  }

  // Handle non-object types
  if (typeof err !== "object") {
    return {
      message: String(err),
      code: undefined,
      hint: undefined,
      name: typeof err,
      details: err,
    };
  }

  // Handle object types
  const e = err as Record<string, any>;
  
  // Special handling for empty objects
  const isEmpty = Object.keys(e).length === 0;
  if (isEmpty) {
    return {
      message: "Empty error object",
      code: undefined,
      hint: undefined,
      name: "EmptyObject",
      details: e,
    };
  }

  const message =
    e.message ?? e.error_description ?? e.details ?? "Unknown error";
  return {
    message,
    code: e.code,
    hint: e.hint,
    name: e.name,
    details: e, // mantém o objeto original para inspeção
  };
}

export function logError(context: string, err: AnyErr) {
  const payload = toLoggableError(err);
  console.error(context, payload);
}