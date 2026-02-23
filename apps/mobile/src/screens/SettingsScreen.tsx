/**
 * 设置屏幕
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Header } from '../components/layout/Header';
import { COLORS } from '../constants/colors';

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  onPress?: () => void;
  showArrow?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  onPress,
  showArrow = false,
}) => {
  const isSwitch = value !== undefined;

  return (
    <View style={styles.settingItem}>
      <View style={styles.iconContainer}>
        <Icon name={icon} size={22} color={COLORS.primary.main} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>

      {isSwitch ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: COLORS.light.border, true: COLORS.primary.light }}
          thumbColor={value ? COLORS.primary.main : '#f4f3f4'}
        />
      ) : showArrow ? (
        <Icon name="chevron-right" size={20} color={COLORS.light.textTertiary} />
      ) : null}
    </View>
  );
};

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();

  const [settings, setSettings] = useState({
    darkMode: false,
    notifications: true,
    soundEnabled: true,
    vibrateEnabled: true,
    autoPlay: false,
    dataSync: true,
  });

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const updateSetting = useCallback((key: keyof typeof settings, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  return (
    <View style={styles.container}>
      <Header title="设置" onLeftPress={handleBack} leftIcon="arrow-left" showBack />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>外观</Text>
          <SettingItem
            icon="theme-light-dark"
            title="深色模式"
            subtitle="切换应用主题"
            value={settings.darkMode}
            onValueChange={(v) => updateSetting('darkMode', v)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>通知</Text>
          <SettingItem
            icon="bell-outline"
            title="消息通知"
            value={settings.notifications}
            onValueChange={(v) => updateSetting('notifications', v)}
          />
          <SettingItem
            icon="volume-high"
            title="声音"
            value={settings.soundEnabled}
            onValueChange={(v) => updateSetting('soundEnabled', v)}
          />
          <SettingItem
            icon="vibrate"
            title="振动"
            value={settings.vibrateEnabled}
            onValueChange={(v) => updateSetting('vibrateEnabled', v)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>聊天</Text>
          <SettingItem
            icon="play-circle-outline"
            title="自动播放语音"
            value={settings.autoPlay}
            onValueChange={(v) => updateSetting('autoPlay', v)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>数据</Text>
          <SettingItem
            icon="sync"
            title="自动同步"
            subtitle="在WiFi下自动同步数据"
            value={settings.dataSync}
            onValueChange={(v) => updateSetting('dataSync', v)}
          />
          <SettingItem
            icon="delete-outline"
            title="清除缓存"
            subtitle="当前缓存: 23.5 MB"
            showArrow
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>关于</Text>
          <SettingItem icon="information-outline" title="版本信息" subtitle="v1.0.0" showArrow />
          <SettingItem icon="file-document-outline" title="用户协议" showArrow />
          <SettingItem icon="shield-check-outline" title="隐私政策" showArrow />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light.background,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    backgroundColor: COLORS.light.card,
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.light.textSecondary,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light.border,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    color: COLORS.light.text,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.light.textTertiary,
    marginTop: 2,
  },
});

export default SettingsScreen;
