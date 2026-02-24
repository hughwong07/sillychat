/**
 * SillyChat Protocol - Serialization Module
 * 
 * Supports JSON and Protocol Buffers serialization formats
 */

import {
  XSGMessage,
  ChatMessage,
  AgentCommand,
  SystemEvent,
  FileTransfer,
  FileChunk,
  Sender,
  Target,
  Content,
  AuthContext,
  SerializationFormat,
  SerializationResult,
  DeserializationResult,
  MessageType,
  ContentType,
  SenderRole,
  ChannelType,
  AgentCommandType,
  SystemEventType,
  FileTransferStatus,
  PermissionLevel,
} from "./types";
import { PROTOCOL_VERSION, ErrorCode } from "./constants";

// ============================================================================
// JSON Serialization
// ============================================================================

/**
 * Serialize a message to JSON string
 */
export function serializeToJSON(message: XSGMessage): string {
  return JSON.stringify(message);
}

/**
 * Deserialize a JSON string to message
 */
export function deserializeFromJSON(json: string): DeserializationResult<XSGMessage> {
  try {
    const parsed = JSON.parse(json);
    return {
      success: true,
      data: parsed as XSGMessage,
    };
  } catch (error) {
    return {
      success: false,
      data: undefined,
      error: error instanceof Error ? error.message : "Invalid JSON format",
      errorCode: ErrorCode.DESERIALIZATION_FAILED,
    };
  }
}

/**
 * Calculate SHA-256 checksum of data
 */
async function calculateChecksum(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Serialize message with result wrapper
 */
export function serializeJSON(message: XSGMessage): SerializationResult {
  try {
    const data = serializeToJSON(message);
    // Note: checksum is calculated asynchronously but we return synchronously
    // The checksum field will be populated by the caller if needed
    return {
      success: true,
      data,
      format: SerializationFormat.JSON,
      byteLength: new TextEncoder().encode(data).length,
      checksum: "", // Placeholder - will be set by async wrapper if needed
    };
  } catch (error) {
    return {
      success: false,
      format: SerializationFormat.JSON,
      data: "",
      error: error instanceof Error ? error.message : "JSON serialization failed",
      errorCode: ErrorCode.SERIALIZATION_FAILED,
    };
  }
}

// ============================================================================
// Protocol Buffers Style Serialization (Binary format simulation)
// ============================================================================

/**
 * Convert message to binary format (simulated Protobuf)
 * In production, use actual protobufjs library
 */
export function serializeToProtobuf(message: XSGMessage): Uint8Array {
  // Simulate protobuf encoding with a simple binary format
  const jsonString = JSON.stringify(message);
  const encoder = new TextEncoder();
  const jsonBytes = encoder.encode(jsonString);
  
  // Add header: [magic(4)][version(1)][type(1)][length(4)][data(n)]
  const header = new Uint8Array(10);
  const view = new DataView(header.buffer);
  
  // Magic bytes: XSG\0
  header[0] = 0x58; // X
  header[1] = 0x53; // S
  header[2] = 0x47; // G
  header[3] = 0x00; // \0
  
  // Version
  header[4] = 0x01;
  
  // Message type
  header[5] = messageTypeToByte(message.type);
  
  // Data length (4 bytes, big-endian)
  view.setUint32(6, jsonBytes.length, false);
  
  // Combine header and data
  const result = new Uint8Array(header.length + jsonBytes.length);
  result.set(header, 0);
  result.set(jsonBytes, header.length);
  
  return result;
}

/**
 * Deserialize from protobuf binary format
 */
export function deserializeFromProtobuf(buffer: Uint8Array): DeserializationResult<XSGMessage> {
  try {
    // Validate minimum header size
    if (buffer.length < 10) {
      return {
        success: false,
        data: undefined,
        error: "Buffer too small for protobuf header",
        errorCode: ErrorCode.DESERIALIZATION_FAILED,
      };
    }

    // Check magic bytes
    if (buffer[0] !== 0x58 || buffer[1] !== 0x53 || buffer[2] !== 0x47) {
      return {
        success: false,
        data: undefined,
        error: "Invalid protobuf magic bytes",
        errorCode: ErrorCode.DESERIALIZATION_FAILED,
      };
    }

    // Read data length
    const view = new DataView(buffer.buffer, buffer.byteOffset);
    const dataLength = view.getUint32(6, false);

    if (buffer.length < 10 + dataLength) {
      return {
        success: false,
        data: undefined,
        error: "Buffer too small for declared data length",
        errorCode: ErrorCode.DESERIALIZATION_FAILED,
      };
    }
    
    // Extract and parse JSON data
    const jsonBytes = buffer.slice(10, 10 + dataLength);
    const decoder = new TextDecoder();
    const jsonString = decoder.decode(jsonBytes);
    const parsed = JSON.parse(jsonString);
    
    return {
      success: true,
      data: parsed as XSGMessage,
    };
  } catch (error) {
    return {
      success: false,
      data: undefined,
      error: error instanceof Error ? error.message : "Protobuf deserialization failed",
      errorCode: ErrorCode.DESERIALIZATION_FAILED,
    };
  }
}

/**
 * Convert message type to byte for protobuf header
 */
function messageTypeToByte(type: MessageType): number {
  const typeMap: Record<MessageType, number> = {
    [MessageType.CHAT]: 0x01,
    [MessageType.COMMAND]: 0x02,
    [MessageType.EVENT]: 0x03,
    [MessageType.SYSTEM]: 0x04,
    [MessageType.FILE]: 0x05,
  };
  return typeMap[type] || 0x00;
}

/**
 * Convert byte to message type
 */
function byteToMessageType(byte: number): MessageType {
  const typeMap: Record<number, MessageType> = {
    0x01: MessageType.CHAT,
    0x02: MessageType.COMMAND,
    0x03: MessageType.EVENT,
    0x04: MessageType.SYSTEM,
    0x05: MessageType.FILE,
  };
  return typeMap[byte] || MessageType.SYSTEM;
}

// ============================================================================
// Generic Serialization Interface
// ============================================================================

/**
 * Serialize message in specified format
 */
export function serialize(
  message: XSGMessage,
  options?: SerializationFormat | { format?: SerializationFormat }
): SerializationResult {
  const format = typeof options === "object" ? options?.format : options;
  const resolvedFormat = format ?? SerializationFormat.JSON;
  switch (resolvedFormat) {
    case SerializationFormat.JSON:
      return serializeJSON(message);
    case SerializationFormat.PROTOBUF:
      return serializeProtobuf(message);
    default:
      return {
        success: false,
        format: SerializationFormat.JSON,
        data: "",
        error: `Unsupported serialization format: ${resolvedFormat}`,
        errorCode: ErrorCode.UNSUPPORTED_FORMAT,
      };
  }
}

/**
 * Serialize to protobuf with result wrapper
 */
export function serializeProtobuf(message: XSGMessage): SerializationResult {
  try {
    const data = serializeToProtobuf(message);
    return {
      success: true,
      data,
      format: SerializationFormat.PROTOBUF,
      byteLength: data.length,
    };
  } catch (error) {
    return {
      success: false,
      format: SerializationFormat.PROTOBUF,
      data: new Uint8Array(),
      error: error instanceof Error ? error.message : "Protobuf serialization failed",
      errorCode: ErrorCode.SERIALIZATION_FAILED,
    };
  }
}

/**
 * Deserialize from specified format (auto-detect if not specified)
 */
export function deserialize(
  data: string | Uint8Array,
  format?: SerializationFormat
): DeserializationResult<XSGMessage> {
  // Auto-detect format if not specified
  if (!format) {
    format = detectFormat(data);
  }
  
  switch (format) {
    case SerializationFormat.JSON:
      if (typeof data !== "string") {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_INVALID_FORMAT,
            message: "Expected string data for JSON deserialization",
          },
        };
      }
      return deserializeFromJSON(data);
    case SerializationFormat.PROTOBUF:
      if (!(data instanceof Uint8Array)) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_INVALID_FORMAT,
            message: "Expected Uint8Array data for Protobuf deserialization",
          },
        };
      }
      return deserializeFromProtobuf(data);
    default:
      return {
        success: false,
        format: format || SerializationFormat.JSON,
        data: undefined,
        error: `Unsupported deserialization format: ${format}`,
        errorCode: ErrorCode.UNSUPPORTED_FORMAT,
      };
  }
}

/**
 * Auto-detect serialization format from data
 */
export function detectFormat(data: string | Uint8Array): SerializationFormat {
  if (typeof data === "string") {
    return SerializationFormat.JSON;
  }
  
  if (data instanceof Uint8Array && data.length >= 4) {
    // Check for protobuf magic bytes
    if (data[0] === 0x58 && data[1] === 0x53 && data[2] === 0x47) {
      return SerializationFormat.PROTOBUF;
    }
  }
  
  return SerializationFormat.JSON;
}

// ============================================================================
// Batch Serialization
// ============================================================================

export interface BatchSerializationResult {
  success: boolean;
  data?: string | Uint8Array;
  format: SerializationFormat;
  byteLength: number;
  errors?: Array<{ index: number; error: string }>;
}

/**
 * Serialize multiple messages
 */
export function serializeBatch(
  messages: XSGMessage[],
  format: SerializationFormat = SerializationFormat.JSON
): BatchSerializationResult {
  const errors: Array<{ index: number; error: string }> = [];
  
  if (format === SerializationFormat.JSON) {
    try {
      const data = JSON.stringify(messages);
      return {
        success: true,
        data,
        format,
        byteLength: new TextEncoder().encode(data).length,
      };
    } catch (error) {
      return {
        success: false,
        format,
        byteLength: 0,
        errors: [{ index: 0, error: error instanceof Error ? error.message : "Batch serialization failed" }],
      };
    }
  }
  
  // Protobuf batch: length-prefixed messages
  const chunks: Uint8Array[] = [];
  let totalLength = 0;
  
  for (let i = 0; i < messages.length; i++) {
    const result = serialize(messages[i], format);
    if (!result.success || !(result.data instanceof Uint8Array)) {
      errors.push({ index: i, error: typeof result.error === 'string' ? result.error : result.error?.message || "Serialization failed" });
      continue;
    }
    
    // Add length prefix (4 bytes)
    const lengthPrefix = new Uint8Array(4);
    new DataView(lengthPrefix.buffer).setUint32(0, result.data.length, false);
    chunks.push(lengthPrefix);
    chunks.push(result.data);
    totalLength += 4 + result.data.length;
  }
  
  if (errors.length > 0 && chunks.length === 0) {
    return {
      success: false,
      format,
      byteLength: 0,
      errors,
    };
  }
  
  // Combine all chunks
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return {
    success: errors.length === 0,
    data: result,
    format,
    byteLength: totalLength,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Deserialize batch of messages
 */
export function deserializeBatch(
  data: string | Uint8Array,
  format?: SerializationFormat
): DeserializationResult<XSGMessage[]> {
  if (!format) {
    format = detectFormat(data);
  }
  
  if (format === SerializationFormat.JSON && typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_INVALID_FORMAT,
            message: "Expected array of messages",
          },
        };
      }
      return {
        success: true,
        data: parsed as XSGMessage[],
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.DESERIALIZATION_FAILED,
          message: error instanceof Error ? error.message : "Invalid JSON batch",
        },
      };
    }
  }
  
  // Protobuf batch deserialization
  if (!(data instanceof Uint8Array)) {
    return {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_INVALID_FORMAT,
        message: "Expected Uint8Array for protobuf batch",
      },
    };
  }
  
  const messages: XSGMessage[] = [];
  let offset = 0;
  
  while (offset < data.length) {
    if (offset + 4 > data.length) break;
    
    const messageLength = new DataView(data.buffer, data.byteOffset + offset).getUint32(0, false);
    offset += 4;
    
    if (offset + messageLength > data.length) {
      return {
        success: false,
        error: {
          code: ErrorCode.DESERIALIZATION_FAILED,
          message: `Incomplete message at offset ${offset}`,
        },
      };
    }
    
    const messageData = data.slice(offset, offset + messageLength);
    const result = deserializeFromProtobuf(messageData);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }
    
    messages.push(result.data!);
    offset += messageLength;
  }
  
  return {
    success: true,
    data: messages,
  };
}

// ============================================================================
// Size Estimation
// ============================================================================

/**
 * Estimate serialized message size without actual serialization
 */
export function estimateSize(message: XSGMessage, format: SerializationFormat = SerializationFormat.JSON): number {
  if (format === SerializationFormat.JSON) {
    // Rough estimation based on JSON stringification
    return JSON.stringify(message).length;
  }
  
  // Protobuf is typically more compact
  const jsonSize = JSON.stringify(message).length;
  return Math.floor(jsonSize * 0.7); // Estimate 30% smaller
}

// ============================================================================
// Compression Helpers
// ============================================================================

export interface CompressionResult {
  success: boolean;
  data?: Uint8Array;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  error?: string;
}

/**
 * Compress serialized data (placeholder for actual compression)
 * In production, use pako or similar library
 */
export function compress(data: Uint8Array): CompressionResult {
  // Placeholder: just return the data unchanged
  // In production: return pako.deflate(data);
  return {
    success: true,
    data,
    originalSize: data.length,
    compressedSize: data.length,
    ratio: 1.0,
  };
}

/**
 * Decompress data (placeholder for actual decompression)
 */
export function decompress(data: Uint8Array): CompressionResult {
  // Placeholder: just return the data unchanged
  // In production: return pako.inflate(data);
  return {
    success: true,
    data,
    originalSize: data.length,
    compressedSize: data.length,
    ratio: 1.0,
  };
}

// ============================================================================
// Export Type Guards
// ============================================================================

/**
 * Check if data is a valid message type
 */
export function isValidMessageType(type: unknown): type is MessageType {
  return Object.values(MessageType).includes(type as MessageType);
}

/**
 * Check if data is a valid content type
 */
export function isValidContentType(type: unknown): type is ContentType {
  return Object.values(ContentType).includes(type as ContentType);
}
