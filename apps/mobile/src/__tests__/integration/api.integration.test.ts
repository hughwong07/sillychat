/**
 * API Service Integration Tests
 * SillyChat Mobile - Tests for ApiService with mocked responses
 */

import { ApiService } from '../../services/api';
import type { ApiResponse } from '../../types';

// Mock fetch globally
global.fetch = jest.fn();

describe('API Service Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ApiService.setAuthToken(null);
    ApiService.configure({
      baseURL: 'http://localhost:8080/api/v1',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  });

  describe('Configuration', () => {
    it('should configure API service', () => {
      ApiService.configure({
        baseURL: 'http://custom-api.example.com',
        timeout: 5000,
      });

      // Configuration is internal, test through behavior
      expect(ApiService.getAuthToken()).toBeNull();
    });

    it('should set and get auth token', () => {
      const token = 'test-jwt-token';
      ApiService.setAuthToken(token);

      expect(ApiService.getAuthToken()).toBe(token);
    });

    it('should clear auth token', () => {
      ApiService.setAuthToken('token');
      ApiService.setAuthToken(null);

      expect(ApiService.getAuthToken()).toBeNull();
    });
  });

  describe('HTTP Methods', () => {
    it('should make GET request', async () => {
      const mockResponse = {
        success: true,
        data: { id: '1', name: 'Test' },
        code: 200,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValueOnce(mockResponse.data),
      });

      const result = await ApiService.get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Accept: 'application/json',
          }),
        })
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data);
    });

    it('should make GET request with query parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValueOnce([]),
      });

      await ApiService.get('/conversations', { page: 1, limit: 20, active: true });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('page=1'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=20'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('active=true'),
        expect.any(Object)
      );
    });

    it('should make POST request', async () => {
      const requestBody = { name: 'Test', value: 123 };
      const mockResponse = { id: '1', ...requestBody };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const result = await ApiService.post('/test', requestBody);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );

      expect(result.success).toBe(true);
    });

    it('should make PUT request', async () => {
      const requestBody = { name: 'Updated' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValueOnce({}),
      });

      await ApiService.put('/test/1', requestBody);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/test/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(requestBody),
        })
      );
    });

    it('should make PATCH request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValueOnce({}),
      });

      await ApiService.patch('/test/1', { name: 'Patched' });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });

    it('should make DELETE request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Map(),
        text: jest.fn().mockResolvedValueOnce(''),
      });

      await ApiService.delete('/test/1');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/v1/test/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('Authentication', () => {
    it('should include auth token in headers when set', async () => {
      ApiService.setAuthToken('my-auth-token');

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValueOnce({}),
      });

      await ApiService.get('/protected');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-auth-token',
          }),
        })
      );
    });

    it('should not include auth header when token is not set', async () => {
      ApiService.setAuthToken(null);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValueOnce({}),
      });

      await ApiService.get('/public');

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const headers = callArgs[1].headers;
      expect(headers).not.toHaveProperty('Authorization');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValueOnce({ message: 'Resource not found' }),
      });

      const result = await ApiService.get('/non-existent');

      expect(result.success).toBe(false);
      expect(result.code).toBe(404);
      expect(result.error).toContain('Resource not found');
    });

    it('should handle 500 errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValueOnce({ message: 'Server error' }),
      });

      const result = await ApiService.get('/error');

      expect(result.success).toBe(false);
      expect(result.code).toBe(500);
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network request failed')
      );

      const result = await ApiService.get('/test');

      expect(result.success).toBe(false);
      expect(result.code).toBe(0);
      expect(result.error).toContain('网络连接失败');
    });

    it('should handle timeout errors', async () => {
      const abortError = new Error('AbortError');
      (abortError as any).name = 'AbortError';
      (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

      const result = await ApiService.get('/slow-endpoint');

      expect(result.success).toBe(false);
      expect(result.code).toBe(408);
      expect(result.error).toContain('超时');
    });

    it('should handle JSON parse errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'text/plain']]),
        text: jest.fn().mockResolvedValueOnce('not valid json'),
      });

      const result = await ApiService.get('/text-response');

      expect(result.success).toBe(true);
      expect(result.data).toBe('not valid json');
    });
  });

  describe('Business API Methods', () => {
    it('should login user', async () => {
      const mockUser = { id: '1', username: 'testuser' };
      const mockToken = 'jwt-token';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: { token: mockToken, user: mockUser },
        }),
      });

      const result = await ApiService.login({
        username: 'testuser',
        password: 'password123',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            username: 'testuser',
            password: 'password123',
          }),
        })
      );

      expect(result.success).toBe(true);
      expect(result.data?.token).toBe(mockToken);
      expect(result.data?.user).toEqual(mockUser);
    });

    it('should register user', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: { token: 'jwt', user: { id: '1' } },
        }),
      });

      const result = await ApiService.register({
        username: 'newuser',
        password: 'password123',
        email: 'new@example.com',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/register'),
        expect.objectContaining({
          method: 'POST',
        })
      );

      expect(result.success).toBe(true);
    });

    it('should get conversations', async () => {
      const mockConversations = [
        { id: '1', title: 'Chat 1' },
        { id: '2', title: 'Chat 2' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: mockConversations,
        }),
      });

      const result = await ApiService.getConversations(1, 20);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/conversations'),
        expect.any(Object)
      );

      expect(result.success).toBe(true);
    });

    it('should get messages for a conversation', async () => {
      const mockMessages = [
        { id: '1', content: 'Hello' },
        { id: '2', content: 'Hi' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: mockMessages,
        }),
      });

      const result = await ApiService.getMessages('conv-123', 1, 50);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/conversations/conv-123/messages'),
        expect.any(Object)
      );

      expect(result.success).toBe(true);
    });

    it('should send message', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: { id: 'msg-1', content: 'Test message' },
        }),
      });

      const result = await ApiService.sendMessage('conv-123', 'Test message');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/conversations/conv-123/messages'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'Test message' }),
        })
      );

      expect(result.success).toBe(true);
    });

    it('should get agents', async () => {
      const mockAgents = [
        { id: '1', name: 'Assistant' },
        { id: '2', name: 'Expert' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: mockAgents,
        }),
      });

      const result = await ApiService.getAgents();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/agents'),
        expect.any(Object)
      );

      expect(result.success).toBe(true);
    });

    it('should get agent detail', async () => {
      const mockAgent = { id: '1', name: 'Assistant', capabilities: [] };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: mockAgent,
        }),
      });

      const result = await ApiService.getAgentDetail('agent-1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/agents/agent-1'),
        expect.any(Object)
      );

      expect(result.success).toBe(true);
    });

    it('should upload file', async () => {
      const mockFormData = new FormData();
      mockFormData.append('file', {
        uri: 'file://test.jpg',
        name: 'test.jpg',
        type: 'image/jpeg',
      } as any);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        headers: new Map([['content-type', 'application/json']]),
        json: jest.fn().mockResolvedValueOnce({
          success: true,
          data: { fileId: 'file-1', url: 'http://example.com/file.jpg' },
        }),
      });

      const result = await ApiService.uploadFile({
        uri: 'file://test.jpg',
        name: 'test.jpg',
        type: 'image/jpeg',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/upload'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed requests', async () => {
      // First call fails, second succeeds
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Map([['content-type', 'application/json']]),
          json: jest.fn().mockResolvedValueOnce({ success: true }),
        });

      // Mock setTimeout to execute immediately
      jest.useFakeTimers();

      const resultPromise = ApiService.get('/test', undefined, { retries: 1 });

      // Fast-forward past the retry delay
      jest.advanceTimersByTime(1100);

      const result = await resultPromise;

      expect(global.fetch).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });
});
