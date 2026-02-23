/**
 * Embedding Service
 * 小傻瓜聊天工具 - 嵌入向量生成服务
 */

import {
  IEmbeddingService,
  EmbeddingConfig,
  DEFAULT_EMBEDDING_CONFIG,
  EmbeddingError,
  VECTOR_DIMENSION
} from './types';

export class EmbeddingService implements IEmbeddingService {
  private config: EmbeddingConfig;
  private cache: Map<string, Float32Array> = new Map();

  constructor(config: Partial<EmbeddingConfig> = {}) {
    this.config = { ...DEFAULT_EMBEDDING_CONFIG, ...config };
  }

  async initialize(): Promise<void> {
    if (this.config.provider === 'openai' && !this.config.apiKey) {
      throw new EmbeddingError('OpenAI API key is required');
    }
    
    if (this.config.provider === 'ollama' && !this.config.ollamaUrl) {
      this.config.ollamaUrl = 'http://localhost:11434';
    }
  }

  async generate(text: string): Promise<Float32Array> {
    if (this.config.enableCache) {
      const cached = this.cache.get(text);
      if (cached) return cached;
    }

    let embedding: Float32Array;

    switch (this.config.provider) {
      case 'openai':
        embedding = await this.generateOpenAI(text);
        break;
      case 'ollama':
        embedding = await this.generateOllama(text);
        break;
      case 'local':
        embedding = await this.generateLocal(text);
        break;
      default:
        throw new EmbeddingError('Unknown provider: ' + this.config.provider);
    }

    if (this.config.enableCache) {
      this.cache.set(text, embedding);
    }

    return embedding;
  }

  async generateBatch(texts: string[]): Promise<Float32Array[]> {
    const results: Float32Array[] = [];
    
    const batchSize = this.config.batchSize || 100;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(text => this.generate(text))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  similarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) {
      throw new EmbeddingError('Embedding dimensions do not match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async similarityWithText(embedding: Float32Array, text: string): Promise<number> {
    const textEmbedding = await this.generate(text);
    return this.similarity(embedding, textEmbedding);
  }

  getConfig(): EmbeddingConfig {
    return { ...this.config };
  }

  private async generateOpenAI(text: string): Promise<Float32Array> {
    const url = this.config.baseUrl || 'https://api.openai.com/v1/embeddings';
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + this.config.apiKey
        },
        body: JSON.stringify({
          input: text,
          model: this.config.model,
          encoding_format: 'float'
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new EmbeddingError('OpenAI API error: ' + error);
      }

      const data = await response.json() as { data: Array<{ embedding: number[] }> };
      return new Float32Array(data.data[0].embedding);
    } catch (error) {
      throw new EmbeddingError(
        'Failed to generate embedding with OpenAI',
        error instanceof Error ? error : undefined
      );
    }
  }

  private async generateOllama(text: string): Promise<Float32Array> {
    const url = this.config.ollamaUrl + '/api/embeddings';
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model,
          prompt: text
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new EmbeddingError('Ollama API error: ' + error);
      }

      const data = await response.json() as { embedding: number[] };
      return new Float32Array(data.embedding);
    } catch (error) {
      throw new EmbeddingError(
        'Failed to generate embedding with Ollama',
        error instanceof Error ? error : undefined
      );
    }
  }

  private async generateLocal(text: string): Promise<Float32Array> {
    const embedding = new Float32Array(this.config.dimension);
    let hash = 0;
    
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash = hash & hash;
    }

    let seed = Math.abs(hash);
    for (let i = 0; i < this.config.dimension; i++) {
      seed = (seed * 9301 + 49297) % 233280;
      embedding[i] = (seed / 233280) * 2 - 1;
    }

    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= norm;
      }
    }

    return embedding;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0
    };
  }
}
