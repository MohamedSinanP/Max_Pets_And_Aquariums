import { useState, useEffect, useRef, type ChangeEvent } from "react";
import type {
  Product,
  CreateProductPayload,
  UpdateProductPayload,
  VariantPayload,
  ProductType,
  SellMode,
} from "../apis/product";

/* ─── Empty Variant ─── */
const emptyVariant = (): VariantPayload => ({
  sellMode: "packaged",
  attributes: [],
  price: { buying: 0, selling: 0 },
  quantity: { inStock: 0, unit: "pcs" },
  isActive: true
});

/* ─── Shared input className ─── */
const inputCls =
  "w-full px-3.5 py-2.5 border-[1.5px] border-teal-100 rounded-xl text-sm text-teal-900 bg-teal-50 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all box-border";

/* ─── FormField ─── */
function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3.5">
      <label className="block text-xs font-bold text-teal-700 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
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
      className={inputCls}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* ─── Toggle Switch ─── */
function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1 ${checked ? "bg-teal-500" : "bg-gray-200"
          }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-6" : "translate-x-1"
            }`}
        />
      </button>
      <span
        className={`text-sm font-semibold ${checked ? "text-teal-700" : "text-gray-400"
          }`}
      >
        {label}
      </span>
    </div>
  );
}

/* ─── Section Title ─── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-extrabold text-teal-700 py-2.5 border-b-2 border-teal-100 mb-3.5 uppercase tracking-wide">
      {children}
    </div>
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
      attributes: [
        ...(variant.attributes ?? []),
        { key: attrKey.trim(), value: attrVal.trim() },
      ],
    });
    setAttrKey("");
    setAttrVal("");
  };

  const removeAttr = (i: number) =>
    update({
      attributes: variant.attributes?.filter((_, ai) => ai !== i) ?? [],
    });

  const handleImages = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) onImageChange(Array.from(e.target.files));
  };

  const isSellModeLoose = variant.sellMode === "loose";

  return (
    <div className="border-[1.5px] border-teal-100 rounded-2xl p-4 mb-3.5 bg-teal-50">
      {/* Variant header */}
      <div className="flex justify-between items-center mb-3">
        <span className="font-extrabold text-sm text-teal-700">
          Variant {index + 1}
        </span>
        <div className="flex items-center gap-3">
          <ToggleSwitch
            checked={variant.isActive ?? true}
            onChange={(v) => update({ isActive: v })}
            label={variant.isActive ?? true ? "Active" : "Inactive"}
          />
          {index > 0 && (
            <button
              onClick={onRemove}
              className="bg-white text-red-500 border-[1.5px] border-red-200 rounded-lg px-3 py-1.5 text-xs font-bold hover:bg-red-50 transition-colors cursor-pointer"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        <FormField label="Buying Price (₹) *">
          <input
            className={inputCls}
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
            className={inputCls}
            type="number"
            min={0}
            value={variant.price.selling}
            onChange={(e) =>
              update({
                price: { ...variant.price, selling: +e.target.value },
              })
            }
          />
        </FormField>

        <FormField label={`In Stock (${variant.quantity.unit})`}>
          <input
            className={inputCls}
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
      </div>

      {/* Attributes */}
      <SectionTitle>Attributes</SectionTitle>
      <div className="flex gap-2 mb-2">
        <input
          className="flex-1 px-3.5 py-2.5 border-[1.5px] border-teal-100 rounded-xl text-sm text-teal-900 bg-teal-50 outline-none focus:border-teal-400 transition-all"
          placeholder="Key (e.g. Color)"
          value={attrKey}
          onChange={(e) => setAttrKey(e.target.value)}
        />
        <input
          className="flex-1 px-3.5 py-2.5 border-[1.5px] border-teal-100 rounded-xl text-sm text-teal-900 bg-teal-50 outline-none focus:border-teal-400 transition-all"
          placeholder="Value (e.g. Red)"
          value={attrVal}
          onChange={(e) => setAttrVal(e.target.value)}
        />
        <button
          onClick={addAttr}
          className="bg-gradient-to-br from-teal-700 to-teal-500 text-white border-none rounded-xl px-4 py-2.5 text-sm font-bold cursor-pointer hover:from-teal-800 hover:to-teal-600 transition-all shrink-0"
        >
          +
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {variant.attributes?.map((a, ai) => (
          <span
            key={ai}
            className="inline-flex items-center gap-1.5 bg-teal-100 text-teal-700 rounded-lg px-2.5 py-1 text-xs font-bold"
          >
            {a.key}: {a.value}
            <button
              onClick={() => removeAttr(ai)}
              className="border-none bg-transparent cursor-pointer text-teal-700 font-black p-0 leading-none hover:text-teal-900"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Images */}
      <SectionTitle>Images</SectionTitle>
      <button
        onClick={() => fileRef.current?.click()}
        className="bg-white text-teal-600 border-[1.5px] border-teal-100 rounded-xl px-4 py-2 text-sm font-bold cursor-pointer hover:bg-teal-50 transition-colors"
      >
        📷 Upload Images
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImages}
      />
      {imageFiles.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-2.5">
          {imageFiles.map((f, fi) => (
            <div
              key={fi}
              className="relative w-[72px] h-[72px] rounded-xl overflow-hidden border-[1.5px] border-teal-100"
            >
              <img
                src={URL.createObjectURL(f)}
                alt=""
                className="w-full h-full object-cover"
              />
              <button
                onClick={() =>
                  onImageChange(imageFiles.filter((_, ffi) => ffi !== fi))
                }
                className="absolute top-0.5 right-0.5 bg-white/90 border-none rounded-full w-[18px] h-[18px] cursor-pointer text-[11px] font-black leading-[18px] text-center text-red-500 p-0 hover:bg-white transition-colors"
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
  loading?: boolean;
}

export function ProductFormModal({
  open,
  onClose,
  onSubmit,
  initialData,
  categories,
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
        sellMode: v.sellMode,
        attributes: v.attributes ?? [],
        price: { buying: v.price.buying, selling: v.price.selling },
        quantity: {
          inStock: v.quantity.inStock,
          unit: v.quantity.unit,
        },
        images: v.images,
        isActive: v.isActive,
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

  const updateVariant = (i: number, v: VariantPayload) =>
    setVariants((p) => p.map((old, idx) => (idx === i ? v : old)));

  const removeVariant = (i: number) => {
    setVariants((p) => p.filter((_, idx) => idx !== i));
    setVariantImages((p) => p.filter((_, idx) => idx !== i));
  };

  const updateVariantImages = (i: number, files: File[]) =>
    setVariantImages((p) => p.map((old, idx) => (idx === i ? files : old)));

  const handleSubmit = async () => {
    setError("");
    if (!name.trim()) return setError("Product name is required.");
    if (!category) return setError("Category is required.");
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
    <div
      className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[2000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[20px] shadow-[0_24px_64px_rgba(15,118,110,0.18),0_4px_16px_rgba(0,0,0,0.1)] w-full max-w-[720px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-teal-700 to-teal-500 px-6 py-5 rounded-t-[20px] flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="m-0 text-white text-lg font-extrabold">
              {isEdit ? "Edit Product" : "Add New Product"}
            </h2>
            <p className="m-0 mt-0.5 text-white/70 text-xs">
              {isEdit ? "Update product details" : "Fill in the details below"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-white/15 border-none rounded-lg text-white w-8 h-8 cursor-pointer text-lg font-bold hover:bg-white/25 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="bg-red-50 border-[1.5px] border-red-200 rounded-xl px-3.5 py-2.5 text-red-600 text-sm mb-4">
              ⚠ {error}
            </div>
          )}

          <SectionTitle>Basic Info</SectionTitle>

          <FormField label="Product Name *">
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Royal Canin Adult"
            />
          </FormField>

          {/* Category + Type on same row on lg+ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
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
          </div>

          <FormField label="Description">
            <textarea
              className={`${inputCls} min-h-[80px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional product description…"
            />
          </FormField>

          {/* Variants */}
          <SectionTitle>Variants</SectionTitle>
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
          <button
            onClick={addVariant}
            className="bg-white text-teal-600 border-[1.5px] border-teal-100 rounded-xl px-5 py-2.5 text-sm font-bold cursor-pointer hover:bg-teal-50 transition-colors mb-5"
          >
            + Add Variant
          </button>

          {/* Footer */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="bg-white text-teal-600 border-[1.5px] border-teal-100 rounded-xl px-5 py-2.5 text-sm font-bold cursor-pointer hover:bg-teal-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`bg-gradient-to-br from-teal-700 to-teal-500 text-white border-none rounded-xl px-5 py-2.5 text-sm font-bold cursor-pointer hover:from-teal-800 hover:to-teal-600 transition-all ${loading ? "opacity-70 cursor-not-allowed" : ""
                }`}
            >
              {loading
                ? "Saving…"
                : isEdit
                  ? "Update Product"
                  : "Create Product"}
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

export function ViewProductModal({
  open,
  onClose,
  product,
}: ViewProductModalProps) {
  if (!open || !product) return null;

  const InfoRow = ({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) => (
    <div className="flex justify-between py-2 border-b border-teal-100 gap-3">
      <span className="text-xs font-bold text-teal-400 uppercase tracking-wide shrink-0">
        {label}
      </span>
      <span className="text-sm text-teal-900 text-right">{value}</span>
    </div>
  );

  const typeCls: Record<string, string> = {
    food: "bg-green-100 text-green-700",
    animal: "bg-blue-100 text-blue-700",
    accessory: "bg-yellow-100 text-yellow-700",
    medicine: "bg-pink-100 text-pink-700",
    other: "bg-gray-100 text-gray-700",
  };

  const TypeBadge = ({ t }: { t: string }) => (
    <span
      className={`${typeCls[t] ?? "bg-gray-100 text-gray-700"
        } rounded-lg px-2.5 py-0.5 text-xs font-bold`}
    >
      {t}
    </span>
  );

  return (
    <div
      className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[2000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[20px] shadow-[0_24px_64px_rgba(15,118,110,0.18),0_4px_16px_rgba(0,0,0,0.1)] w-full max-w-[680px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-teal-700 to-teal-500 px-6 py-5 rounded-t-[20px] flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="m-0 text-white text-lg font-extrabold">
              Product Details
            </h2>
            <p className="m-0 mt-0.5 text-white/70 text-xs">{product.name}</p>
          </div>
          <button
            onClick={onClose}
            className="bg-white/15 border-none rounded-lg text-white w-8 h-8 cursor-pointer text-lg font-bold hover:bg-white/25 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <SectionTitle>Basic Info</SectionTitle>
          <InfoRow label="Name" value={product.name} />
          <InfoRow label="Type" value={<TypeBadge t={product.type} />} />
          <InfoRow label="Category" value={product.category?.name ?? "—"} />
          <InfoRow label="Supplier" value={product.supplier?.name ?? "None"} />
          <InfoRow
            label="Status"
            value={
              <span
                className={`font-bold ${product.isActive ? "text-green-600" : "text-red-600"
                  }`}
              >
                {product.isActive ? "Active" : "Inactive"}
              </span>
            }
          />
          {product.description && (
            <InfoRow label="Description" value={product.description} />
          )}

          <div className="mt-4">
            <SectionTitle>Variants ({product.variants.length})</SectionTitle>
          </div>
          {product.variants.map((v, i) => (
            <div
              key={v._id ?? i}
              className="border-[1.5px] border-teal-100 rounded-xl p-3.5 mb-3 bg-teal-50"
            >
              <div className="flex justify-between items-center mb-2.5">
                <span className="font-extrabold text-teal-700 text-sm">
                  Variant {i + 1}
                </span>
                <span
                  className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${v.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-600"
                    }`}
                >
                  {v.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-teal-400 text-[11px] font-bold uppercase">
                    Buy Price
                  </div>
                  <div className="text-teal-900 font-bold">₹{v.price.buying}</div>
                </div>
                <div>
                  <div className="text-teal-400 text-[11px] font-bold uppercase">
                    Sell Price
                  </div>
                  <div className="text-teal-900 font-bold">₹{v.price.selling}</div>
                </div>
                <div>
                  <div className="text-teal-400 text-[11px] font-bold uppercase">
                    In Stock
                  </div>
                  <div className="text-teal-900 font-bold">
                    {v.quantity.inStock} {v.quantity.unit}
                  </div>
                </div>
              </div>

              {v.attributes.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {v.attributes.map((a, ai) => (
                    <span
                      key={ai}
                      className="inline-flex items-center gap-1.5 bg-teal-100 text-teal-700 rounded-lg px-2.5 py-1 text-xs font-bold"
                    >
                      {a.key}: {a.value}
                    </span>
                  ))}
                </div>
              )}

              {v.images.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-2.5">
                  {v.images.map((img, ii) => (
                    <img
                      key={ii}
                      src={img.url}
                      alt=""
                      className="w-[60px] h-[60px] object-cover rounded-lg border-[1.5px] border-teal-100"
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end mt-1">
            <button
              onClick={onClose}
              className="bg-gradient-to-br from-teal-700 to-teal-500 text-white border-none rounded-xl px-5 py-2.5 text-sm font-bold cursor-pointer hover:from-teal-800 hover:to-teal-600 transition-all"
            >
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
    <div
      className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[2000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[20px] shadow-[0_24px_64px_rgba(15,118,110,0.18),0_4px_16px_rgba(0,0,0,0.1)] w-full max-w-[420px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-teal-700 to-teal-500 px-6 py-5 rounded-t-[20px] flex items-center justify-between">
          <h2 className="m-0 text-white text-lg font-extrabold">
            Delete Product
          </h2>
          <button
            onClick={onClose}
            className="bg-white/15 border-none rounded-lg text-white w-8 h-8 cursor-pointer text-lg font-bold hover:bg-white/25 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="text-center text-5xl mb-4">🗑️</div>
          <p className="text-center text-teal-900 text-[15px] mb-1.5 font-bold">
            Are you sure you want to delete?
          </p>
          <p className="text-center text-teal-400 text-sm mb-6">
            <strong className="text-teal-700">{product.name}</strong> will be
            soft-deleted and hidden from listings.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="bg-white text-teal-600 border-[1.5px] border-teal-100 rounded-xl px-5 py-2.5 text-sm font-bold cursor-pointer hover:bg-teal-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`bg-gradient-to-br from-red-600 to-red-500 text-white border-none rounded-xl px-5 py-2.5 text-sm font-bold cursor-pointer hover:from-red-700 hover:to-red-600 transition-all ${loading ? "opacity-70 cursor-not-allowed" : ""
                }`}
            >
              {loading ? "Deleting…" : "Delete Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}