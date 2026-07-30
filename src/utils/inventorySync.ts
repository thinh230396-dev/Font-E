import { InventoryItem } from "../components/TenantAdminInventory";
import { getTenantAdminInitialData } from "./mockDataReset";

export type ColorStatus = "ACTIVE" | "LOW" | "OUT";

export interface PolishColor {
  id: string;
  name: string;
  brand: string;
  code: string;
  hex: string;
  finish: string;
  stock: number;
  minimumStock: number;
  monthlyUsage: number;
  linkedDesigns: number;
  status: ColorStatus;
  branches: ("Q1" | "Q3")[];
  collection: string;
  location: string;
  updatedAt: string;
  // Inventory synchronization fields
  inventoryItemId?: string;
  capacityMl?: number;
  dosagePerServiceMl?: number;
}

export const getInventoryStorageKey = (tenantName: string) =>
  `tenant-admin-inventory-v1:${tenantName}`;
export const getColorStorageKey = (tenantName: string) =>
  `tenant-admin-nail-colors-v1:${tenantName}`;

/**
 * Synchronize Polish Colors with linked Inventory Items
 */
export function syncColorsWithInventory(
  colors: PolishColor[],
  inventory: InventoryItem[]
): PolishColor[] {
  return colors.map((color) => {
    if (!color.inventoryItemId) {
      const status: ColorStatus =
        color.stock <= 0 ? "OUT" : color.stock <= color.minimumStock ? "LOW" : "ACTIVE";
      return { ...color, status };
    }

    const inv = inventory.find((item) => item.id === color.inventoryItemId);
    if (!inv) {
      const status: ColorStatus =
        color.stock <= 0 ? "OUT" : color.stock <= color.minimumStock ? "LOW" : "ACTIVE";
      return { ...color, status };
    }

    const stock = inv.stock;
    const minimumStock = inv.minimum;
    const status: ColorStatus =
      stock <= 0 ? "OUT" : stock <= minimumStock ? "LOW" : "ACTIVE";

    return {
      ...color,
      stock,
      minimumStock,
      status,
      capacityMl: color.capacityMl || 15,
      dosagePerServiceMl: color.dosagePerServiceMl || 5,
    };
  });
}

/**
 * Load fresh Inventory from localStorage
 */
export function loadInventoryItems(tenantName: string, seed: InventoryItem[]): InventoryItem[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(getInventoryStorageKey(tenantName));
    return getTenantAdminInitialData(raw ? JSON.parse(raw) : null, seed);
  } catch {
    return seed;
  }
}

/**
 * Load fresh Polish Colors from localStorage
 */
export function loadPolishColors(tenantName: string, seed: PolishColor[]): PolishColor[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(getColorStorageKey(tenantName));
    return getTenantAdminInitialData(raw ? JSON.parse(raw) : null, seed);
  } catch {
    return seed;
  }
}

/**
 * Save updated Inventory & Colors to localStorage and notify other components
 */
export function saveInventoryAndColors(
  tenantName: string,
  inventory: InventoryItem[],
  colors: PolishColor[]
) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getInventoryStorageKey(tenantName), JSON.stringify(inventory));
    const syncedColors = syncColorsWithInventory(colors, inventory);
    localStorage.setItem(getColorStorageKey(tenantName), JSON.stringify(syncedColors));
    window.dispatchEvent(new Event("salonsys_inventory_updated"));
  } catch (err) {
    console.error("Error saving inventory and colors:", err);
  }
}

/**
 * Apply inventory deduction or restoration based on invoice status
 * Formula: New Stock = Current Stock - (Dosage * Quantity) [if DEDUCT]
 *          New Stock = Current Stock + (Dosage * Quantity) [if RESTORE]
 */
export function updateInventoryForColorUsage(params: {
  tenantName: string;
  colorId: string;
  serviceQuantity?: number;
  action: "DEDUCT" | "RESTORE";
  inventorySeed: InventoryItem[];
  colorSeed: PolishColor[];
  invoiceId?: string;
  actorName?: string;
}): { success: boolean; message: string; newStock?: number } {
  const {
    tenantName,
    colorId,
    serviceQuantity = 1,
    action,
    inventorySeed,
    colorSeed,
    invoiceId = "HD-SYSTEM",
    actorName = "Thu ngân / Hệ thống POS",
  } = params;

  if (typeof window === "undefined") return { success: false, message: "Server environment" };

  const inventory = loadInventoryItems(tenantName, inventorySeed);
  const colors = loadPolishColors(tenantName, colorSeed);

  const color = colors.find((c) => c.id === colorId);
  if (!color) {
    return { success: false, message: `Không tìm thấy màu sơn mã ${colorId}` };
  }

  const linkedItemId = color.inventoryItemId || `SKU-${color.id.replace("CLR-", "")}`;
  const invIndex = inventory.findIndex((item) => item.id === linkedItemId);

  if (invIndex === -1) {
    return {
      success: false,
      message: `Màu sơn "${color.name}" chưa liên kết với sản phẩm vật tư trong kho.`,
    };
  }

  const invItem = inventory[invIndex];
  const dosage = color.dosagePerServiceMl || 5;
  const capacity = color.capacityMl || 15;

  // Determine usage deduction units based on item unit
  let usageAmount = dosage * serviceQuantity; // in ml
  let stockDelta = 0;

  if (invItem.unit === "ml") {
    stockDelta = usageAmount;
  } else {
    // Unit is chai/lọ/hũ. E.g. 5ml out of 15ml bottle = 0.33 bottle, or rounded bottle deduction
    const bottlesUsed = usageAmount / capacity;
    // If stock is integer bottle count, we can use 2 decimal places or round safely
    stockDelta = Number(bottlesUsed.toFixed(2));
  }

  let newStock = invItem.stock;
  if (action === "DEDUCT") {
    newStock = Math.max(0, Number((invItem.stock - stockDelta).toFixed(2)));
  } else {
    newStock = Number((invItem.stock + stockDelta).toFixed(2));
  }

  const nowStr = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const movementType = action === "DEDUCT" ? "OUT" : "IN";
  const movementNote =
    action === "DEDUCT"
      ? `Tự động trừ kho theo hóa đơn ${invoiceId} (Định mức ${dosage}ml × ${serviceQuantity} dịch vụ = ${usageAmount}ml)`
      : `Hoàn kho tự động do hủy/hoàn tiền hóa đơn ${invoiceId} (+${usageAmount}ml)`;

  const newMovement = {
    id: `MOV-${Date.now().toString(36).toUpperCase()}`,
    type: movementType as "IN" | "OUT",
    quantity: stockDelta,
    occurredAt: `${nowStr} · POS`,
    actor: actorName,
    reference: invoiceId,
    note: movementNote,
  };

  const updatedInvItem = {
    ...invItem,
    stock: newStock,
    monthlyUse:
      action === "DEDUCT"
        ? invItem.monthlyUse + Math.ceil(stockDelta)
        : Math.max(0, invItem.monthlyUse - Math.ceil(stockDelta)),
    movements: [newMovement, ...invItem.movements],
  };

  inventory[invIndex] = updatedInvItem;

  // Sync colors
  const updatedColors = syncColorsWithInventory(colors, inventory);

  saveInventoryAndColors(tenantName, inventory, updatedColors);

  return {
    success: true,
    newStock,
    message:
      action === "DEDUCT"
        ? `Đã trừ ${usageAmount}ml (${stockDelta} ${invItem.unit}) của sơn ${color.name} khỏi kho. Tồn mới: ${newStock} ${invItem.unit}.`
        : `Đã hoàn lại ${usageAmount}ml (${stockDelta} ${invItem.unit}) của sơn ${color.name} vào kho. Tồn mới: ${newStock} ${invItem.unit}.`,
  };
}
