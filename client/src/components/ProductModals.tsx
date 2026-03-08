import { useState, useEffect, useRef, type ChangeEvent } from "react";
import {
  derivePriceUnit,
} from "../apis/product";
import {
  type Product,
  type VariantPayload,
  type IVariantOption,
  type CreateProductPayload,
  type UpdateProductPayload,
  type SellMode,
  type BaseUnit,
  type PriceUnit,
  type ProductType,
} from "../types/product"

/* ════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════ */

function buildEmptyVariant(variantOptions: IVariantOption[]): VariantPayload {
  const attributes: Record<string, string> = {};
  for (const opt of variantOptions) {
    attributes[opt.name] = opt.values[0] ?? "";
  }
  return {
    sellMode: "packaged",
    attributes,
    price: { buying: 0, selling: 0 },
    priceUnit: "pcs",
    quantity: { inStock: 0, baseUnit: "pcs" },
    isActive: true,
  };
}

function syncVariantAttributes(
  variants: VariantPayload[],
  variantOptions: IVariantOption[]
): VariantPayload[] {
  return variants.map((v) => {
    const attrs: Record<string, string> = {};
    for (const opt of variantOptions) {
      const existing = v.attributes[opt.name];
      attrs[opt.name] =
        existing && opt.values.includes(existing) ? existing : opt.values[0] ?? "";
    }
    return { ...v, attributes: attrs };
  });
}

/* ════════════════════════════════════════════════════════════
   VALIDATION TYPES
════════════════════════════════════════════════════════════ */

interface FieldErrors {
  name?: string;
  category?: string;
  description?: string;
  variants?: Record<number, VariantErrors>;
}

interface VariantErrors {
  buyingPrice?: string;
  sellingPrice?: string;
  inStock?: string;
  baseUnit?: string;
  attributes?: string;
}

/* ════════════════════════════════════════════════════════════
   DESIGN TOKENS
   — number inputs: hide native spinners via Tailwind arbitrary
════════════════════════════════════════════════════════════ */

const inputBase =
  "w-full px-3.5 py-2.5 rounded-xl text-sm text-teal-900 outline-none transition-all box-border font-[inherit] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

const inputCls = `${inputBase} border-[1.5px] border-teal-100 bg-teal-50 focus:border-teal-400 focus:ring-2 focus:ring-teal-100`;
const inputErrCls = `${inputBase} border-[1.5px] border-red-300 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100`;

const btnSecondary =
  "bg-white text-teal-600 border-[1.5px] border-teal-100 rounded-xl px-4 py-2.5 text-sm font-bold cursor-pointer hover:bg-teal-50 transition-colors";

const btnPrimary =
  "bg-gradient-to-br from-teal-700 to-teal-500 text-white border-none rounded-xl px-5 py-2.5 text-sm font-bold cursor-pointer hover:from-teal-800 hover:to-teal-600 transition-all shadow-[0_2px_8px_rgba(13,148,136,0.25)]";

/* ════════════════════════════════════════════════════════════
   SHARED COMPONENTS
════════════════════════════════════════════════════════════ */

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
      <span>⚠</span> {msg}
    </p>
  );
}

function FormField({
  label,
  children,
  hint,
  error,
  required,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="mb-3.5">
      <label className="block text-[11px] font-extrabold text-teal-700 mb-1.5 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      <FieldError msg={error} />
      {!error && hint && <p className="text-[11px] text-teal-400 mt-1">{hint}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-2.5 mb-3.5 border-b-2 border-teal-100">
      <span className="text-xs font-extrabold text-teal-700 uppercase tracking-widest">
        {children}
      </span>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  disabled,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  disabled?: boolean;
  hasError?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`${hasError ? inputErrCls : inputCls} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

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
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-1 ${checked ? "bg-teal-500" : "bg-gray-200"
        }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-6" : "translate-x-1"
          }`}
      />
      <span className="sr-only">{label}</span>
    </button>
  );
}

function getPriceUnitLabel(priceUnit: PriceUnit): string {
  return priceUnit === "kg" ? "kg" : priceUnit === "liter" ? "liter" : "piece";
}

/* ════════════════════════════════════════════════════════════
   SPECIFICATIONS EDITOR
════════════════════════════════════════════════════════════ */

function SpecificationsEditor({
  specs,
  onChange,
}: {
  specs: Record<string, string>;
  onChange: (s: Record<string, string>) => void;
}) {
  const [key, setKey] = useState("");
  const [val, setVal] = useState("");
  const [keyErr, setKeyErr] = useState("");
  const [valErr, setValErr] = useState("");

  const add = () => {
    let hasErr = false;
    setKeyErr("");
    setValErr("");
    if (!key.trim()) { setKeyErr("Key is required"); hasErr = true; }
    else if (key.trim().length < 2) { setKeyErr("Key must be at least 2 characters"); hasErr = true; }
    else if (specs[key.trim()]) { setKeyErr("Key already exists"); hasErr = true; }
    if (!val.trim()) { setValErr("Value is required"); hasErr = true; }
    if (hasErr) return;
    onChange({ ...specs, [key.trim()]: val.trim() });
    setKey(""); setVal("");
  };

  const remove = (k: string) => { const n = { ...specs }; delete n[k]; onChange(n); };
  const entries = Object.entries(specs);

  return (
    <div>
      <div className="flex gap-2 mb-1 items-start">
        <div className="flex-1">
          <input
            className={keyErr ? inputErrCls : inputCls}
            placeholder="Key (e.g. Material)"
            value={key}
            onChange={(e) => { setKey(e.target.value); setKeyErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <FieldError msg={keyErr} />
        </div>
        <div className="flex-1">
          <input
            className={valErr ? inputErrCls : inputCls}
            placeholder="Value (e.g. Stainless Steel)"
            value={val}
            onChange={(e) => { setVal(e.target.value); setValErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <FieldError msg={valErr} />
        </div>
        <button
          type="button"
          onClick={add}
          className="bg-gradient-to-br from-teal-700 to-teal-500 text-white border-none rounded-xl px-4 py-2.5 text-sm font-bold cursor-pointer hover:from-teal-800 hover:to-teal-600 transition-all shrink-0"
        >+</button>
      </div>
      {entries.length > 0 ? (
        <div className="rounded-xl border-[1.5px] border-teal-100 overflow-hidden mt-3">
          {entries.map(([k, v], i) => (
            <div key={k} className={`flex items-center justify-between px-3.5 py-2.5 gap-3 bg-white ${i !== entries.length - 1 ? "border-b border-teal-50" : ""}`}>
              <span className="text-xs font-bold text-teal-500 uppercase tracking-wide w-32 shrink-0">{k}</span>
              <span className="text-sm text-teal-900 flex-1">{v}</span>
              <button type="button" onClick={() => remove(k)} className="text-red-400 hover:text-red-600 bg-transparent border-none cursor-pointer text-base font-bold p-0 leading-none transition-colors">×</button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-teal-300 italic mt-2">No specifications added yet.</p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   VARIANT OPTIONS EDITOR
════════════════════════════════════════════════════════════ */

function VariantOptionsEditor({
  variantOptions,
  onChange,
}: {
  variantOptions: IVariantOption[];
  onChange: (opts: IVariantOption[]) => void;
}) {
  const [optName, setOptName] = useState("");
  const [optNameErr, setOptNameErr] = useState("");
  const [optValueInputs, setOptValueInputs] = useState<Record<number, string>>({});
  const [optValueErrs, setOptValueErrs] = useState<Record<number, string>>({});

  const addOption = () => {
    const trimmed = optName.trim();
    if (!trimmed) { setOptNameErr("Option name is required"); return; }
    if (trimmed.length < 2) { setOptNameErr("Must be at least 2 characters"); return; }
    if (variantOptions.some((o) => o.name.toLowerCase() === trimmed.toLowerCase())) {
      setOptNameErr("Option already exists"); return;
    }
    onChange([...variantOptions, { name: trimmed, values: [] }]);
    setOptName(""); setOptNameErr("");
  };

  const removeOption = (i: number) => onChange(variantOptions.filter((_, idx) => idx !== i));

  const addValue = (oi: number) => {
    const raw = (optValueInputs[oi] ?? "").trim();
    if (!raw) { setOptValueErrs((p) => ({ ...p, [oi]: "Value is required" })); return; }
    if (variantOptions[oi].values.some((v) => v.toLowerCase() === raw.toLowerCase())) {
      setOptValueErrs((p) => ({ ...p, [oi]: "Value already exists" })); return;
    }
    onChange(variantOptions.map((o, idx) => idx === oi ? { ...o, values: [...o.values, raw] } : o));
    setOptValueInputs((p) => ({ ...p, [oi]: "" }));
    setOptValueErrs((p) => ({ ...p, [oi]: "" }));
  };

  const removeValue = (oi: number, vi: number) =>
    onChange(variantOptions.map((o, idx) => idx === oi ? { ...o, values: o.values.filter((_, vIdx) => vIdx !== vi) } : o));

  return (
    <div>
      <div className="flex gap-2 mb-1 items-start">
        <div className="flex-1">
          <input
            className={optNameErr ? inputErrCls : inputCls}
            placeholder="Option name (e.g. Color, Size, Weight)"
            value={optName}
            onChange={(e) => { setOptName(e.target.value); setOptNameErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && addOption()}
          />
          <FieldError msg={optNameErr} />
        </div>
        <button
          type="button"
          onClick={addOption}
          className="bg-gradient-to-br from-teal-700 to-teal-500 text-white border-none rounded-xl px-4 py-2.5 text-sm font-bold cursor-pointer hover:from-teal-800 hover:to-teal-600 transition-all shrink-0"
        >Add Option</button>
      </div>
      {variantOptions.length === 0 && (
        <p className="text-xs text-teal-300 italic mt-2">No variant options yet. Add options like "Color" or "Size".</p>
      )}
      {variantOptions.map((opt, oi) => (
        <div key={oi} className="border-[1.5px] border-teal-100 rounded-xl p-3.5 mb-2.5 bg-white mt-2">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-sm font-extrabold text-teal-700">{opt.name}</span>
            <button type="button" onClick={() => removeOption(oi)} className="text-xs text-red-400 hover:text-red-600 bg-transparent border-none cursor-pointer font-bold transition-colors">Remove Option</button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {opt.values.map((val, vi) => (
              <span key={vi} className="inline-flex items-center gap-1 bg-teal-100 text-teal-700 rounded-lg px-2.5 py-1 text-xs font-bold">
                {val}
                <button type="button" onClick={() => removeValue(oi, vi)} className="border-none bg-transparent cursor-pointer text-teal-500 hover:text-red-500 font-black p-0 leading-none transition-colors text-sm">×</button>
              </span>
            ))}
            {opt.values.length === 0 && <span className="text-xs text-teal-300 italic">No values yet</span>}
          </div>
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <input
                className={optValueErrs[oi] ? inputErrCls : inputCls}
                placeholder={`Add ${opt.name} value…`}
                value={optValueInputs[oi] ?? ""}
                onChange={(e) => { setOptValueInputs((p) => ({ ...p, [oi]: e.target.value })); setOptValueErrs((p) => ({ ...p, [oi]: "" })); }}
                onKeyDown={(e) => e.key === "Enter" && addValue(oi)}
              />
              <FieldError msg={optValueErrs[oi]} />
            </div>
            <button type="button" onClick={() => addValue(oi)} className="bg-teal-50 text-teal-600 border-[1.5px] border-teal-100 rounded-xl px-3.5 py-2.5 text-sm font-bold cursor-pointer hover:bg-teal-100 transition-colors shrink-0">+</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   VARIANT EDITOR
════════════════════════════════════════════════════════════ */

interface VariantEditorProps {
  variant: VariantPayload;
  index: number;
  variantOptions: IVariantOption[];
  onChange: (v: VariantPayload) => void;
  onRemove: () => void;
  imageFiles: File[];
  onImageChange: (files: File[]) => void;
  canRemove: boolean;
  errors?: VariantErrors;
  onClearError?: (field: keyof VariantErrors) => void;
  removePublicIds?: string[];
  onRemovePublicId?: (publicId: string) => void;
}

function VariantEditor({
  variant,
  index,
  variantOptions,
  onChange,
  onRemove,
  imageFiles,
  onImageChange,
  canRemove,
  errors = {},
  onClearError,
  removePublicIds = [],
  onRemovePublicId,
}: VariantEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const update = (patch: Partial<VariantPayload>) => onChange({ ...variant, ...patch });

  const handleSellModeChange = (sellMode: SellMode) => {
    const baseUnit: BaseUnit = sellMode === "packaged" ? "pcs" : "mg";
    const priceUnit = derivePriceUnit(sellMode, baseUnit);
    update({ sellMode, priceUnit, quantity: { ...variant.quantity, baseUnit } });
    onClearError?.("baseUnit");
  };

  const handleBaseUnitChange = (baseUnit: BaseUnit) => {
    const priceUnit = derivePriceUnit(variant.sellMode, baseUnit);
    update({ priceUnit, quantity: { ...variant.quantity, baseUnit } });
    onClearError?.("baseUnit");
  };

  const isLoose = variant.sellMode === "loose";
  const hasErrors = Object.values(errors).some(Boolean);

  return (
    <div className={`border-[1.5px] rounded-2xl p-4 mb-3.5 transition-colors ${hasErrors ? "border-red-200 bg-red-50/20" : "border-teal-200 bg-teal-50/60"
      }`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-3.5 flex-wrap gap-2">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className={`text-white text-xs font-extrabold rounded-lg px-2.5 py-1 shadow-sm ${hasErrors ? "bg-gradient-to-br from-red-500 to-red-400" : "bg-gradient-to-br from-teal-700 to-teal-500"
            }`}>V{index + 1}</span>
          {variantOptions.length > 0 && (
            <span className="text-xs text-teal-500 font-semibold">
              {variantOptions.map((o) => variant.attributes[o.name] ?? "—").join(" / ")}
            </span>
          )}
          {variant.sku && (
            <span className="text-[11px] text-teal-400 font-mono bg-teal-100 px-2 py-0.5 rounded-lg">{variant.sku}</span>
          )}
          {hasErrors && (
            <span className="text-[11px] text-red-500 font-semibold bg-red-100 px-2 py-0.5 rounded-lg">Fix errors ↓</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <ToggleSwitch checked={variant.isActive} onChange={(v) => update({ isActive: v })} label="Active" />
            <span className={`text-xs font-semibold ${variant.isActive ? "text-teal-600" : "text-gray-400"}`}>
              {variant.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          {canRemove && (
            <button type="button" onClick={onRemove} className="bg-white text-red-500 border-[1.5px] border-red-200 rounded-lg px-3 py-1.5 text-xs font-bold hover:bg-red-50 transition-colors cursor-pointer">
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Attribute selectors */}
      {variantOptions.length > 0 && (
        <div className="mb-3.5">
          <p className="text-[11px] font-extrabold text-teal-700 uppercase tracking-widest mb-2">Attributes</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {variantOptions.map((opt) => (
              <div key={opt.name}>
                <label className="block text-[11px] font-bold text-teal-500 mb-1 uppercase tracking-wide">{opt.name}</label>
                {opt.values.length > 0 ? (
                  <select
                    value={variant.attributes[opt.name] ?? ""}
                    onChange={(e) => { update({ attributes: { ...variant.attributes, [opt.name]: e.target.value } }); onClearError?.("attributes"); }}
                    className={inputCls}
                  >
                    {opt.values.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                ) : (
                  <div className="px-3.5 py-2.5 border-[1.5px] border-dashed border-teal-200 rounded-xl text-xs text-teal-300 italic">No values defined</div>
                )}
              </div>
            ))}
          </div>
          <FieldError msg={errors.attributes} />
        </div>
      )}

      {/* Sell Mode + Base Unit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-1">
        <FormField label="Sell Mode" required>
          <Select
            value={variant.sellMode}
            onChange={(v) => handleSellModeChange(v as SellMode)}
            options={[
              { label: "Packaged (per piece)", value: "packaged" },
              { label: "Loose (by weight/volume)", value: "loose" },
            ]}
          />
        </FormField>

        {isLoose && (
          <FormField
            label="Base Unit"
            required
            error={errors.baseUnit}
            hint={!errors.baseUnit ? `Price will be per ${variant.priceUnit}` : undefined}
          >
            <Select
              value={variant.quantity.baseUnit}
              onChange={(v) => handleBaseUnitChange(v as BaseUnit)}
              hasError={!!errors.baseUnit}
              options={[
                { label: "Milligrams (mg) → price per kg", value: "mg" },
                { label: "Millilitres (ml) → price per liter", value: "ml" },
              ]}
            />
          </FormField>
        )}
      </div>

      {/* Pricing — no spinner arrows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-1">
        <FormField label={`Buying Price (₹/${getPriceUnitLabel(variant.priceUnit)})`} required error={errors.buyingPrice}>
          <input
            className={errors.buyingPrice ? inputErrCls : inputCls}
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={variant.price.buying === 0 ? "" : variant.price.buying}
            onChange={(e) => {
              update({ price: { ...variant.price, buying: e.target.value === "" ? 0 : +e.target.value } });
              onClearError?.("buyingPrice");
            }}
          />
        </FormField>
        <FormField label={`Selling Price (₹/${getPriceUnitLabel(variant.priceUnit)})`} required error={errors.sellingPrice}>
          <input
            className={errors.sellingPrice ? inputErrCls : inputCls}
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={variant.price.selling === 0 ? "" : variant.price.selling}
            onChange={(e) => {
              update({ price: { ...variant.price, selling: e.target.value === "" ? 0 : +e.target.value } });
              onClearError?.("sellingPrice");
            }}
          />
        </FormField>
      </div>

      {/* Stock — no spinner arrows */}
      <FormField label={`In Stock (${variant.quantity.baseUnit})`} required error={errors.inStock}>
        <input
          className={errors.inStock ? inputErrCls : inputCls}
          type="number"
          inputMode="numeric"
          placeholder="0"
          value={variant.quantity.inStock === 0 ? "" : variant.quantity.inStock}
          onChange={(e) => {
            update({ quantity: { ...variant.quantity, inStock: e.target.value === "" ? 0 : +e.target.value } });
            onClearError?.("inStock");
          }}
        />
      </FormField>

      {/* Info chip */}
      <div className="mb-3 px-3 py-2 bg-teal-50 border border-teal-100 rounded-xl text-[11px] text-teal-600 font-semibold flex items-center gap-2">
        <span className="text-teal-400">ℹ</span>
        {variant.sellMode === "packaged"
          ? "Packaged: prices are per piece, stock counted in pieces"
          : `Loose: stock stored in ${variant.quantity.baseUnit}, prices shown per ${variant.priceUnit}`}
      </div>

      {/* Images */}
      <div className="mt-1">
        <p className="text-[11px] font-extrabold text-teal-700 uppercase tracking-widest mb-2">Images</p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="bg-white text-teal-600 border-[1.5px] border-teal-100 rounded-xl px-4 py-2 text-sm font-bold cursor-pointer hover:bg-teal-50 transition-colors"
        >📷 Upload Images</button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => { if (e.target.files) onImageChange(Array.from(e.target.files)); }} />

        {/* Existing images (edit mode) */}
        {variant.images && variant.images.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-2.5">
            {variant.images.map((img, ii) => {
              const marked = removePublicIds.includes(img.public_id);
              return (
                <div key={ii} className="relative w-[64px] h-[64px]">
                  <div className={`w-full h-full rounded-xl overflow-hidden border-[1.5px] ${marked ? "border-red-300 opacity-40" : "border-teal-100"}`}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </div>
                  {onRemovePublicId && (
                    <button type="button" onClick={() => onRemovePublicId(img.public_id)}
                      title={marked ? "Undo remove" : "Remove image"}
                      className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-none cursor-pointer text-[11px] font-black leading-none flex items-center justify-center transition-colors ${marked ? "bg-green-500 text-white hover:bg-green-600" : "bg-red-500 text-white hover:bg-red-600"
                        }`}>{marked ? "↩" : "×"}</button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* New file previews */}
        {imageFiles.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-2.5">
            {imageFiles.map((f, fi) => (
              <div key={fi} className="relative w-[64px] h-[64px] rounded-xl overflow-hidden border-[1.5px] border-teal-200">
                <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => onImageChange(imageFiles.filter((_, ffi) => ffi !== fi))}
                  className="absolute top-0.5 right-0.5 bg-white/90 border-none rounded-full w-[18px] h-[18px] cursor-pointer text-[11px] font-black leading-[18px] text-center text-red-500 p-0 hover:bg-white transition-colors">×</button>
              </div>
            ))}
            <div className="flex items-center text-xs text-teal-400 font-semibold px-1">+{imageFiles.length} new</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   PRODUCT FORM MODAL
════════════════════════════════════════════════════════════ */

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    payload: CreateProductPayload | UpdateProductPayload,
    imageFiles: File[][],
    variantIds: (string | undefined)[],
    removeVariantImages: Record<string, string[]>
  ) => Promise<void>;
  initialData?: Product | null;
  categories: { id: string; name: string }[];
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
  const [specifications, setSpecifications] = useState<Record<string, string>>({});
  const [variantOptions, setVariantOptions] = useState<IVariantOption[]>([]);
  const [variants, setVariants] = useState<VariantPayload[]>([buildEmptyVariant([])]);
  const [variantImages, setVariantImages] = useState<File[][]>([[]]);
  const [removeVariantImages, setRemoveVariantImages] = useState<Record<string, string[]>>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [activeTab, setActiveTab] = useState<"basic" | "specs" | "variants">("basic");

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setName(initialData.name);
      setCategory(initialData.category?.id ?? "");
      setType(initialData.type);
      setDescription(initialData.description ?? "");
      setSpecifications(initialData.specifications ?? {});
      const opts = initialData.variantOptions ?? [];
      setVariantOptions(opts);
      const mapped: VariantPayload[] = initialData.variants.map((v) => ({
        _id: v._id, sku: v.sku, sellMode: v.sellMode, attributes: v.attributes ?? {},
        price: v.price, priceUnit: v.priceUnit, quantity: v.quantity, images: v.images, isActive: v.isActive,
      }));
      setVariants(mapped);
      setVariantImages(mapped.map(() => []));
      setRemoveVariantImages({});
    } else {
      setName(""); setCategory(categories[0]?.id ?? ""); setType("food");
      setDescription(""); setSpecifications({}); setVariantOptions([]);
      setVariants([buildEmptyVariant([])]); setVariantImages([[]]); setRemoveVariantImages({});
    }
    setFieldErrors({});
    setActiveTab("basic");
  }, [open, initialData, categories]);

  const handleVariantOptionsChange = (opts: IVariantOption[]) => {
    setVariantOptions(opts);
    setVariants((prev) => syncVariantAttributes(prev, opts));
  };

  const addVariant = () => {
    setVariants((p) => [...p, buildEmptyVariant(variantOptions)]);
    setVariantImages((p) => [...p, []]);
  };

  const toggleRemoveImage = (variantId: string, publicId: string) => {
    setRemoveVariantImages((prev) => {
      const existing = prev[variantId] ?? [];
      const marked = existing.includes(publicId);
      return { ...prev, [variantId]: marked ? existing.filter((id) => id !== publicId) : [...existing, publicId] };
    });
  };

  const clearFieldError = (field: keyof Omit<FieldErrors, "variants">) =>
    setFieldErrors((p) => ({ ...p, [field]: undefined }));

  const clearVariantError = (vi: number, field: keyof VariantErrors) =>
    setFieldErrors((p) => ({
      ...p,
      variants: { ...(p.variants ?? {}), [vi]: { ...(p.variants?.[vi] ?? {}), [field]: undefined } },
    }));

  /* ── Full validation ── */
  const validate = (): boolean => {
    const errors: FieldErrors = {};
    let firstErrTab: "basic" | "variants" | null = null;

    // Product name
    if (!name.trim()) { errors.name = "Product name is required"; firstErrTab ??= "basic"; }
    else if (name.trim().length < 2) { errors.name = "Name must be at least 2 characters"; firstErrTab ??= "basic"; }
    else if (name.trim().length > 100) { errors.name = "Name must be under 100 characters"; firstErrTab ??= "basic"; }

    // Category
    if (!category) { errors.category = "Please select a category"; firstErrTab ??= "basic"; }

    // Description (optional but bounded)
    if (description.trim().length > 500) { errors.description = "Description must be under 500 characters"; firstErrTab ??= "basic"; }

    // Variants
    const variantErrors: Record<number, VariantErrors> = {};
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const ve: VariantErrors = {};

      // Buying price
      if (isNaN(v.price.buying) || v.price.buying === null) ve.buyingPrice = "Enter a valid number";
      else if (v.price.buying < 0) ve.buyingPrice = "Buying price cannot be negative";

      // Selling price
      if (isNaN(v.price.selling) || v.price.selling === null) ve.sellingPrice = "Enter a valid number";
      else if (v.price.selling <= 0) ve.sellingPrice = "Selling price must be greater than 0";
      else if (!ve.buyingPrice && v.price.selling < v.price.buying) ve.sellingPrice = "Selling price should be ≥ buying price";

      // Stock
      if (isNaN(v.quantity.inStock) || v.quantity.inStock === null) ve.inStock = "Enter a valid number";
      else if (v.quantity.inStock < 0) ve.inStock = "Stock cannot be negative";

      // Business rules
      if (v.sellMode === "packaged") {
        if (v.quantity.baseUnit !== "pcs") ve.baseUnit = "Packaged variants must use 'pcs'";
        if (v.priceUnit !== "pcs") ve.baseUnit = "Packaged variants must use priceUnit 'pcs'";
      }
      if (v.sellMode === "loose") {
        if (!["mg", "ml"].includes(v.quantity.baseUnit)) {
          ve.baseUnit = "Loose variants must use 'mg' or 'ml'";
        } else if (v.quantity.baseUnit === "mg" && v.priceUnit !== "kg") {
          ve.baseUnit = "mg base unit requires kg price unit";
        } else if (v.quantity.baseUnit === "ml" && v.priceUnit !== "liter") {
          ve.baseUnit = "ml base unit requires liter price unit";
        }
      }

      if (Object.keys(ve).length > 0) { variantErrors[i] = ve; firstErrTab ??= "variants"; }
    }

    if (Object.keys(variantErrors).length > 0) errors.variants = variantErrors;
    setFieldErrors(errors);

    // Auto-switch to first tab that has errors
    if (firstErrTab && firstErrTab !== activeTab) setActiveTab(firstErrTab);

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const variantIds = variants.map((v) => v._id);
    await onSubmit(
      {
        name: name.trim(), category, type,
        description: description.trim() || null,
        specifications, variantOptions, variants,
        ...(isEdit ? { removeVariantImages } : {}),
      } as CreateProductPayload | UpdateProductPayload,
      variantImages, variantIds, removeVariantImages
    );
  };

  if (!open) return null;

  const basicHasErrors = !!(fieldErrors.name || fieldErrors.category || fieldErrors.description);
  const variantsHasErrors = !!(fieldErrors.variants && Object.keys(fieldErrors.variants).length > 0);

  const tabs = [
    { id: "basic" as const, label: "Basic Info", dot: basicHasErrors },
    { id: "specs" as const, label: `Specs (${Object.keys(specifications).length})`, dot: false },
    { id: "variants" as const, label: `Variants (${variants.length})`, dot: variantsHasErrors },
  ];

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[2000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[20px] shadow-[0_24px_64px_rgba(15,118,110,0.18),0_4px_16px_rgba(0,0,0,0.1)] w-full max-w-[760px] max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="bg-gradient-to-br from-teal-700 to-teal-500 px-6 py-5 rounded-t-[20px] flex items-center justify-between shrink-0">
          <div>
            <h2 className="m-0 text-white text-lg font-extrabold">{isEdit ? "Edit Product" : "Add New Product"}</h2>
            <p className="m-0 mt-0.5 text-white/70 text-xs">{isEdit ? "Update product details and variants" : "Fill in the details below"}</p>
          </div>
          <button type="button" onClick={onClose} className="bg-white/15 border-none rounded-lg text-white w-8 h-8 cursor-pointer text-lg font-bold hover:bg-white/25 transition-colors">×</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-2 border-teal-50 px-6 shrink-0 bg-white">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3.5 text-sm font-bold border-b-2 -mb-[2px] transition-colors cursor-pointer bg-transparent flex items-center gap-1.5 ${activeTab === tab.id ? "border-teal-500 text-teal-700" : "border-transparent text-teal-400 hover:text-teal-600"
                }`}>
              {tab.label}
              {tab.dot && <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block shrink-0" />}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">

          {activeTab === "basic" && (
            <div>
              <SectionTitle>Basic Information</SectionTitle>
              <FormField label="Product Name" required error={fieldErrors.name}>
                <input
                  className={fieldErrors.name ? inputErrCls : inputCls}
                  value={name}
                  onChange={(e) => { setName(e.target.value); clearFieldError("name"); }}
                  placeholder="e.g. Royal Canin Adult"
                  maxLength={100}
                />
                {!fieldErrors.name && (
                  <p className="text-[11px] text-teal-300 mt-1 text-right">{name.length}/100</p>
                )}
              </FormField>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                <FormField label="Category" required error={fieldErrors.category}>
                  <Select
                    value={category}
                    onChange={(v) => { setCategory(v); clearFieldError("category"); }}
                    hasError={!!fieldErrors.category}
                    options={[
                      { label: "Select category…", value: "" },
                      ...categories.map((c) => ({ label: c.name, value: c.id })),
                    ]}
                  />
                </FormField>
                <FormField label="Type" required>
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
              <FormField label="Description" error={fieldErrors.description}>
                <textarea
                  className={`${fieldErrors.description ? inputErrCls : inputCls} min-h-[90px] resize-y`}
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); clearFieldError("description"); }}
                  placeholder="Optional product description…"
                  maxLength={500}
                />
                {!fieldErrors.description && (
                  <p className="text-[11px] text-teal-300 mt-1 text-right">{description.length}/500</p>
                )}
              </FormField>
            </div>
          )}

          {activeTab === "specs" && (
            <div>
              <SectionTitle>Product Specifications</SectionTitle>
              <p className="text-xs text-teal-400 mb-4">Add product-level specs like material, dimensions, breed compatibility, shelf life, etc.</p>
              <SpecificationsEditor specs={specifications} onChange={setSpecifications} />
            </div>
          )}

          {activeTab === "variants" && (
            <div>
              <SectionTitle>Variant Options</SectionTitle>
              <p className="text-xs text-teal-400 mb-3">Define option dimensions (e.g. Color → Red / Black, Size → S / M / L). Each variant picks one value per option.</p>
              <VariantOptionsEditor variantOptions={variantOptions} onChange={handleVariantOptionsChange} />

              <div className="mt-5">
                <SectionTitle>Variants</SectionTitle>
                <div className="bg-teal-50 border-[1.5px] border-teal-100 rounded-xl px-4 py-3 text-teal-700 text-xs font-semibold mb-3.5 space-y-1">
                  <p><span className="font-extrabold">Packaged</span> — sold by piece. Stock in pcs, price per pcs.</p>
                  <p><span className="font-extrabold">Loose (mg)</span> — sold by weight. Stock in mg, price per kg.</p>
                  <p><span className="font-extrabold">Loose (ml)</span> — sold by volume. Stock in ml, price per liter.</p>
                </div>

                {variants.map((v, i) => (
                  <VariantEditor
                    key={i}
                    variant={v}
                    index={i}
                    variantOptions={variantOptions}
                    onChange={(updated) => setVariants((p) => p.map((old, idx) => (idx === i ? updated : old)))}
                    onRemove={() => {
                      setVariants((p) => p.filter((_, idx) => idx !== i));
                      setVariantImages((p) => p.filter((_, idx) => idx !== i));
                      setFieldErrors((p) => {
                        const vErrs = { ...(p.variants ?? {}) };
                        delete vErrs[i];
                        return { ...p, variants: vErrs };
                      });
                    }}
                    imageFiles={variantImages[i] ?? []}
                    onImageChange={(files) => setVariantImages((p) => p.map((old, idx) => (idx === i ? files : old)))}
                    canRemove={variants.length > 1}
                    errors={fieldErrors.variants?.[i] ?? {}}
                    onClearError={(field) => clearVariantError(i, field)}
                    removePublicIds={v._id ? (removeVariantImages[v._id] ?? []) : []}
                    onRemovePublicId={v._id ? (publicId) => toggleRemoveImage(v._id!, publicId) : undefined}
                  />
                ))}
                <button type="button" onClick={addVariant}
                  className="w-full bg-white text-teal-600 border-[1.5px] border-dashed border-teal-200 rounded-xl px-5 py-3 text-sm font-bold cursor-pointer hover:bg-teal-50 hover:border-teal-400 transition-all">
                  + Add Another Variant
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-teal-50 flex items-center justify-between shrink-0 bg-white rounded-b-[20px]">
          <div>
            {activeTab !== "variants" && (
              <button type="button" onClick={() => setActiveTab(activeTab === "basic" ? "specs" : "variants")}
                className="text-teal-500 hover:text-teal-700 underline cursor-pointer bg-transparent border-none text-sm font-semibold transition-colors">
                Next →
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
            <button type="button" onClick={handleSubmit} disabled={loading}
              className={`${btnPrimary} ${loading ? "opacity-70 cursor-not-allowed" : ""}`}>
              {loading ? "Saving…" : isEdit ? "Update Product" : "Create Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   VIEW PRODUCT MODAL
════════════════════════════════════════════════════════════ */

export function ViewProductModal({ open, onClose, product }: { open: boolean; onClose: () => void; product: Product | null }) {
  if (!open || !product) return null;

  const typeCls: Record<string, string> = {
    food: "bg-green-100 text-green-700", animal: "bg-blue-100 text-blue-700",
    accessory: "bg-yellow-100 text-yellow-700", medicine: "bg-pink-100 text-pink-700", other: "bg-gray-100 text-gray-700",
  };

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between py-2 border-b border-teal-50 gap-3">
      <span className="text-[11px] font-extrabold text-teal-400 uppercase tracking-wide shrink-0">{label}</span>
      <span className="text-sm text-teal-900 text-right">{value}</span>
    </div>
  );

  const specEntries = product.specifications ? Object.entries(product.specifications) : [];
  const variantOptions = product.variantOptions ?? [];

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[2000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[20px] shadow-[0_24px_64px_rgba(15,118,110,0.18),0_4px_16px_rgba(0,0,0,0.1)] w-full max-w-[700px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-teal-700 to-teal-500 px-6 py-5 rounded-t-[20px] flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="m-0 text-white text-lg font-extrabold">Product Details</h2>
            <p className="m-0 mt-0.5 text-white/70 text-xs">{product.name}</p>
          </div>
          <button type="button" onClick={onClose} className="bg-white/15 border-none rounded-lg text-white w-8 h-8 cursor-pointer text-lg font-bold hover:bg-white/25 transition-colors">×</button>
        </div>

        <div className="p-6">
          <SectionTitle>Basic Info</SectionTitle>
          <InfoRow label="Name" value={<span className="font-bold">{product.name}</span>} />
          <InfoRow label="Type" value={<span className={`${typeCls[product.type] ?? "bg-gray-100 text-gray-700"} rounded-lg px-2.5 py-0.5 text-xs font-bold`}>{product.type}</span>} />
          <InfoRow label="Category" value={product.category?.name ?? "—"} />
          <InfoRow label="Status" value={<span className={`font-bold ${product.isActive ? "text-green-600" : "text-red-600"}`}>{product.isActive ? "Active" : "Inactive"}</span>} />
          {product.description && <InfoRow label="Description" value={product.description} />}

          {variantOptions.length > 0 && (
            <><div className="mt-4"><SectionTitle>Variant Options</SectionTitle></div>
              <div className="flex flex-wrap gap-2 mb-3">
                {variantOptions.map((opt) => (
                  <div key={opt.name} className="bg-teal-50 border-[1.5px] border-teal-100 rounded-xl px-3.5 py-2">
                    <p className="text-[11px] font-extrabold text-teal-600 uppercase tracking-wide mb-1.5">{opt.name}</p>
                    <div className="flex flex-wrap gap-1">
                      {opt.values.map((v) => <span key={v} className="bg-teal-100 text-teal-700 rounded-lg px-2 py-0.5 text-xs font-bold">{v}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {specEntries.length > 0 && (
            <><div className="mt-4"><SectionTitle>Specifications</SectionTitle></div>
              <div className="rounded-xl border-[1.5px] border-teal-100 overflow-hidden mb-4">
                {specEntries.map(([k, v], i) => (
                  <div key={k} className={`flex items-center justify-between px-4 py-2.5 ${i !== specEntries.length - 1 ? "border-b border-teal-50" : ""}`}>
                    <span className="text-xs font-extrabold text-teal-500 uppercase tracking-wide w-36">{k}</span>
                    <span className="text-sm text-teal-900">{v}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-2"><SectionTitle>Variants ({product.variants.length})</SectionTitle></div>
          {product.variants.map((v, i) => (
            <div key={v._id ?? i} className="border-[1.5px] border-teal-100 rounded-xl p-3.5 mb-3 bg-teal-50/60">
              <div className="flex justify-between items-center mb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-gradient-to-br from-teal-700 to-teal-500 text-white text-xs font-extrabold rounded-lg px-2.5 py-1">V{i + 1}</span>
                  {Object.entries(v.attributes ?? {}).map(([k, val]) => (
                    <span key={k} className="bg-teal-100 text-teal-700 rounded-lg px-2.5 py-0.5 text-xs font-bold">{k}: {val}</span>
                  ))}
                  <span className="bg-white border border-teal-100 text-teal-500 rounded-lg px-2 py-0.5 text-[11px] font-semibold capitalize">{v.sellMode}</span>
                </div>
                <span className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${v.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                  {v.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm mb-2">
                <div>
                  <div className="text-teal-400 text-[11px] font-bold uppercase">Buying</div>
                  <div className="text-teal-900 font-bold">₹{v.price.buying.toFixed(2)}/{v.priceUnit}</div>
                </div>
                <div>
                  <div className="text-teal-400 text-[11px] font-bold uppercase">Selling</div>
                  <div className="text-teal-900 font-bold">₹{v.price.selling.toFixed(2)}/{v.priceUnit}</div>
                </div>
                <div>
                  <div className="text-teal-400 text-[11px] font-bold uppercase">In Stock</div>
                  <div className="text-teal-900 font-bold">{v.quantity.inStock} {v.quantity.baseUnit}</div>
                </div>
              </div>
              {v.sku && <div className="text-[11px] text-teal-400 font-mono mb-2">SKU: {v.sku}</div>}
              {v.images.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {v.images.map((img, ii) => (
                    <img key={ii} src={img.url} alt="" className="w-[56px] h-[56px] object-cover rounded-lg border-[1.5px] border-teal-100" />
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end mt-2">
            <button type="button" onClick={onClose} className={btnPrimary}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   DELETE CONFIRM MODAL
════════════════════════════════════════════════════════════ */

export function DeleteProductModal({ open, onClose, onConfirm, product, loading = false }: {
  open: boolean; onClose: () => void; onConfirm: () => Promise<void>; product: Product | null; loading?: boolean;
}) {
  if (!open || !product) return null;
  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[2000] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[20px] shadow-[0_24px_64px_rgba(15,118,110,0.18),0_4px_16px_rgba(0,0,0,0.1)] w-full max-w-[420px]" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-br from-teal-700 to-teal-500 px-6 py-5 rounded-t-[20px] flex items-center justify-between">
          <h2 className="m-0 text-white text-lg font-extrabold">Delete Product</h2>
          <button type="button" onClick={onClose} className="bg-white/15 border-none rounded-lg text-white w-8 h-8 cursor-pointer text-lg font-bold hover:bg-white/25 transition-colors">×</button>
        </div>
        <div className="p-6">
          <div className="text-center text-5xl mb-4">🗑️</div>
          <p className="text-center text-teal-900 text-[15px] mb-1.5 font-bold">Are you sure you want to delete?</p>
          <p className="text-center text-teal-400 text-sm mb-6">
            <strong className="text-teal-700">{product.name}</strong> will be soft-deleted and hidden from listings.
          </p>
          <div className="flex gap-3 justify-center">
            <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
            <button type="button" onClick={onConfirm} disabled={loading}
              className={`bg-gradient-to-br from-red-600 to-red-500 text-white border-none rounded-xl px-5 py-2.5 text-sm font-bold cursor-pointer hover:from-red-700 hover:to-red-600 transition-all ${loading ? "opacity-70 cursor-not-allowed" : ""}`}>
              {loading ? "Deleting…" : "Delete Product"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}