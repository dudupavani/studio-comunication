"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
};

export function CKEditorComponent({
  value,
  onChange,
  placeholder,
  className,
}: Props) {
  const { auth, loading } = useAuthContext();
  const orgIdRef = useRef<string | null>(auth?.orgId ?? null);
  const [editorBundle, setEditorBundle] = useState<EditorBundle | null>(null);

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
      editor.plugins.get("FileRepository").createUploadAdapter = (loader: any) =>
        new UploadAdapter(loader, supabase, orgIdRef.current);
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

  if (
    loading ||
    !auth?.orgId ||
    !editorBundle?.CKEditor ||
    !editorBundle.ClassicEditor
  ) {
    return (
      <div className={className}>
        <div className="min-h-[160px] rounded-lg border border-border bg-background px-3 py-3 text-sm text-muted-foreground">
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
        onChange={(_: any, editor: any) => {
          const html = editor.getData();
          onChange(html);
        }}
      />
    </div>
  );
}
