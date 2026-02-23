import { describe, it, expect, beforeEach } from "vitest";
import {
  RoleType,
  PermissionLevel,
  AgentStatus,
  ConversationStatus,
  OperationType,
  AgentError,
  AgentErrorCode
} from "./types";
import { PermissionChecker, PermissionManager } from "./permissions";
import { IdentityManager } from "./identity";
import { ToolRegistry, ToolExecutor, FileReadTool, WebSearchTool } from "./tools";
import { ConversationManager } from "./conversation";
import { Agent } from "./agent";
import { AgentManager, getAgentManager, resetAgentManager } from "./manager";

describe("Role Types", () => {
  it("should have correct role type values", () => {
    expect(RoleType.HUMAN).toBe("human");
    expect(RoleType.AI_AVATAR).toBe("ai_avatar");
    expect(RoleType.AI_GUEST).toBe("ai_guest");
  });
});

describe("Permission Levels", () => {
  it("should have correct permission level values", () => {
    expect(PermissionLevel.MASTER).toBe(100);
    expect(PermissionLevel.ADMIN).toBe(80);
    expect(PermissionLevel.AI_COLLABORATE).toBe(60);
    expect(PermissionLevel.AI_READONLY).toBe(40);
    expect(PermissionLevel.VISITOR).toBe(20);
  });
});

describe("PermissionChecker", () => {
  let checker: PermissionChecker;

  beforeEach(() => {
    checker = new PermissionChecker();
  });

  it("should allow master to perform any operation", async () => {
    const master = {
      id: "user1",
      type: RoleType.HUMAN,
      ownerId: "user1",
      name: "Master",
      avatar: "",
      permissionLevel: PermissionLevel.MASTER,
      createdAt: new Date(),
      updatedAt: new Date(),
      isMaster: true,
      email: "master@test.com",
      aiAvatars: []
    };

    const result = await checker.checkPermission(master, OperationType.CREATE_AI);
    expect(result.allowed).toBe(true);
  });
});

describe("IdentityManager", () => {
  let manager: IdentityManager;

  beforeEach(() => {
    manager = new IdentityManager();
  });

  it("should format AI name correctly", () => {
    const result = manager.formatAIName("Assistant", RoleType.AI_AVATAR);
    expect(result.fullName).toBe("Assistant[AI]");
    expect(result.suffix).toBe("[AI]");
  });

  it("should create valid identity", () => {
    const identity = manager.createIdentity("agent1", "Test Agent", "assistant");
    expect(identity.id).toBe("agent1");
    expect(identity.name).toBe("Test Agent");
    expect(identity.role).toBe("assistant");
  });
});

describe("ToolRegistry", () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it("should register and retrieve tools", () => {
    const tool = new FileReadTool();
    registry.register(tool);
    expect(registry.has("file_read")).toBe(true);
  });
});

describe("ConversationManager", () => {
  let manager: ConversationManager;

  beforeEach(() => {
    manager = new ConversationManager();
  });

  it("should create conversation", async () => {
    const conversation = await manager.createConversation({
      agentId: "agent1",
      title: "Test Conversation",
      ownerId: "user1"
    });

    expect(conversation).toBeDefined();
    expect(conversation.agentId).toBe("agent1");
  });
});

