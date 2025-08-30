const API_BASE_URL = 'https://pagesense.onrender.com';

export interface OutlineItem {
  level: string;
  text: string;
  page: number;
}

export interface ExtractResponse {
  title: string;
  outline: OutlineItem[];
}

export class APIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'APIError';
  }
}

export const api = {
  async extractOutline(file: File): Promise<ExtractResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/extract`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new APIError(response.status, errorData.detail || 'Failed to extract outline');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new APIError(0, 'Unable to connect to the server. Make sure the backend is running on port 8000.');
      }
      
      throw new APIError(500, error instanceof Error ? error.message : 'Unknown error occurred');
    }
  },

  async healthCheck(): Promise<{ status: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) {
        throw new APIError(response.status, 'Health check failed');
      }
      return await response.json();
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(0, 'Unable to connect to server');
    }
  }
};