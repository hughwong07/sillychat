package com.xiaoshagua.xsgchat.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.SmartToy
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AgentScreen(navController: NavController) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AI代理") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { /* Add agent */ }) {
                Icon(Icons.Default.Add, contentDescription = "Add Agent")
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            items(sampleAgents) { agent ->
                AgentItem(agent = agent)
            }
        }
    }
}

@Composable
fun AgentItem(agent: AgentInfo) {
    ListItem(
        headlineContent = { Text(agent.name) },
        supportingContent = { Text(agent.role) },
        leadingContent = {
            Icon(Icons.Default.SmartToy, contentDescription = null)
        }
    )
}

data class AgentInfo(
    val id: String,
    val name: String,
    val role: String,
    val status: String
)

val sampleAgents = listOf(
    AgentInfo("1", "小傻瓜", "助手", "online"),
    AgentInfo("2", "Claude", "AI助手", "online"),
    AgentInfo("3", "GPT-4", "AI助手", "offline")
)
