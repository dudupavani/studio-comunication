"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import UploadAdapter from "./UploadAdapter";
import { useAuthContext } from "@/hooks/use-auth-context";
import { supabase } from "@/lib/supabase/client";

type EditorBundle = {
  CKEditor: any;
  ClassicEditor: any;
};

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  chatId?: string;
  minHeight?: string;
  maxHeight?: string;
};

export function CKEditorComponent({
  value,
  onChange,
  placeholder,
  className,
  minHeight,
  maxHeight,
}: Props) {
  const { auth, loading } = useAuthContext();
  const orgIdRef = useRef<string | null>(auth?.orgId ?? null);
  const [editorBundle, setEditorBundle] = useState<EditorBundle | null>(null);
  const editorRef = useRef<any>(null);

  const applyEditorSize = useCallback(() => {
    const editableElement =
      editorRef.current?.ui?.view?.editable?.element ?? null;
    if (!editableElement) return;
    if (minHeight) {
      editableElement.style.setProperty("min-height", minHeight, "important");
    } else {
      editableElement.style.removeProperty("min-height");
    }
    if (maxHeight) {
      editableElement.style.setProperty("max-height", maxHeight, "important");
      editableElement.style.setProperty("overflow-y", "auto", "important");
    } else {
      editableElement.style.removeProperty("max-height");
      editableElement.style.removeProperty("overflow-y");
    }
  }, [maxHeight, minHeight]);

  useEffect(() => {
    orgIdRef.current = auth?.orgId ?? null;
  }, [auth?.orgId]);

  useEffect(() => {
    let isMounted = true;

    const loadEditor = async () => {
      try {
        const [reactEditor, classic] = await Promise.all([
          import("@ckeditor/ckeditor5-react"),
          import("@ckeditor/ckeditor5-build-classic"),
        ]);

        if (!isMounted) return;
        setEditorBundle({
          CKEditor: reactEditor.CKEditor,
          ClassicEditor: classic.default,
        });
      } catch (error) {
        console.error("CKEditor load error", error);
      }
    };

    if (typeof window !== "undefined") {
      loadEditor();
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const editorConfig = useMemo(() => {
    function CustomUploadAdapterPlugin(editor: any) {
      editor.plugins.get("FileRepository").createUploadAdapter = (
        loader: any
      ) => new UploadAdapter(loader, supabase, orgIdRef.current);
    }

    return {
      toolbar: [
        "heading",
        "|",
        "bold",
        "italic",
        "underline",
        "link",
        "bulletedList",
        "numberedList",
        "blockQuote",
        "imageUpload",
        "|",
        "undo",
        "redo",
      ],
      placeholder,
      extraPlugins: [CustomUploadAdapterPlugin],
    };
  }, [placeholder]);

  useEffect(() => {
    applyEditorSize();
  }, [applyEditorSize]);

  if (
    loading ||
    !auth?.orgId ||
    !editorBundle?.CKEditor ||
    !editorBundle.ClassicEditor
  ) {
    const loaderStyles: CSSProperties = {
      minHeight: minHeight ?? "160px",
      ...(maxHeight ? { maxHeight } : {}),
    };
    return (
      <div className={className}>
        <div
          className="rounded-lg border border-border bg-background px-3 py-3 text-sm text-muted-foreground"
          style={loaderStyles}>
          Carregando editor...
        </div>
      </div>
    );
  }

  const { CKEditor, ClassicEditor } = editorBundle;

  return (
    <div className={className}>
      <CKEditor
        editor={ClassicEditor}
        data={value}
        config={editorConfig}
        onReady={(editor: any) => {
          editorRef.current = editor;
          applyEditorSize();
        }}
        onChange={(_: any, editor: any) => {
          const html = editor.getData();
          onChange(html);
          applyEditorSize();
        }}
      />
    </div>
  );
}
