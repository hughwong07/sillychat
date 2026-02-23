/**
 * 消息输入组件
 * 支持文本输入、发送按钮、扩展功能
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../constants/colors';

interface MessageInputProps {
  onSend: (text: string) => void;
  onAttachmentPress?: () => void;
  onEmojiPress?: () => void;
  onVoicePress?: () => void;
  placeholder?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

const MAX_INPUT_LENGTH = 4000;

export const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  onAttachmentPress,
  onEmojiPress,
  onVoicePress,
  placeholder = '输入消息...',
  disabled = false,
  style,
}) => {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSend = useCallback(() => {
    const trimmedText = text.trim();
    if (trimmedText.length === 0 || disabled) return;

    onSend(trimmedText);
    setText('');
    Keyboard.dismiss();
  }, [text, disabled, onSend]);

  const handleChangeText = useCallback((newText: string) => {
    if (newText.length <= MAX_INPUT_LENGTH) {
      setText(newText);
    }
  }, []);

  const isSendVisible = text.trim().length > 0;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.toolbar}>
        {onAttachmentPress && (
          <TouchableOpacity
            onPress={onAttachmentPress}
            style={styles.iconButton}
            disabled={disabled}
          >
            <Icon name="plus-circle-outline" size={24} color={COLORS.light.textSecondary} />
          </TouchableOpacity>
        )}

        {onEmojiPress && (
          <TouchableOpacity
            onPress={onEmojiPress}
            style={styles.iconButton}
            disabled={disabled}
          >
            <Icon name="emoticon-outline" size={24} color={COLORS.light.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.light.placeholder}
          multiline
          maxLength={MAX_INPUT_LENGTH}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
          textAlignVertical="center"
        />
      </View>

      {isSendVisible ? (
        <TouchableOpacity
          onPress={handleSend}
          style={[styles.sendButton, disabled && styles.sendButtonDisabled]}
          disabled={disabled}
          activeOpacity={0.8}
        >
          <Icon name="send" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      ) : onVoicePress ? (
        <TouchableOpacity
          onPress={onVoicePress}
          style={styles.iconButton}
          disabled={disabled}
        >
          <Icon name="microphone" size={24} color={COLORS.primary.main} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconButton} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: COLORS.light.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.light.border,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  inputContainer: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: COLORS.light.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.light.border,
    maxHeight: 120,
  },
  inputContainerFocused: {
    borderColor: COLORS.primary.main,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.light.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.light.textTertiary,
  },
});

export default MessageInput;
