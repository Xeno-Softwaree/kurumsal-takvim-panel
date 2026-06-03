import { http } from './http';

export interface Document {
  id: number;
  original_name: string;
  file_url: string | null;
  mime_type: string;
  file_size: number;
  category: string;
  created_at: string;
  admin_email: string | null;
}

export const DOCUMENT_CATEGORIES = ['Genel', 'Tatbikat', 'Rapor', 'Prosedür', 'Diğer'] as const;
export type DocumentCategory = typeof DOCUMENT_CATEGORIES[number];

export async function getDocuments(params?: { search?: string; category?: string }): Promise<Document[]> {
  const res = await http.get('/documents', { params });
  return res.data;
}

export async function uploadDocument(file: File, category: string = 'Genel'): Promise<Document> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  const res = await http.post('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.document;
}

export async function updateDocumentCategory(id: number, category: string): Promise<void> {
  await http.patch(`/documents/${id}/category`, { category });
}

export async function deleteDocument(id: number): Promise<void> {
  await http.delete(`/documents/${id}`);
}
