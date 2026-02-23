/**
 * SillyChat Protocol Module
 *
 * Protocol communication module for SillyChat
 * Supports JSON and Protocol Buffers serialization
 */

// Types
export * from "./types";

// Constants (excluding ErrorCode which is also in types.ts)
export {
  PROTOCOL_VERSION,
  MAX_MESSAGE_SIZE,
  MAX_TEXT_LENGTH,
  MAX_FILE_SIZE,
  FILE_CHUNK_SIZE,
  MAX_HISTORY_MESSAGES,
  DEFAULT_COMMAND_TIMEOUT,
  MAX_COMMAND_TIMEOUT,
  CONNECTION_TIMEOUT,
  HEARTBEAT_INTERVAL,
  HEARTBEAT_TIMEOUT,
  MAX_RETRY_COUNT,
  RETRY_INTERVALS,
  ID_MIN_LENGTH,
  ID_MAX_LENGTH,
  USER_ID_PATTERN,
  CHANNEL_ID_PATTERN,
  DEVICE_ID_PATTERN,
  DEFAULT_SERIALIZATION_FORMAT,
  PROTOBUF_WIRE_TYPES,
  CONTENT_TYPE_MIME_MAP,
} from "./constants";

// Message factories
export * from "./messages";

// Serialization
export * from "./serialization";

// Validation
export * from "./validation";
