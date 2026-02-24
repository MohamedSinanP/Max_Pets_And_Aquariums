import { useState, useEffect, useRef, type ChangeEvent } from "react";
import type {
  Product,
  CreateProductPayload,
  UpdateProductPayload,
  ProductAttribute,
  VariantPayload,
  VariantOption,
  ProductType,
  SellMode,
} from "../apis/product";

/* ─── Shared Styles ─── */
const TEAL = "#0d9488";
const TEAL_DARK = "#0f766e";
const TEAL_LIGHT = "#ccfbf1";
const TEAL_BG = "#f0fdfa";

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  backdropFilter: "blur(4px)",
  zIndex: 2000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const modalBase: React.CSSProperties = {
  background: "#fff",
  borderRadius: 20,
  boxShadow: "0 24px 64px rgba(15,118,110,0.18), 0 4px 16px rgba(0,0,0,0.1)",
  width: "100%",
  maxWidth: 640,
  maxHeight: "90vh",
  overflowY: "auto",
  fontFamily: "'DM Sans', sans-serif",
};

const modalHeader: React.CSSProperties = {
  background: `linear-gradient(135deg, ${TEAL_DARK} 0%, ${TEAL} 100%)`,
  padding: "20px 24px",
  borderRadius: "20px 20px 0 0",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  position: "sticky",
  top: 0,
  zIndex: 1,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: `1.5px solid ${TEAL_LIGHT}`,
  borderRadius: 10,
  fontSize: 14,
  color: "#0d4f4a",
  background: TEAL_BG,
  outline: "none",
  fontFamily: "'DM Sans', sans-serif",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 700,
  color: TEAL_DARK,
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: TEAL_DARK,
  padding: "10px 0 6px",
  borderBottom: `2px solid ${TEAL_LIGHT}`,
  marginBottom: 14,
};

const btnPrimary: React.CSSProperties = {
  background: `linear-gradient(135deg, ${TEAL_DARK}, ${TEAL})`,
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "10px 22px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

const btnSecondary: React.CSSProperties = {
  background: "#fff",
  color: TEAL,
  border: `1.5px solid ${TEAL_LIGHT}`,
  borderRadius: 10,
  padding: "10px 20px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

const btnDanger: React.CSSProperties = {
  background: "#fff",
  color: "#ef4444",
  border: "1.5px solid #fecaca",
  borderRadius: 8,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

const tagStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: TEAL_LIGHT,
  color: TEAL_DARK,
  borderRadius: 8,
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 700,
};

/* ─── Empty Variant ─── */
const emptyVariant = (): VariantPayload => ({
  sku: "",
  sellMode: "packaged",
  attributes: [],
  price: { buying: 0, selling: 0 },
  quantity: { inStock: 0, minThreshold: 5, unit: "pcs" },
});

/* ─── FormField ─── */
function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

/* ─── Select ─── */
function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...inputStyle }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ─── VariantEditor ─── */
function VariantEditor({
  variant,
  index,
  onChange,
  onRemove,
  imageFiles,
  onImageChange,
}: {
  variant: VariantPayload;
  index: number;
  onChange: (v: VariantPayload) => void;
  onRemove: () => void;
  imageFiles: File[];
  onImageChange: (files: File[]) => void;
}) {
  const [attrKey, setAttrKey] = useState("");
  const [attrVal, setAttrVal] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<VariantPayload>) =>
    onChange({ ...variant, ...patch });

  const addAttr = () => {
    if (!attrKey.trim() || !attrVal.trim()) return;
    update({
      attributes: [...(variant.attributes ?? []), { key: attrKey.trim(), value: attrVal.trim() }],
    });
    setAttrKey("");
    setAttrVal("");
  };

  const removeAttr = (i: number) =>
    update({ attributes: variant.attributes?.filter((_, ai) => ai !== i) ?? [] });

  const handleImages = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) onImageChange(Array.from(e.target.files));
  };

  const isSellModeLoose = variant.sellMode === "loose";

  return (
    <div
      style={{
        border: `1.5px solid ${TEAL_LIGHT}`,
        borderRadius: 14,
        padding: 16,
        marginBottom: 14,
        background: TEAL_BG,
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <span style={{ fontWeight: 800, fontSize: 13, color: TEAL_DARK }}>
          Variant {index + 1}
        </span>
        {index > 0 && (
          <button onClick={onRemove} style={btnDanger}>
            Remove
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="SKU *">
          <input
            style={inputStyle}
            value={variant.sku}
            onChange={(e) => update({ sku: e.target.value.toUpperCase() })}
            placeholder="e.g. PROD-001-RED"
          />
        </FormField>
        <FormField label="Sell Mode">
          <Select
            value={variant.sellMode}
            onChange={(v) =>
              update({
                sellMode: v as SellMode,
                quantity: {
                  ...variant.quantity,
                  unit: v === "packaged" ? "pcs" : "kg",
                },
              })
            }
            options={[
              { label: "Packaged (pcs)", value: "packaged" },
              { label: "Loose (kg/L)", value: "loose" },
            ]}
          />
        </FormField>
        <FormField label="Buying Price (₹) *">
          <input
            style={inputStyle}
            type="number"
            min={0}
            value={variant.price.buying}
            onChange={(e) =>
              update({ price: { ...variant.price, buying: +e.target.value } })
            }
          />
        </FormField>
        <FormField label="Selling Price (₹) *">
          <input
            style={inputStyle}
            type="number"
            min={0}
            value={variant.price.selling}
            onChange={(e) =>
              update({ price: { ...variant.price, selling: +e.target.value } })
            }
          />
        </FormField>
        <FormField label={`In Stock (${variant.quantity.unit})`}>
          <input
            style={inputStyle}
            type="number"
            min={0}
            value={variant.quantity.inStock}
            onChange={(e) =>
              update({
                quantity: { ...variant.quantity, inStock: +e.target.value },
              })
            }
          />
        </FormField>
        <FormField label="Min Threshold">
          <input
            style={inputStyle}
            type="number"
            min={0}
            value={variant.quantity.minThreshold}
            onChange={(e) =>
              update({
                quantity: {
                  ...variant.quantity,
                  minThreshold: +e.target.value,
                },
              })
            }
          />
        </FormField>
        {isSellModeLoose && (
          <FormField label="Unit">
            <Select
              value={variant.quantity.unit}
              onChange={(v) =>
                update({ quantity: { ...variant.quantity, unit: v as any } })
              }
              options={[
                { label: "kg", value: "kg" },
                { label: "L (Litre)", value: "L" },
              ]}
            />
          </FormField>
        )}
      </div>

      {/* Attributes */}
      <div style={sectionTitle}>Attributes</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          placeholder="Key (e.g. Color)"
          value={attrKey}
          onChange={(e) => setAttrKey(e.target.value)}
        />
        <input
          style={{ ...inputStyle, flex: 1 }}
          placeholder="Value (e.g. Red)"
          value={attrVal}
          onChange={(e) => setAttrVal(e.target.value)}
        />
        <button
          onClick={addAttr}
          style={{ ...btnPrimary, padding: "10px 16px", flexShrink: 0 }}
        >
          +
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {variant.attributes?.map((a, ai) => (
          <span key={ai} style={tagStyle}>
            {a.key}: {a.value}
            <button
              onClick={() => removeAttr(ai)}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                color: TEAL_DARK,
                fontWeight: 900,
                padding: 0,
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Images */}
      <div style={sectionTitle}>Images</div>
      <button
        onClick={() => fileRef.current?.click()}
        style={{ ...btnSecondary, fontSize: 13, padding: "8px 16px" }}
      >
        📷 Upload Images
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handleImages}
      />
      {imageFiles.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {imageFiles.map((f, fi) => (
            <div
              key={fi}
              style={{
                position: "relative",
                width: 72,
                height: 72,
                borderRadius: 10,
                overflow: "hidden",
                border: `1.5px solid ${TEAL_LIGHT}`,
              }}
            >
              <img
                src={URL.createObjectURL(f)}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <button
                onClick={() =>
                  onImageChange(imageFiles.filter((_, ffi) => ffi !== fi))
                }
                style={{
                  position: "absolute",
                  top: 3,
                  right: 3,
                  background: "rgba(255,255,255,0.9)",
                  border: "none",
                  borderRadius: "50%",
                  width: 18,
                  height: 18,
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 900,
                  lineHeight: "18px",
                  textAlign: "center",
                  color: "#ef4444",
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   CREATE / EDIT PRODUCT MODAL
════════════════════════════════════════ */

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    payload: CreateProductPayload | UpdateProductPayload,
    imageFiles: File[][]
  ) => Promise<void>;
  initialData?: Product | null;
  categories: { _id: string; name: string }[];
  suppliers: { _id: string; name: string }[];
  loading?: boolean;
}

export function ProductFormModal({
  open,
  onClose,
  onSubmit,
  initialData,
  categories,
  suppliers,
  loading = false,
}: ProductFormModalProps) {
  const isEdit = !!initialData;

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState<ProductType>("food");
  const [description, setDescription] = useState("");
  const [supplier, setSupplier] = useState("");
  const [variants, setVariants] = useState<VariantPayload[]>([emptyVariant()]);
  const [variantImages, setVariantImages] = useState<File[][]>([[]]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    if (initialData) {
      setName(initialData.name);
      setCategory(initialData.category?._id ?? "");
      setType(initialData.type);
      setDescription(initialData.description ?? "");
      setSupplier(initialData.supplier?._id ?? "");
      const mapped: VariantPayload[] = initialData.variants.map((v) => ({
        _id: v._id,
        sku: v.sku,
        sellMode: v.sellMode,
        attributes: v.attributes ?? [],
        price: { buying: v.price.buying, selling: v.price.selling },
        quantity: {
          inStock: v.quantity.inStock,
          minThreshold: v.quantity.minThreshold,
          unit: v.quantity.unit,
        },
        images: v.images,
      }));
      setVariants(mapped);
      setVariantImages(mapped.map(() => []));
    } else {
      setName("");
      setCategory(categories[0]?._id ?? "");
      setType("food");
      setDescription("");
      setSupplier("");
      setVariants([emptyVariant()]);
      setVariantImages([[]]);
    }
    setError("");
  }, [open, initialData, categories]);

  if (!open) return null;

  const addVariant = () => {
    setVariants((p) => [...p, emptyVariant()]);
    setVariantImages((p) => [...p, []]);
  };

  const updateVariant = (i: number, v: VariantPayload) => {
    setVariants((p) => p.map((old, idx) => (idx === i ? v : old)));
  };

  const removeVariant = (i: number) => {
    setVariants((p) => p.filter((_, idx) => idx !== i));
    setVariantImages((p) => p.filter((_, idx) => idx !== i));
  };

  const updateVariantImages = (i: number, files: File[]) => {
    setVariantImages((p) => p.map((old, idx) => (idx === i ? files : old)));
  };

  const handleSubmit = async () => {
    setError("");
    if (!name.trim()) return setError("Product name is required.");
    if (!category) return setError("Category is required.");
    if (variants.some((v) => !v.sku.trim()))
      return setError("All variants must have a SKU.");
    if (variants.some((v) => v.price.selling <= 0))
      return setError("Selling price must be greater than 0.");

    const payload: CreateProductPayload = {
      name: name.trim(),
      category,
      type,
      description: description.trim() || null,
      supplier: supplier || null,
      variants,
    };

    await onSubmit(payload, variantImages);
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalBase, maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={modalHeader}>
          <div>
            <h2 style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 800 }}>
              {isEdit ? "Edit Product" : "Add New Product"}
            </h2>
            <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
              {isEdit ? "Update product details" : "Fill in the details below"}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              width: 32,
              height: 32,
              cursor: "pointer",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 24 }}>
          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1.5px solid #fecaca",
                borderRadius: 10,
                padding: "10px 14px",
                color: "#dc2626",
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              ⚠ {error}
            </div>
          )}

          <div style={sectionTitle}>Basic Info</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Product Name *">
              <input
                style={inputStyle}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Royal Canin Adult"
              />
            </FormField>
            <FormField label="Type *">
              <Select
                value={type}
                onChange={(v) => setType(v as ProductType)}
                options={[
                  { label: "Food", value: "food" },
                  { label: "Animal", value: "animal" },
                  { label: "Accessory", value: "accessory" },
                  { label: "Medicine", value: "medicine" },
                  { label: "Other", value: "other" },
                ]}
              />
            </FormField>
            <FormField label="Category *">
              <Select
                value={category}
                onChange={setCategory}
                options={[
                  { label: "Select category…", value: "" },
                  ...categories.map((c) => ({ label: c.name, value: c._id })),
                ]}
              />
            </FormField>
            <FormField label="Supplier">
              <Select
                value={supplier}
                onChange={setSupplier}
                options={[
                  { label: "None", value: "" },
                  ...suppliers.map((s) => ({ label: s.name, value: s._id })),
                ]}
              />
            </FormField>
          </div>

          <FormField label="Description">
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional product description…"
            />
          </FormField>

          {/* Variants */}
          <div style={sectionTitle}>Variants</div>
          {variants.map((v, i) => (
            <VariantEditor
              key={i}
              variant={v}
              index={i}
              onChange={(updated) => updateVariant(i, updated)}
              onRemove={() => removeVariant(i)}
              imageFiles={variantImages[i] ?? []}
              onImageChange={(files) => updateVariantImages(i, files)}
            />
          ))}
          <button onClick={addVariant} style={{ ...btnSecondary, marginBottom: 20 }}>
            + Add Variant
          </button>

          {/* Footer */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={btnSecondary}>
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Saving…" : isEdit ? "Update Product" : "Create Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   VIEW PRODUCT MODAL
════════════════════════════════════════ */

interface ViewProductModalProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

export function ViewProductModal({ open, onClose, product }: ViewProductModalProps) {
  if (!open || !product) return null;

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0",
        borderBottom: `1px solid ${TEAL_LIGHT}`,
        gap: 12,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: "#5eaaa0", textTransform: "uppercase", flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 14, color: "#0d4f4a", textAlign: "right" }}>{value}</span>
    </div>
  );

  const TypeBadge = ({ t }: { t: string }) => {
    const colors: Record<string, [string, string]> = {
      food: ["#dcfce7", "#16a34a"],
      animal: ["#dbeafe", "#1d4ed8"],
      accessory: ["#fef9c3", "#ca8a04"],
      medicine: ["#fce7f3", "#be185d"],
      other: ["#f3f4f6", "#374151"],
    };
    const [bg, fg] = colors[t] ?? ["#f3f4f6", "#374151"];
    return (
      <span
        style={{
          background: bg,
          color: fg,
          borderRadius: 8,
          padding: "3px 10px",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {t}
      </span>
    );
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...modalBase, maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeader}>
          <div>
            <h2 style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 800 }}>
              Product Details
            </h2>
            <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
              {product.name}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              width: 32,
              height: 32,
              cursor: "pointer",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <div style={sectionTitle}>Basic Info</div>
          <InfoRow label="Name" value={product.name} />
          <InfoRow label="Type" value={<TypeBadge t={product.type} />} />
          <InfoRow label="Category" value={product.category?.name ?? "—"} />
          <InfoRow label="Supplier" value={product.supplier?.name ?? "None"} />
          <InfoRow label="Status" value={
            <span style={{ color: product.isActive ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
              {product.isActive ? "Active" : "Inactive"}
            </span>
          } />
          {product.description && (
            <InfoRow label="Description" value={product.description} />
          )}

          {/* Variants */}
          <div style={{ ...sectionTitle, marginTop: 16 }}>
            Variants ({product.variants.length})
          </div>
          {product.variants.map((v, i) => (
            <div
              key={v._id ?? i}
              style={{
                border: `1.5px solid ${TEAL_LIGHT}`,
                borderRadius: 12,
                padding: 14,
                marginBottom: 12,
                background: TEAL_BG,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontWeight: 800, color: TEAL_DARK, fontSize: 13 }}>
                  {v.sku}
                </span>
                <span
                  style={{
                    background: v.isActive ? "#dcfce7" : "#fee2e2",
                    color: v.isActive ? "#16a34a" : "#dc2626",
                    borderRadius: 8,
                    padding: "2px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {v.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 13 }}>
                <div>
                  <div style={{ color: "#5eaaa0", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Buy Price</div>
                  <div style={{ color: "#0d4f4a", fontWeight: 700 }}>₹{v.price.buying}</div>
                </div>
                <div>
                  <div style={{ color: "#5eaaa0", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Sell Price</div>
                  <div style={{ color: "#0d4f4a", fontWeight: 700 }}>₹{v.price.selling}</div>
                </div>
                <div>
                  <div style={{ color: "#5eaaa0", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>In Stock</div>
                  <div style={{ color: "#0d4f4a", fontWeight: 700 }}>
                    {v.quantity.inStock} {v.quantity.unit}
                  </div>
                </div>
              </div>

              {v.attributes.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {v.attributes.map((a, ai) => (
                    <span key={ai} style={tagStyle}>
                      {a.key}: {a.value}
                    </span>
                  ))}
                </div>
              )}

              {/* Existing images */}
              {v.images.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  {v.images.map((img, ii) => (
                    <img
                      key={ii}
                      src={img.url}
                      alt=""
                      style={{
                        width: 60,
                        height: 60,
                        objectFit: "cover",
                        borderRadius: 8,
                        border: `1.5px solid ${TEAL_LIGHT}`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <button onClick={onClose} style={btnPrimary}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   DELETE CONFIRM MODAL
════════════════════════════════════════ */

interface DeleteProductModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  product: Product | null;
  loading?: boolean;
}

export function DeleteProductModal({
  open,
  onClose,
  onConfirm,
  product,
  loading = false,
}: DeleteProductModalProps) {
  if (!open || !product) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        style={{ ...modalBase, maxWidth: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={modalHeader}>
          <h2 style={{ margin: 0, color: "#fff", fontSize: 18, fontWeight: 800 }}>
            Delete Product
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              width: 32,
              height: 32,
              cursor: "pointer",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <div
            style={{
              textAlign: "center",
              fontSize: 48,
              marginBottom: 16,
            }}
          >
            🗑️
          </div>
          <p style={{ textAlign: "center", color: "#0d4f4a", fontSize: 15, marginBottom: 6, fontWeight: 700 }}>
            Are you sure you want to delete?
          </p>
          <p style={{ textAlign: "center", color: "#5eaaa0", fontSize: 13, marginBottom: 24 }}>
            <strong style={{ color: TEAL_DARK }}>{product.name}</strong> will be soft-deleted
            and hidden from listings.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button onClick={onClose} style={btnSecondary}>
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              style={{
                ...btnPrimary,
                background: "linear-gradient(135deg, #dc2626, #ef4444)",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Deleting…" : "Delete Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}