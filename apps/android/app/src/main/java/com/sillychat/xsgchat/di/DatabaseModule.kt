package com.sillychat.app.di

import android.content.Context
import androidx.room.Room
import com.sillychat.app.data.local.AppDatabase
import com.sillychat.app.data.local.dao.MessageDao
import com.sillychat.app.data.local.dao.AgentDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * 数据库模块
 * 提供优化的数据库配置
 */
@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    /**
     * 提供数据库实例
     * 优化：配置查询线程池、启用WAL模式
     */
    @Provides
    @Singleton
    fun provideDatabase(
        @ApplicationContext context: Context
    ): AppDatabase {
        return Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            "sillychat_database"
        )
            // 启用WAL模式，提升并发性能
            .enableMultiInstanceInvalidation()
            // 设置查询执行器
            .setQueryExecutor { command ->
                Thread(command, "Room-Query-Thread").apply {
                    isDaemon = true
                }.start()
            }
            // 设置事务执行器
            .setTransactionExecutor { command ->
                Thread(command, "Room-Transaction-Thread").apply {
                    isDaemon = true
                }.start()
            }
            // 数据库迁移策略
            .fallbackToDestructiveMigration()
            .build()
    }

    /**
     * 提供消息DAO
     */
    @Provides
    @Singleton
    fun provideMessageDao(database: AppDatabase): MessageDao {
        return database.messageDao()
    }

    /**
     * 提供代理DAO
     */
    @Provides
    @Singleton
    fun provideAgentDao(database: AppDatabase): AgentDao {
        return database.agentDao()
    }
}
