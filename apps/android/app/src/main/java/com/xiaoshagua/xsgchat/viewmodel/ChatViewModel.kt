package com.xiaoshagua.xsgchat.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.xiaoshagua.xsgchat.ui.screens.ChatMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ChatViewModel @Inject constructor() : ViewModel() {
    private val _messages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val messages: StateFlow<List<ChatMessage>> = _messages

    private val _inputText = MutableStateFlow("")
    val inputText: StateFlow<String> = _inputText

    fun onInputChange(text: String) {
        _inputText.value = text
    }

    fun sendMessage() {
        val text = _inputText.value.trim()
        if (text.isEmpty()) return

        viewModelScope.launch {
            // Add user message
            val userMessage = ChatMessage(
                id = System.currentTimeMillis().toString(),
                content = text,
                role = "user"
            )
            _messages.value += userMessage
            _inputText.value = ""

            // Simulate AI response
            val aiMessage = ChatMessage(
                id = (System.currentTimeMillis() + 1).toString(),
                content = "收到: $text",
                role = "assistant"
            )
            _messages.value += aiMessage
        }
    }
}
