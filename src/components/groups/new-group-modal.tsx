"use client";

import { useEffect, useMemo, useState } from "react";
import { CirclePlus } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";

const HEX = /^#[0-9A-Fa-f]{6}$/;

const DEFAULT_SWATCHES = [
  "#EF4444",
  "#F97316",
  "#F59E0B",
  "#EAB308",
  "#84CC16",
  "#22C55E",
  "#10B981",
  "#14B8A6",
  "#06B6D4",
  "#0EA5E9",
  "#3B82F6",
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#D946EF",
  "#EC4899",
  "#F43F5E",
  "#6B7280",
  "#94A3B8",
  "#0F172A",
];

// ---- Color Picker simplificado
function ColorPicker({
  value,
  onChange,
  label = "Cor",
}: {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
}) {
  const [hex, setHex] = useState(value);

  useEffect(() => setHex(value), [value]);

  const valid = useMemo(() => HEX.test(hex), [hex]);

  function apply(hexColor: string) {
    if (!HEX.test(hexColor)) return;
    const up = hexColor.toUpperCase();
    onChange(up);
    setHex(up);
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>

      {/* Input nativo + hex */}
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={valid ? hex : "#3B82F6"}
          onChange={(e) => apply(e.target.value)}
          className="h-10 flex-1 cursor-pointer p-1 rounded bg-muted border border-gray-200 hover:border-gray-300 hover:bg-gray-100"
        />
        <Input
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          onBlur={() => apply(hex)}
          placeholder="#RRGGBB"
          maxLength={7}
          className={
            valid
              ? "flex-1"
              : "flex-1 border-red-500 focus-visible:ring-red-500"
          }
        />
      </div>

      {/* Paleta */}
      <div className="space-y-2 pt-4">
        <Label className="text-sm">Paleta de cores</Label>
        <div className="grid grid-cols-10 sm:grid-cols-12 gap-2">
          {DEFAULT_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Escolher ${c}`}
              onClick={() => apply(c)}
              className="h-6 w-6 rounded border"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Modal principal
export default function NewGroupModal({
  orgId,
  onSubmit,
}: {
  orgId: string;
  onSubmit?: (payload: {
    orgId: string;
    name: string;
    description: string | null;
    color: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}) {
  const { toast } = useToast();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState<string | null>(null);
  const [color, setColor] = useState("#3B82F6");

  async function handleCreate() {
    if (!name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome do grupo.",
      });
      return;
    }
    if (!HEX.test(color)) {
      toast({ title: "Cor inválida", description: "Use o formato #RRGGBB." });
      return;
    }

    if (!onSubmit) {
      toast({ title: "Prévia", description: `Criar: ${name} (${color})` });
      setOpen(false);
      return;
    }

    try {
      setSubmitting(true);
      const res = await onSubmit({
        orgId,
        name: name.trim(),
        description: description?.trim() || null,
        color: color.toUpperCase(),
      });
      if (!res.ok) {
        toast({
          title: "Erro ao criar grupo",
          description: res.error ?? "Tente novamente.",
        });
        return;
      }
      toast({ title: "Grupo criado", description: `“${name}”` });
      router.refresh();
      setOpen(false);
      setName("");
      setDescription(null);
      setColor("#3B82F6");
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setName("");
      setDescription(null);
      setColor("#3B82F6");
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <CirclePlus />
          Criar grupo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar grupo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Nome */}
          <div className="space-y-1">
            <Label htmlFor="group-name">Nome *</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <Label htmlFor="group-description">Descrição</Label>
            <Textarea
              id="group-description"
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value || null)}
              rows={3}
            />
          </div>

          {/* Color Picker */}
          <ColorPicker value={color} onChange={setColor} />

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCreate} disabled={submitting}>
              {submitting ? "Criando..." : "Criar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
