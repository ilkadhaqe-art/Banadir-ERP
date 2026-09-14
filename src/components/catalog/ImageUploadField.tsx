import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadImageFile, useSignedImageUrl } from "@/lib/product-images";

/**
 * Upload-file image control. The picked file goes straight into storage and
 * the returned object path is handed back to the form, which persists it.
 */
export function ImageUploadField({
  label,
  value,
  onChange,
  folder = "products",
  disabled,
}: {
  label: string;
  value: string;
  onChange: (path: string) => void;
  folder?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const preview = useSignedImageUrl(value);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be smaller than 8 MB.");
      return;
    }
    setBusy(true);
    try {
      const path = await uploadImageFile(file, folder);
      onChange(path);
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-muted">
          {preview ? (
            <img src={preview} alt={label} className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void pick(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            {value ? "Replace image" : "Upload file"}
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              disabled={disabled || busy}
              onClick={() => onChange("")}
            >
              <Trash2 className="size-4" /> Remove
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
