package com.sillychat.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverter
import androidx.room.TypeConverters
import com.sillychat.app.data.model.*

/**
 * 应用数据库
 * 包含消息、代理等数据表
 */
@Database(
    entities = [
        Message::class,
        Agent::class
    ],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {

    /**
     * 消息数据访问对象
     */
    abstract fun messageDao(): MessageDao

    /**
     * 代理数据访问对象
     */
    abstract fun agentDao(): AgentDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        /**
         * 数据库名称
         */
        private const val DATABASE_NAME = "sillychat_database"

        /**
         * 获取数据库实例（单例模式）
         */
        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    DATABASE_NAME
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}

/**
 * 类型转换器
 * 用于Room数据库中枚举类型和复杂类型的转换
 */
class Converters {

    /**
     * 消息角色转换
     */
    @TypeConverter
    fun fromMessageRole(role: MessageRole): String = role.name

    @TypeConverter
    fun toMessageRole(value: String): MessageRole =
        MessageRole.valueOf(value)

    /**
     * 消息类型转换
     */
    @TypeConverter
    fun fromMessageType(type: MessageType): String = type.name

    @TypeConverter
    fun toMessageType(value: String): MessageType =
        MessageType.valueOf(value)

    /**
     * 同步状态转换
     */
    @TypeConverter
    fun fromSyncStatus(status: SyncStatus): String = status.name

    @TypeConverter
    fun toSyncStatus(value: String): SyncStatus =
        SyncStatus.valueOf(value)

    /**
     * 代理类别转换
     */
    @TypeConverter
    fun fromAgentCategory(category: AgentCategory): String = category.name

    @TypeConverter
    fun toAgentCategory(value: String): AgentCategory =
        AgentCategory.valueOf(value)
}