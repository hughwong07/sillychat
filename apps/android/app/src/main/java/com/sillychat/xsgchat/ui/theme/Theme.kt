package com.sillychat.app.ui.theme

import android.app.Activity
import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColors = lightColorScheme(
    primary = PrimaryBlue,
    onPrimary = Color.White,
    primaryContainer = PrimaryBlue.copy(alpha = 0.1f),
    onPrimaryContainer = PrimaryBlue,
    secondary = AccentGreen,
    onSecondary = Color.White,
    secondaryContainer = AccentGreen.copy(alpha = 0.1f),
    onSecondaryContainer = AccentGreen,
    tertiary = WarningYellow,
    onTertiary = Color.Black,
    tertiaryContainer = WarningYellow.copy(alpha = 0.1f),
    onTertiaryContainer = WarningYellow,
    background = LightBackground,
    onBackground = Color.Black,
    surface = LightSurface,
    onSurface = Color.Black,
    surfaceVariant = LightSurface.copy(alpha = 0.8f),
    onSurfaceVariant = Color.DarkGray,
    surfaceTint = PrimaryBlue.copy(alpha = 0.05f),
    inverseSurface = DarkSurface,
    inverseOnSurface = Color.White,
    error = ErrorRed,
    onError = Color.White,
    errorContainer = ErrorRed.copy(alpha = 0.1f),
    onErrorContainer = ErrorRed,
    outline = Color.Gray,
    outlineVariant = Color.LightGray,
    scrim = Color.Black.copy(alpha = 0.5f),
    inversePrimary = PrimaryBlue.copy(alpha = 0.8f),
    surfaceBright = LightSurface,
    surfaceDim = LightBackground,
    surfaceContainer = LightSurface,
    surfaceContainerHigh = LightSurface,
    surfaceContainerHighest = LightSurface,
    surfaceContainerLow = LightBackground,
    surfaceContainerLowest = LightBackground
)

private val DarkColors = darkColorScheme(
    primary = PrimaryBlue,
    onPrimary = Color.White,
    primaryContainer = PrimaryBlue.copy(alpha = 0.2f),
    onPrimaryContainer = PrimaryBlue.copy(alpha = 0.8f),
    secondary = AccentGreen,
    onSecondary = Color.White,
    secondaryContainer = AccentGreen.copy(alpha = 0.2f),
    onSecondaryContainer = AccentGreen.copy(alpha = 0.8f),
    tertiary = WarningYellow,
    onTertiary = Color.Black,
    tertiaryContainer = WarningYellow.copy(alpha = 0.2f),
    onTertiaryContainer = WarningYellow.copy(alpha = 0.8f),
    background = DarkBackground,
    onBackground = Color.White,
    surface = DarkSurface,
    onSurface = Color.White,
    surfaceVariant = DarkSurface.copy(alpha = 0.8f),
    onSurfaceVariant = Color.LightGray,
    surfaceTint = PrimaryBlue.copy(alpha = 0.1f),
    inverseSurface = LightSurface,
    inverseOnSurface = Color.Black,
    error = ErrorRed,
    onError = Color.White,
    errorContainer = ErrorRed.copy(alpha = 0.2f),
    onErrorContainer = ErrorRed.copy(alpha = 0.8f),
    outline = Color.Gray,
    outlineVariant = Color.DarkGray,
    scrim = Color.Black.copy(alpha = 0.7f),
    inversePrimary = PrimaryBlue.copy(alpha = 0.6f),
    surfaceBright = DarkSurface,
    surfaceDim = DarkBackground,
    surfaceContainer = DarkSurface,
    surfaceContainerHigh = DarkSurface,
    surfaceContainerHighest = DarkSurface,
    surfaceContainerLow = DarkBackground,
    surfaceContainerLowest = DarkBackground
)

@Composable
fun SillyChatTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColors
        else -> LightColors
    }

    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
