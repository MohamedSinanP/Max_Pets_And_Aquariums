import type { BaseUnit } from "../types/product";

function trimNumber(value: number, maxFractionDigits = 3) {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });
}

/** stored mg -> display g */
export function storedToDisplayQty(value: number, baseUnit: BaseUnit): number {
  if (baseUnit === "mg") return value / 1000;
  return value;
}

/** display g -> stored mg */
export function displayToStoredQty(value: number, baseUnit: BaseUnit): number {
  if (baseUnit === "mg") return Math.round(value * 1000);
  return value;
}

export function getDisplayUnit(baseUnit: BaseUnit): string {
  if (baseUnit === "mg") return "g";
  return baseUnit;
}

export function formatQuantityForUser(value: number, baseUnit: BaseUnit): string {
  if (baseUnit === "mg") {
    const g = value / 1000;
    const kg = value / 1_000_000;
    return `${trimNumber(g, 3)} g (${trimNumber(kg, 3)} kg)`;
  }

  if (baseUnit === "ml") {
    const liter = value / 1000;
    return `${trimNumber(value, 0)} ml (${trimNumber(liter, 3)} L)`;
  }

  return `${trimNumber(value, 0)} pcs`;
}