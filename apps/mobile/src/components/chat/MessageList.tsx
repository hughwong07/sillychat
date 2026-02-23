/**
 * 消息列表组件
 * 支持下拉刷新、上拉加载更多、滚动到底部
 */

import React, { useRef, useCallback, useEffect } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  ViewStyle,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import { Message, MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  onRefresh?: () => Promise<void>;
  onLoadMore?: () => Promise<void>;
  onMessagePress?: (message: Message) => void;
  onMessageLongPress?: (message: Message) => void;
  refreshing?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  style?: ViewStyle;
  ListEmptyComponent?: React.ReactElement;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  onRefresh,
  onLoadMore,
  onMessagePress,
  onMessageLongPress,
  refreshing = false,
  loadingMore = false,
  hasMore = false,
  style,
  ListEmptyComponent,
}) => {
  const flatListRef = useRef<FlatList<Message>>(null);
  const isFirstRender = useRef(true);

  // 新消息自动滚动到底部
  useEffect(() => {
    if (messages.length > 0 && isFirstRender.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
      isFirstRender.current = false;
    }
  }, [messages.length]);

  const handleContentSizeChange = useCallback(() => {
    if (messages.length > 0 && !loadingMore) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length, loadingMore]);

  const renderItem = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble
        message={item}
        onPress={onMessagePress}
        onLongPress={onMessageLongPress}
      />
    ),
    [onMessagePress, onMessageLongPress]
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={COLORS.primary.main} />
        <Text style={styles.footerText}>加载中...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (ListEmptyComponent) return ListEmptyComponent;
    return (
      <View style={styles.emptyContainer}>
        <Icon name="chat-outline" size={64} color={COLORS.light.textTertiary} />
        <Text style={styles.emptyText}>暂无消息</Text>
        <Text style={styles.emptySubtext}>开始发送消息吧</Text>
      </View>
    );
  };

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
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
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.3}
      onContentSizeChange={handleContentSizeChange}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
      }}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    />
  );
};

// 导入图标组件
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

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
});

export default MessageList;
