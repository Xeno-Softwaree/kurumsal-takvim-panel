import { http } from './http';

export type InventoryVariantDto = {
  id: number;
  item_id?: number;
  variant_label: string | null;
  quantity: number;
};

export type InventoryItemDto = {
  id: number;
  name: string;
  category: string | null;
  has_variant: boolean;
  created_at: string;
  variants: InventoryVariantDto[];
};

export type AssignmentDto = {
  id: number;
  quantity: number;
  status: 'assigned' | 'returned';
  assigned_at: string;
  returned_at: string | null;
  notes: string | null;
  staff_id: number;
  first_name: string;
  last_name: string;
  assigned_by_email?: string;
};

export async function getInventoryItems(): Promise<InventoryItemDto[]> {
  const res = await http.get<InventoryItemDto[]>('/inventory/items');
  return res.data;
}

export async function createInventoryItem(data: {
  name: string;
  category?: string;
  has_variant: boolean;
  variants?: { label: string | null; quantity: number }[];
}): Promise<InventoryItemDto> {
  const res = await http.post<InventoryItemDto>('/inventory/items', data);
  return res.data;
}

export async function updateInventoryItem(id: number, data: { name: string; category?: string }): Promise<InventoryItemDto> {
  const res = await http.put<InventoryItemDto>(`/inventory/items/${id}`, data);
  return res.data;
}

export async function deleteInventoryItem(id: number): Promise<void> {
  await http.delete(`/inventory/items/${id}`);
}

export async function addVariant(itemId: number, data: { label: string | null; quantity: number }): Promise<InventoryVariantDto> {
  const res = await http.post<InventoryVariantDto>(`/inventory/items/${itemId}/variants`, data);
  return res.data;
}

export async function adjustVariant(variantId: number, data: { delta: number; reason: string }): Promise<{ quantity: number }> {
  const res = await http.post<{ quantity: number }>(`/inventory/variants/${variantId}/adjust`, data);
  return res.data;
}

export async function getVariantAssignments(variantId: number): Promise<AssignmentDto[]> {
  const res = await http.get<AssignmentDto[]>(`/inventory/variants/${variantId}/assignments`);
  return res.data;
}

export async function createAssignment(data: {
  variant_id: number;
  staff_id: number;
  quantity: number;
  notes?: string;
}): Promise<AssignmentDto> {
  const res = await http.post<AssignmentDto>('/inventory/assignments', data);
  return res.data;
}

export async function returnAssignment(assignmentId: number): Promise<AssignmentDto> {
  const res = await http.put<AssignmentDto>(`/inventory/assignments/${assignmentId}/return`, {});
  return res.data;
}
