package com.sillychat.app.ui.components.message

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import coil.ImageLoader
import coil.load
import coil.memory.MemoryCache
import coil.request.CachePolicy
import coil.request.ImageRequest
import com.sillychat.app.R
import com.sillychat.app.data.model.Message
import com.sillychat.app.data.model.MessageRole
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * 消息列表适配器
 * 使用DiffUtil优化列表更新性能
 */
class MessageAdapter(
    private val currentUserId: String,
    private val imageLoader: ImageLoader,
    private val onMessageClick: ((Message) -> Unit)? = null,
    private val onMessageLongClick: ((Message) -> Unit)? = null
) : ListAdapter<Message, MessageAdapter.MessageViewHolder>(MessageDiffCallback()) {

    /**
     * 消息DiffCallback
     * 高效计算列表差异，只更新变化项
     */
    class MessageDiffCallback : DiffUtil.ItemCallback<Message>() {
        override fun areItemsTheSame(oldItem: Message, newItem: Message): Boolean {
            // 使用消息ID作为唯一标识
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Message, newItem: Message): Boolean {
            // 比较消息内容是否相同
            return oldItem.content == newItem.content &&
                    oldItem.timestamp == newItem.timestamp &&
                    oldItem.syncStatus == newItem.syncStatus &&
                    oldItem.isDeleted == newItem.isDeleted
        }

        override fun getChangePayload(oldItem: Message, newItem: Message): Any? {
            // 返回具体变化的字段，用于局部更新
            val payloads = mutableListOf<String>()
            if (oldItem.content != newItem.content) payloads.add(PAYLOAD_CONTENT)
            if (oldItem.syncStatus != newItem.syncStatus) payloads.add(PAYLOAD_STATUS)
            if (oldItem.isDeleted != newItem.isDeleted) payloads.add(PAYLOAD_DELETED)
            return if (payloads.isEmpty()) null else payloads
        }
    }

    companion object {
        const val PAYLOAD_CONTENT = "content"
        const val PAYLOAD_STATUS = "status"
        const val PAYLOAD_DELETED = "deleted"
        const val VIEW_TYPE_SENT = 1
        const val VIEW_TYPE_RECEIVED = 2
    }

    override fun getItemViewType(position: Int): Int {
        val message = getItem(position)
        return if (message.role == MessageRole.USER) VIEW_TYPE_SENT else VIEW_TYPE_RECEIVED
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MessageViewHolder {
        val layoutId = when (viewType) {
            VIEW_TYPE_SENT -> R.layout.item_message_sent
            else -> R.layout.item_message_received
        }
        val view = LayoutInflater.from(parent.context).inflate(layoutId, parent, false)
        return MessageViewHolder(view, imageLoader)
    }

    override fun onBindViewHolder(holder: MessageViewHolder, position: Int) {
        val message = getItem(position)
        holder.bind(message, currentUserId)
    }

    override fun onBindViewHolder(
        holder: MessageViewHolder,
        position: Int,
        payloads: MutableList<Any>
    ) {
        if (payloads.isEmpty()) {
            super.onBindViewHolder(holder, position, payloads)
            return
        }

        // 局部更新，避免完整重新绑定
        val message = getItem(position)
        @Suppress("UNCHECKED_CAST")
        val payloadList = payloads[0] as? List<String>

        payloadList?.forEach { payload ->
            when (payload) {
                PAYLOAD_CONTENT -> holder.updateContent(message)
                PAYLOAD_STATUS -> holder.updateStatus(message)
                PAYLOAD_DELETED -> holder.updateDeletedState(message)
            }
        }
    }

    /**
     * ViewHolder缓存复用
     * 减少findViewById调用，提升滚动性能
     */
    class MessageViewHolder(
        itemView: View,
        private val imageLoader: ImageLoader
    ) : RecyclerView.ViewHolder(itemView) {

        // 使用lazy初始化视图，避免重复findViewById
        private val contentText: TextView by lazy { itemView.findViewById(R.id.tv_message_content) }
        private val timeText: TextView by lazy { itemView.findViewById(R.id.tv_message_time) }
        private val statusIcon: ImageView? by lazy { itemView.findViewById(R.id.iv_status) }
        private val avatarImage: ImageView? by lazy { itemView.findViewById(R.id.iv_avatar) }
        private val senderName: TextView? by lazy { itemView.findViewById(R.id.tv_sender_name) }

        private val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())

        fun bind(message: Message, currentUserId: String) {
            updateContent(message)
            updateTime(message)
            updateStatus(message)
            updateDeletedState(message)
            loadAvatar(message)
            updateSenderName(message)

            // 设置点击事件
            itemView.setOnClickListener { onMessageClick?.invoke(message) }
            itemView.setOnLongClickListener {
                onMessageLongClick?.invoke(message)
                true
            }
        }

        /**
         * 更新消息内容
         */
        fun updateContent(message: Message) {
            contentText.text = if (message.isDeleted) "[已删除]" else message.content
            contentText.alpha = if (message.isDeleted) 0.5f else 1.0f
        }

        /**
         * 更新时间显示
         */
        private fun updateTime(message: Message) {
            timeText.text = timeFormat.format(Date(message.timestamp))
        }

        /**
         * 更新消息状态
         */
        fun updateStatus(message: Message) {
            statusIcon?.apply {
                visibility = if (message.role == MessageRole.USER) View.VISIBLE else View.GONE
                when (message.syncStatus) {
                    SyncStatus.SENDING -> setImageResource(R.drawable.ic_status_sending)
                    SyncStatus.SYNCED -> setImageResource(R.drawable.ic_status_sent)
                    SyncStatus.FAILED -> setImageResource(R.drawable.ic_status_failed)
                    else -> visibility = View.GONE
                }
            }
        }

        /**
         * 更新删除状态
         */
        fun updateDeletedState(message: Message) {
            contentText.text = if (message.isDeleted) "[已删除]" else message.content
            contentText.alpha = if (message.isDeleted) 0.5f else 1.0f
        }

        /**
         * 加载头像
         * 使用Coil进行图片加载优化
         */
        private fun loadAvatar(message: Message) {
            avatarImage?.let { imageView ->
                val avatarUrl = message.senderId?.let { getAvatarUrl(it) }

                if (avatarUrl != null) {
                    // 使用Coil加载图片，启用内存缓存
                    imageView.load(avatarUrl, imageLoader) {
                        crossfade(true)
                        placeholder(R.drawable.ic_avatar_placeholder)
                        error(R.drawable.ic_avatar_error)
                        memoryCachePolicy(CachePolicy.ENABLED)
                        diskCachePolicy(CachePolicy.ENABLED)
                    }
                } else {
                    // 显示默认头像
                    imageView.setImageResource(R.drawable.ic_avatar_default)
                }
            }
        }

        /**
         * 更新发送者名称
         */
        private fun updateSenderName(message: Message) {
            senderName?.apply {
                visibility = if (message.role == MessageRole.USER) View.GONE else View.VISIBLE
                text = message.senderName ?: "AI助手"
            }
        }

        /**
         * 获取头像URL
         */
        private fun getAvatarUrl(senderId: String): String? {
            // 根据senderId生成头像URL
            return if (senderId.startsWith("agent_")) {
                "https://api.dicebear.com/7.x/bottts/svg?seed=$senderId"
            } else {
                null
            }
        }
    }
}

// 导入SyncStatus
import com.sillychat.app.data.model.SyncStatus
