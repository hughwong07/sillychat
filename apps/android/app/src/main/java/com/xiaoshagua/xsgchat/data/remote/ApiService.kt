package com.xiaoshagua.xsgchat.data.remote

import com.xiaoshagua.xsgchat.data.model.Agent
import com.xiaoshagua.xsgchat.data.model.Message
import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.plugins.logging.*
import io.ktor.client.plugins.websocket.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.websocket.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import javax.inject.Inject
import javax.inject.Singleton

/**
 * API服务接口
 */
interface ApiService {

    /**
     * 发送消息并获取回复
     */
    suspend fun sendMessage(request: SendMessageRequest): Result<SendMessageResponse>

    /**
     * 获取消息历史
     */
    suspend fun getMessageHistory(
        conversationId: String,
        before: Long? = null,
        limit: Int = 20
    ): Result<List<Message>>

    /**
     * 同步消息
     */
    suspend fun syncMessages(messages: List<Message>): Result<SyncResponse>

    /**
     * 获取代理列表
     */
    suspend fun getAgents(): Result<List<Agent>>

    /**
     * 获取代理详情
     */
    suspend fun getAgent(agentId: String): Result<Agent>

    /**
     * 流式发送消息
     */
    fun sendMessageStream(request: SendMessageRequest): Flow<StreamChunk>

    /**
     * 检查服务器状态
     */
    suspend fun checkHealth(): Result<HealthResponse>
}

/**
 * API服务实现
 */
@Singleton
class ApiServiceImpl @Inject constructor() : ApiService {

    /**
     * HTTP客户端
     */
    private val client = HttpClient(CIO) {
        install(ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
                isLenient = true
                encodeDefaults = true
            })
        }
        install(Logging) {
            level = LogLevel.BODY
        }
        install(WebSockets)
        install(HttpTimeout) {
            requestTimeoutMillis = 30000
            connectTimeoutMillis = 10000
        }
        defaultRequest {
            contentType(ContentType.Application.Json)
            header("X-Client-Version", "1.0.0")
            header("X-Platform", "android")
        }
    }

    /**
     * 基础URL（应该从配置中读取）
     */
    private val baseUrl = "https://api.xiaoshagua.com/v1"

    override suspend fun sendMessage(request: SendMessageRequest): Result<SendMessageResponse> {
        return try {
            val response = client.post("$baseUrl/chat/send") {
                setBody(request)
            }.body<SendMessageResponse>()
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getMessageHistory(
        conversationId: String,
        before: Long?,
        limit: Int
    ): Result<List<Message>> {
        return try {
            val response = client.get("$baseUrl/chat/history") {
                parameter("conversationId", conversationId)
                before?.let { parameter("before", it) }
                parameter("limit", limit)
            }.body<MessageHistoryResponse>()
            Result.success(response.messages)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun syncMessages(messages: List<Message>): Result<SyncResponse> {
        return try {
            val response = client.post("$baseUrl/chat/sync") {
                setBody(SyncRequest(messages))
            }.body<SyncResponse>()
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getAgents(): Result<List<Agent>> {
        return try {
            val response = client.get("$baseUrl/agents")
                .body<AgentListResponse>()
            Result.success(response.agents)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getAgent(agentId: String): Result<Agent> {
        return try {
            val response = client.get("$baseUrl/agents/$agentId")
                .body<AgentResponse>()
            Result.success(response.agent)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override fun sendMessageStream(request: SendMessageRequest): Flow<StreamChunk> = flow {
        try {
            client.webSocket(
                method = HttpMethod.Get,
                host = "api.xiaoshagua.com",
                path = "/v1/chat/stream"
            ) {
                send(Frame.Text(Json.encodeToString(SendMessageRequest.serializer(), request)))

                for (frame in incoming) {
                    when (frame) {
                        is Frame.Text -> {
                            val text = frame.readText()
                            val chunk = Json.decodeFromString(StreamChunk.serializer(), text)
                            emit(chunk)

                            if (chunk.isDone) break
                        }
                        else -> {}
                    }
                }
            }
        } catch (e: Exception) {
            emit(StreamChunk(error = e.message))
        }
    }

    override suspend fun checkHealth(): Result<HealthResponse> {
        return try {
            val response = client.get("$baseUrl/health")
                .body<HealthResponse>()
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}

/**
 * 发送消息请求
 */
@Serializable
data class SendMessageRequest(
    val content: String,
    val conversationId: String,
    val agentId: String? = null,
    val parentMessageId: String? = null,
    val attachments: List<AttachmentInfo>? = null
)

/**
 * 附件信息
 */
@Serializable
data class AttachmentInfo(
    val fileName: String,
    val fileType: String,
    val fileSize: Long,
    val url: String? = null
)

/**
 * 发送消息响应
 */
@Serializable
data class SendMessageResponse(
    val messageId: String,
    val content: String,
    val role: String,
    val timestamp: Long,
    val agentId: String? = null,
    val usage: TokenUsage? = null
)

/**
 * Token使用量
 */
@Serializable
data class TokenUsage(
    val promptTokens: Int,
    val completionTokens: Int,
    val totalTokens: Int
)

/**
 * 消息历史响应
 */
@Serializable
data class MessageHistoryResponse(
    val messages: List<Message>,
    val hasMore: Boolean,
    val total: Int
)

/**
 * 同步请求
 */
@Serializable
data class SyncRequest(
    val messages: List<Message>
)

/**
 * 同步响应
 */
@Serializable
data class SyncResponse(
    val syncedIds: List<String>,
    val failedIds: List<String>,
    val serverMessages: List<Message>
)

/**
 * 代理列表响应
 */
@Serializable
data class AgentListResponse(
    val agents: List<Agent>
)

/**
 * 代理响应
 */
@Serializable
data class AgentResponse(
    val agent: Agent
)

/**
 * 流式响应块
 */
@Serializable
data class StreamChunk(
    val content: String = "",
    val isDone: Boolean = false,
    val error: String? = null,
    val usage: TokenUsage? = null
)

/**
 * 健康检查响应
 */
@Serializable
data class HealthResponse(
    val status: String,
    val version: String,
    val timestamp: Long
)

/**
 * API错误
 */
sealed class ApiError : Exception() {
    data class NetworkError(override val message: String) : ApiError()
    data class ServerError(val code: Int, override val message: String) : ApiError()
    data class ClientError(val code: Int, override val message: String) : ApiError()
    data class UnknownError(override val message: String) : ApiError()
}
