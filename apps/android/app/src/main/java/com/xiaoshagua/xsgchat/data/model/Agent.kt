package com.xiaoshagua.xsgchat.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.Index
import kotlinx.serialization.Serializable
import java.util.UUID

/**
 * AI代理数据模型
 */
@Entity(
    tableName = "agents",
    indices = [
        Index(value = ["isActive"]),
        Index(value = ["category"]),
        Index(value = ["sortOrder"])
    ]
)
@Serializable
data class Agent(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),

    /**
     * 代理名称
     */
    val name: String,

    /**
     * 代理角色描述
     */
    val role: String,

    /**
     * 代理描述
     */
    val description: String? = null,

    /**
     * 系统提示词
     */
    val systemPrompt: String? = null,

    /**
     * 头像URL或本地路径
     */
    val avatar: String? = null,

    /**
     * 代理类别
     */
    val category: AgentCategory = AgentCategory.GENERAL,

    /**
     * 使用的AI模型
     */
    val model: String = "default",

    /**
     * 温度参数（创造性程度）
     */
    val temperature: Float = 0.7f,

    /**
     * 最大令牌数
     */
    val maxTokens: Int = 2048,

    /**
     * 是否激活
     */
    val isActive: Boolean = true,

    /**
     * 是否默认代理
     */
    val isDefault: Boolean = false,

    /**
     * 排序顺序
     */
    val sortOrder: Int = 0,

    /**
     * 创建时间
     */
    val createdAt: Long = System.currentTimeMillis(),

    /**
     * 更新时间
     */
    val updatedAt: Long = System.currentTimeMillis(),

    /**
     * 能力列表（JSON字符串）
     */
    val capabilities: String? = null,

    /**
     * 额外配置（JSON字符串）
     */
    val config: String? = null
) {
    /**
     * 获取显示名称
     */
    fun getDisplayName(): String = name.ifBlank { "未命名代理" }

    /**
     * 获取角色描述
     */
    fun getRoleDescription(): String = role.ifBlank { "AI助手" }

    companion object {
        /**
         * 创建默认代理
         */
        fun createDefault(): Agent = Agent(
            id = "default",
            name = "小傻瓜",
            role = "智能助手",
            description = "你的贴心AI助手，可以回答问题、协助创作、提供建议",
            systemPrompt = "你是一个友好、 helpful的AI助手。请用中文回答用户的问题。",
            category = AgentCategory.GENERAL,
            isDefault = true,
            sortOrder = 0
        )

        /**
         * 创建编程助手
         */
        fun createCodeAssistant(): Agent = Agent(
            name = "代码助手",
            role = "编程专家",
            description = "专业的编程助手，擅长代码审查、bug修复和算法设计",
            systemPrompt = "你是一个专业的编程助手。请提供清晰、高效的代码解决方案。",
            category = AgentCategory.CODING,
            temperature = 0.3f,
            sortOrder = 1
        )

        /**
         * 创建创意写手
         */
        fun createCreativeWriter(): Agent = Agent(
            name = "创意写手",
            role = "写作专家",
            description = "擅长创意写作、文案撰写和故事创作",
            systemPrompt = "你是一个富有创意的写作助手。请提供生动、有趣的文字内容。",
            category = AgentCategory.WRITING,
            temperature = 0.9f,
            sortOrder = 2
        )
    }
}

/**
 * 代理类别枚举
 */
enum class AgentCategory {
    GENERAL,    // 通用
    CODING,     // 编程
    WRITING,    // 写作
    TRANSLATION,// 翻译
    ANALYSIS,   // 分析
    CUSTOM      // 自定义
}

/**
 * 代理状态
 */
enum class AgentStatus {
    ONLINE,     // 在线
    OFFLINE,    // 离线
    BUSY,       // 忙碌
    ERROR       // 错误
}

/**
 * 代理能力
 */
@Serializable
data class AgentCapability(
    val id: String,
    val name: String,
    val description: String,
    val icon: String? = null
)

/**
 * 代理列表状态
 */
data class AgentListState(
    val agents: List<Agent> = emptyList(),
    val selectedAgent: Agent? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

/**
 * 代理配置
 */
@Serializable
data class AgentConfig(
    val topP: Float = 1.0f,
    val frequencyPenalty: Float = 0.0f,
    val presencePenalty: Float = 0.0f,
    val stopSequences: List<String> = emptyList(),
    val contextWindow: Int = 10
)
