import type { Product, ProductType } from "../types/product";

import animalPlaceholder from "../assets/product-placeholders/animal.svg";
import foodPlaceholder from "../assets/product-placeholders/food.svg";
import accessoryPlaceholder from "../assets/product-placeholders/accessory.svg";
import medicinePlaceholder from "../assets/product-placeholders/medicine.svg";
import otherPlaceholder from "../assets/product-placeholders/other.svg";

export const PRODUCT_TYPE_PLACEHOLDERS: Record<ProductType, string> = {
  animal: animalPlaceholder,
  food: foodPlaceholder,
  accessory: accessoryPlaceholder,
  medicine: medicinePlaceholder,
  other: otherPlaceholder,
};

export function getProductPlaceholderByType(type?: ProductType | null): string {
  if (!type) return otherPlaceholder;
  return PRODUCT_TYPE_PLACEHOLDERS[type] ?? otherPlaceholder;
}

export function getProductImage(product: Product, variantId?: string): string {
  if (!product?.variants?.length) {
    return getProductPlaceholderByType(product?.type);
  }

  // 1. If a specific variant is requested, prefer its first image
  if (variantId) {
    const selectedVariant = product.variants.find((v) => v._id === variantId);
    const selectedVariantImage = selectedVariant?.images?.[0]?.url;
    if (selectedVariantImage) return selectedVariantImage;
  }

  // 2. Otherwise use the first image from any variant
  const firstVariantImage = product.variants.find((v) => v.images?.[0]?.url)?.images?.[0]?.url;
  if (firstVariantImage) return firstVariantImage;

  // 3. Fallback by product type
  return getProductPlaceholderByType(product.type);
}