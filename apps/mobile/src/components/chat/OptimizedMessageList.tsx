/**
 * 优化的消息列表组件
 * 使用React.memo、useMemo和FlatList优化
 */

import React, { useRef, useCallback, useMemo, memo } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  ViewStyle,
  ListRenderItem,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { Message, MessageBubble } from './MessageBubble';

interface OptimizedMessageListProps {
  messages: Message[];
  currentUserId: string;
  onRefresh?: () => Promise<void>;
  onLoadMore?: () => void;
  onMessagePress?: (message: Message) => void;
  onMessageLongPress?: (message: Message) => void;
  refreshing?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  style?: ViewStyle;
  ListEmptyComponent?: React.ReactElement;
  typingUsers?: string[];
}

/**
 * 消息项组件
 * 使用memo优化，避免不必要的重渲染
 */
const MessageItem = memo(({
  message,
  isCurrentUser,
  onPress,
  onLongPress,
  senderName,
  avatarUrl
}: {
  message: Message;
  isCurrentUser: boolean;
  onPress?: (message: Message) => void;
  onLongPress?: (message: Message) => void;
  senderName?: string;
  avatarUrl?: string;
}) => {
  return (
    <MessageBubble
      message={message}
      isCurrentUser={isCurrentUser}
      showAvatar={!isCurrentUser}
      avatarUrl={avatarUrl}
      senderName={senderName}
      onPress={onPress}
      onLongPress={onLongPress}
    />
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，只在必要时重渲染
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.isCurrentUser === nextProps.isCurrentUser
  );
});

MessageItem.displayName = 'MessageItem';

/**
 * 打字指示器组件
 */
const TypingIndicator = memo(({ users }: { users: string[] }) => {
  if (users.length === 0) return null;

  const text = users.length === 1
    ? `${users[0]} 正在输入...`
    : `${users.length} 人正在输入...`;

  return (
    <View style={styles.typingContainer}>
      <ActivityIndicator size="small" color={COLORS.primary.main} />
      <Text style={styles.typingText}>{text}</Text>
    </View>
  );
});

TypingIndicator.displayName = 'TypingIndicator';

/**
 * 优化的消息列表组件
 */
export const OptimizedMessageList: React.FC<OptimizedMessageListProps> = ({
  messages,
  currentUserId,
  onRefresh,
  onLoadMore,
  onMessagePress,
  onMessageLongPress,
  refreshing = false,
  loadingMore = false,
  hasMore = false,
  style,
  ListEmptyComponent,
  typingUsers = [],
}) => {
  const flatListRef = useRef<FlatList<Message>>(null);
  const onEndReachedCalledDuringMomentum = useRef(false);

  // 使用useMemo缓存排序后的消息
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => a.timestamp - b.timestamp);
  }, [messages]);

  // 使用useMemo缓存用户映射
  const userInfoMap = useMemo(() => {
    const map = new Map<string, { name: string; avatar?: string }>();
    messages.forEach(msg => {
      if (!map.has(msg.senderId)) {
        map.set(msg.senderId, {
          name: msg.senderName || '未知用户',
          avatar: msg.senderAvatar
        });
      }
    });
    return map;
  }, [messages]);

  // 优化的渲染函数
  const renderItem: ListRenderItem<Message> = useCallback(({ item }) => {
    const isCurrentUser = item.senderId === currentUserId;
    const userInfo = userInfoMap.get(item.senderId);

    return (
      <MessageItem
        message={item}
        isCurrentUser={isCurrentUser}
        onPress={onMessagePress}
        onLongPress={onMessageLongPress}
        senderName={userInfo?.name}
        avatarUrl={userInfo?.avatar}
      />
    );
  }, [currentUserId, userInfoMap, onMessagePress, onMessageLongPress]);

  // 优化的key提取函数
  const keyExtractor = useCallback((item: Message) => item.id, []);

  // 优化的getItemLayout，提升滚动性能
  const getItemLayout = useCallback((
    data: ArrayLike<Message> | null | undefined,
    index: number
  ) => ({
    length: 80, // 预估每项高度
    offset: 80 * index,
    index,
  }), []);

  // 处理加载更多
  const handleEndReached = useCallback(() => {
    if (!onEndReachedCalledDuringMomentum.current && hasMore && !loadingMore) {
      onLoadMore?.();
      onEndReachedCalledDuringMomentum.current = true;
    }
  }, [hasMore, loadingMore, onLoadMore]);

  // 渲染底部加载指示器
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={COLORS.primary.main} />
        <Text style={styles.footerText}>加载中...</Text>
      </View>
    );
  }, [loadingMore]);

  // 渲染空状态
  const renderEmpty = useCallback(() => {
    if (ListEmptyComponent) return ListEmptyComponent;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>暂无消息</Text>
        <Text style={styles.emptySubtext}>开始发送消息吧</Text>
      </View>
    );
  }, [ListEmptyComponent]);

  return (
    <FlatList
      ref={flatListRef}
      data={sortedMessages}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      contentContainerStyle={[styles.container, style]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary.main]}
            tintColor={COLORS.primary.main}
          />
        ) : undefined
      }
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.3}
      onMomentumScrollBegin={() => {
        onEndReachedCalledDuringMomentum.current = false;
      }}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10,
      }}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      // 性能优化配置
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={21}
      // 额外的列表头部组件
      ListHeaderComponent={
        typingUsers.length > 0 ? (
          <TypingIndicator users={typingUsers} />
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  footerText: {
    marginLeft: 8,
    fontSize: 13,
    color: COLORS.light.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.light.textSecondary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.light.textTertiary,
    marginTop: 8,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    marginLeft: 8,
    fontSize: 13,
    color: COLORS.light.textSecondary,
  },
});

export default OptimizedMessageList;
