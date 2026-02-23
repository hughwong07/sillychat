/**
 * 个人资料页面
 * 展示和编辑用户个人信息
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Appbar, Button, Divider, List, Switch } from 'react-native-paper';
import { XSGAvatar } from '../components/common/XSGAvatar';
import { XSGCard } from '../components/common/XSGCard';
import { COLORS, PRIMARY, ACCENT } from '../constants/colors';

// 模拟用户数据
const MOCK_USER = {
  id: 'user_001',
  username: 'silly_user',
  nickname: '小傻瓜用户',
  avatar: undefined,
  bio: '热爱探索AI的无限可能 ✨',
  email: 'user@sillychat.com',
  phone: '+86 138****8888',
  joinDate: '2024-01-15',
  stats: {
    conversations: 128,
    messages: 3560,
    agents: 5,
  },
};

interface MenuItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightComponent?: React.ReactNode;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  showArrow = true,
  rightComponent,
}) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} disabled={!onPress}>
    <View style={styles.menuIconContainer}>
      <Icon name={icon} size={22} color={PRIMARY.main} />
    </View>
    <View style={styles.menuContent}>
      <Text style={styles.menuTitle}>{title}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    {rightComponent || (showArrow && (
      <Icon name="chevron-right" size={20} color="#CCCCCC" />
    ))}
  </TouchableOpacity>
);

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const [user] = useState(MOCK_USER);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // 编辑资料
  const handleEditProfile = useCallback(() => {
    console.log('编辑资料');
  }, []);

  // 打开设置
  const handleOpenSettings = useCallback(() => {
    // @ts-ignore
    navigation.navigate('Settings');
  }, [navigation]);

  // 退出登录
  const handleLogout = useCallback(() => {
    console.log('退出登录');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header style={styles.header}>
        <Appbar.Content title="个人中心" />
        <Appbar.Action icon="cog" onPress={handleOpenSettings} />
      </Appbar.Header>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 用户信息卡片 */}
        <XSGCard style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <XSGAvatar
              name={user.nickname}
              uri={user.avatar}
              size="xlarge"
              showStatus={true}
              status="online"
            />

            <View style={styles.profileInfo}>
              <Text style={styles.nickname}>{user.nickname}</Text>
              <Text style={styles.username}>@{user.username}</Text>
              <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text>
            </View>
          </View>

          <Button
            mode="outlined"
            onPress={handleEditProfile}
            style={styles.editButton}
            labelStyle={styles.editButtonLabel}
            icon="pencil"
          >
            编辑资料
          </Button>

          {/* 统计数据 */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.stats.conversations}</Text>
              <Text style={styles.statLabel}>对话</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.stats.messages}</Text>
              <Text style={styles.statLabel}>消息</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{user.stats.agents}</Text>
              <Text style={styles.statLabel}>代理</Text>
            </View>
          </View>
        </XSGCard>

        {/* 账号信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>账号信息</Text>
          <XSGCard padding="none">
            <MenuItem
              icon="email-outline"
              title="邮箱"
              subtitle={user.email}
              showArrow={false}
            />
            <Divider style={styles.divider} />
            <MenuItem
              icon="phone-outline"
              title="手机号"
              subtitle={user.phone}
              showArrow={false}
            />
            <Divider style={styles.divider} />
            <MenuItem
              icon="calendar-outline"
              title="加入时间"
              subtitle={user.joinDate}
              showArrow={false}
            />
          </XSGCard>
        </View>

        {/* 偏好设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>偏好设置</Text>
          <XSGCard padding="none">
            <MenuItem
              icon="bell-outline"
              title="消息通知"
              showArrow={false}
              rightComponent={
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: '#E5E5E5', true: PRIMARY.light }}
                  thumbColor={notifications ? PRIMARY.main : '#f4f3f4'}
                />
              }
            />
            <Divider style={styles.divider} />
            <MenuItem
              icon="theme-light-dark"
              title="深色模式"
              showArrow={false}
              rightComponent={
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: '#E5E5E5', true: PRIMARY.light }}
                  thumbColor={darkMode ? PRIMARY.main : '#f4f3f4'}
                />
              }
            />
          </XSGCard>
        </View>

        {/* 更多 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>更多</Text>
          <XSGCard padding="none">
            <MenuItem
              icon="help-circle-outline"
              title="帮助与反馈"
              onPress={() => {}}
            />
            <Divider style={styles.divider} />
            <MenuItem
              icon="information-outline"
              title="关于我们"
              subtitle="v1.0.0"
              onPress={() => {}}
            />
            <Divider style={styles.divider} />
            <MenuItem
              icon="shield-check-outline"
              title="隐私政策"
              onPress={() => {}}
            />
          </XSGCard>
        </View>

        {/* 退出登录 */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>退出登录</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light.background,
  },
  header: {
    backgroundColor: COLORS.light.background,
    elevation: 0,
  },
  profileCard: {
    margin: 16,
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    width: '100%',
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: 16,
  },
  nickname: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.light.text,
  },
  username: {
    fontSize: 14,
    color: COLORS.light.textSecondary,
    marginTop: 4,
  },
  bio: {
    fontSize: 14,
    color: COLORS.light.textTertiary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  editButton: {
    marginTop: 16,
    borderColor: PRIMARY.main,
    width: '60%',
  },
  editButtonLabel: {
    color: PRIMARY.main,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.light.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.light.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#F0F0F0',
  },
  section: {
    marginTop: 8,
    marginHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.light.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PRIMARY[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    color: COLORS.light.text,
    fontWeight: '500',
  },
  menuSubtitle: {
    fontSize: 13,
    color: COLORS.light.textTertiary,
    marginTop: 2,
  },
  divider: {
    marginLeft: 64,
    backgroundColor: '#F0F0F0',
  },
  logoutButton: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: '#FFEBEE',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 32,
  },
});

export default ProfileScreen;
