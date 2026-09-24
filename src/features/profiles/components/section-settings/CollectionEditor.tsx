"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { moveSectionId } from "@/features/profiles/sectionCatalog";
import type { SectionSettingsProps } from "@/features/profiles/sectionCatalog";

type ItemDraft = {
  id: string;
  image: string;
  name: string;
  description: string;
  price: string;
  available: boolean;
};

type CategoryDraft = {
  id: string;
  name: string;
  items: ItemDraft[];
};

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function readText(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

/** Client-side public URL for a section image path (mirrors publicAssetPathUrl). */
function sectionImageUrl(path: string): string | null {
  if (path === "") return null;
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  return `${raw.replace(/\/+$/, "")}/storage/v1/object/public/profile-assets/${path}`;
}

function readCategories(settings: Record<string, unknown>): CategoryDraft[] {
  const raw = settings.categories;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c, ci) => {
      const items = Array.isArray(c.items) ? c.items : [];
      return {
        id: typeof c.id === "string" && c.id !== "" ? c.id : `category-${ci}`,
        name: readText(c.name),
        items: items
          .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
          .map((item, ii) => ({
            id: typeof item.id === "string" && item.id !== "" ? item.id : `item-${ci}-${ii}`,
            image: readText(item.image),
            name: readText(item.name),
            description: readText(item.description),
            price: readText(item.price),
            available: typeof item.available === "boolean" ? item.available : true,
          })),
      };
    });
}

function ItemImage({
  image,
  itemName,
  context,
  onUploaded,
}: {
  image: string;
  itemName: string;
  context: SectionSettingsProps["context"];
  onUploaded: (path: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const preview = sectionImageUrl(image);

  function upload(file: File) {
    if (!context?.uploadImage) {
      setError("Image upload is unavailable here.");
      return;
    }
    setError(null);
    setUploading(true);
    const uploadImage = context.uploadImage;
    startTransition(async () => {
      try {
        const result = await uploadImage(file);
        if (result.ok && result.path) {
          onUploaded(result.path);
        } else {
          setError(result.message || "Upload failed. Please try again.");
        }
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt=""
          aria-hidden="true"
          className="h-16 w-16 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-muted"
        >
          <ImagePlus className="h-6 w-6" />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label={`Photo for ${itemName === "" ? "item" : itemName}`}
          disabled={uploading || starting || !context}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) upload(file);
          }}
        />
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="secondary"
            disabled={uploading || starting || !context}
            onClick={() => fileRef.current?.click()}
          >
            {uploading || starting ? "Uploading…" : image === "" ? "Add photo" : "Replace"}
          </Button>
          {image !== "" ? (
            <Button
              type="button"
              variant="secondary"
              disabled={uploading}
              onClick={() => onUploaded("")}
            >
              Remove
            </Button>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="text-[13px] font-medium text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function serializeCategories(categories: CategoryDraft[]) {
  // Prices stay raw strings in the draft (like lat/lng): the schema coerces
  // numeric strings at save/preview time and rejects the rest with a
  // message. No NaN ever enters draft state.
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    items: c.items.map((i) => ({
      id: i.id,
      image: i.image,
      name: i.name,
      description: i.description,
      price: i.price,
      available: i.available,
    })),
  }));
}

/**
 * Shared collection builder (Phase 29, controlled in Phase 34.2):
 * categories with items, used by both the Menu and Catalog settings
 * editors. No JSON exposure — cards, inputs, add/remove/reorder controls
 * only. Every edit commits to the draft (live preview); item images upload
 * immediately and the path joins the draft; unified Save persists all.
 */
export function CollectionEditor({
  settings,
  onChange,
  autoFocus,
  context,
  sectionType,
  titlePlaceholder,
  itemNoun,
}: SectionSettingsProps & {
  sectionType: string;
  titlePlaceholder: string;
  itemNoun: string;
}) {
  const title = readText(settings.title);
  const currency = readText(settings.currency, "MAD");
  const categories = readCategories(settings);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function commitCollection(next: {
    title?: string;
    currency?: string;
    categories?: CategoryDraft[];
  }) {
    onChange?.({
      title: next.title ?? title,
      currency: next.currency ?? currency,
      categories: serializeCategories(next.categories ?? categories),
    });
  }

  function patchCategory(id: string, patch: Partial<CategoryDraft>) {
    commitCollection({ categories: categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  }

  function moveCategory(id: string, direction: -1 | 1) {
    const ids = categories.map((c) => c.id);
    const next = moveSectionId(ids, id, ids.indexOf(id) + direction);
    if (next.join() === ids.join()) return;
    const order = new Map(next.map((cid, i) => [cid, i]));
    commitCollection({
      categories: [...categories].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)),
    });
  }

  function removeCategory(id: string) {
    if (confirmId !== id) {
      setConfirmId(id);
      return;
    }
    setConfirmId(null);
    commitCollection({ categories: categories.filter((c) => c.id !== id) });
  }

  function patchItem(categoryId: string, itemId: string, patch: Partial<ItemDraft>) {
    commitCollection({
      categories: categories.map((c) =>
        c.id === categoryId
          ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }
          : c,
      ),
    });
  }

  function moveItem(categoryId: string, itemId: string, direction: -1 | 1) {
    commitCollection({
      categories: categories.map((c) => {
        if (c.id !== categoryId) return c;
        const ids = c.items.map((i) => i.id);
        const next = moveSectionId(ids, itemId, ids.indexOf(itemId) + direction);
        if (next.join() === ids.join()) return c;
        const order = new Map(next.map((iid, i) => [iid, i]));
        return {
          ...c,
          items: [...c.items].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)),
        };
      }),
    });
  }

  function removeItem(categoryId: string, itemId: string) {
    const key = `${categoryId}:${itemId}`;
    if (confirmId !== key) {
      setConfirmId(key);
      return;
    }
    setConfirmId(null);
    commitCollection({
      categories: categories.map((c) =>
        c.id === categoryId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c,
      ),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <Field id={`${sectionType}-title`} label="Title">
          <Input
            type="text"
            value={title}
            onChange={(e) => commitCollection({ title: e.target.value })}
            placeholder={titlePlaceholder}
            maxLength={80}
            autoFocus={autoFocus}
          />
        </Field>
        <Field id={`${sectionType}-currency`} label="Currency" hint="e.g. MAD">
          <Input
            type="text"
            value={currency}
            onChange={(e) => commitCollection({ currency: e.target.value })}
            placeholder="MAD"
            maxLength={10}
          />
        </Field>
      </div>

      {categories.map((category, ci) => (
        <div
          key={category.id}
          className="flex flex-col gap-2 rounded-xl border border-border bg-white p-3"
        >
          <div className="flex items-center gap-2">
            <Input
              type="text"
              value={category.name}
              onChange={(e) => patchCategory(category.id, { name: e.target.value })}
              placeholder="Category name"
              maxLength={60}
              aria-label={`Category ${ci + 1} name`}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={ci === 0}
              onClick={() => moveCategory(category.id, -1)}
              aria-label={`Move category ${category.name === "" ? ci + 1 : category.name} up`}
            >
              <ArrowUp aria-hidden="true" className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={ci === categories.length - 1}
              onClick={() => moveCategory(category.id, 1)}
              aria-label={`Move category ${category.name === "" ? ci + 1 : category.name} down`}
            >
              <ArrowDown aria-hidden="true" className="h-4 w-4" />
            </Button>
            {confirmId === category.id ? (
              <>
                <Button type="button" variant="secondary" onClick={() => setConfirmId(null)}>
                  Cancel
                </Button>
                <Button type="button" variant="primary" onClick={() => removeCategory(category.id)}>
                  Confirm
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => removeCategory(category.id)}
                aria-label={`Remove category ${category.name}`}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </Button>
            )}
          </div>

          {category.items.map((item, ii) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-xl bg-surface-muted/60 p-3">
              <ItemImage
                image={item.image}
                itemName={item.name}
                context={context ? { ...context, sectionType } : undefined}
                onUploaded={(path) => patchItem(category.id, item.id, { image: path })}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Field id={`${item.id}-name`} label={`${itemNoun} name`}>
                  <Input
                    type="text"
                    value={item.name}
                    onChange={(e) => patchItem(category.id, item.id, { name: e.target.value })}
                    placeholder={itemNoun}
                    maxLength={80}
                    required
                  />
                </Field>
                <Field id={`${item.id}-price`} label={`Price`}>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={item.price}
                    onChange={(e) => patchItem(category.id, item.id, { price: e.target.value })}
                    placeholder="40"
                  />
                </Field>
              </div>
              <Field id={`${item.id}-desc`} label="Description">
                <Input
                  type="text"
                  value={item.description}
                  onChange={(e) => patchItem(category.id, item.id, { description: e.target.value })}
                  placeholder="Short description"
                  maxLength={300}
                />
              </Field>
              <div className="flex flex-wrap items-center gap-1.5">
                <label className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 text-[13px] font-medium">
                  <input
                    type="checkbox"
                    checked={item.available}
                    onChange={(e) =>
                      patchItem(category.id, item.id, { available: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                  Available
                </label>
                <span className="flex-1" />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={ii === 0}
                  onClick={() => moveItem(category.id, item.id, -1)}
                  aria-label={`Move ${item.name} up`}
                >
                  <ArrowUp aria-hidden="true" className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={ii === category.items.length - 1}
                  onClick={() => moveItem(category.id, item.id, 1)}
                  aria-label={`Move ${item.name} down`}
                >
                  <ArrowDown aria-hidden="true" className="h-4 w-4" />
                </Button>
                {confirmId === `${category.id}:${item.id}` ? (
                  <>
                    <Button type="button" variant="secondary" onClick={() => setConfirmId(null)}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => removeItem(category.id, item.id)}
                    >
                      Confirm
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => removeItem(category.id, item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              patchCategory(category.id, {
                items: [
                  ...category.items,
                  {
                    id: newId("item"),
                    image: "",
                    name: "",
                    description: "",
                    price: "",
                    available: true,
                  },
                ],
              })
            }
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add {itemNoun.toLowerCase()}
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          commitCollection({
            categories: [...categories, { id: newId("category"), name: "", items: [] }],
          })
        }
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add category
      </Button>
    </div>
  );
}

export function MenuSettingsEditor(props: SectionSettingsProps) {
  return (
    <CollectionEditor {...props} sectionType="menu" titlePlaceholder="Our Menu" itemNoun="Dish" />
  );
}

export function CatalogSettingsEditor(props: SectionSettingsProps) {
  return (
    <CollectionEditor
      {...props}
      sectionType="catalog"
      titlePlaceholder="Products"
      itemNoun="Product"
    />
  );
}
