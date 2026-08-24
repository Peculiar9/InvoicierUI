import apiClient from './client';
import type { ApiResponse } from '@/types';

interface UploadResult {
  file_url: string;
  file_name: string;
  file_type: string;
  upload_purpose: string;
}

export const filesApi = {
  /**
   * Send a file to object storage and get back its hosted URL. The backend
   * validates type and size and stores it under the caller's account. Throws
   * if storage is not configured or the file is rejected — callers that have a
   * usable inline preview (onboarding) should catch and fall back to it.
   */
  uploadImage: async (file: File, purpose = 'business_logo'): Promise<string> => {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_purpose', purpose);
    form.append('file_category', 'image');
    const r = await apiClient.post<ApiResponse<UploadResult>>('/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return r.data.data.file_url;
  },
};
