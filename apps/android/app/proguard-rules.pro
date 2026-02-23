# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number table, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# =============================================================================
# SillyChat ProGuard Rules
# =============================================================================

# Keep Application class
-keep class com.xiaoshagua.xsgchat.XSGChatApplication { *; }

# Keep MainActivity for launcher
-keep class com.xiaoshagua.xsgchat.MainActivity { *; }

# =============================================================================
# Kotlin
# =============================================================================
-keep class kotlin.** { *; }
-keep class kotlin.Metadata { *; }
-dontwarn kotlin.**
-keepclassmembers class **$WhenMappings {
    <fields>;
}
-keepclassmembers class kotlin.Metadata {
    public <methods>;
}

# =============================================================================
# Kotlinx Serialization
# =============================================================================
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *; }
-keepclassmembers class kotlinx.serialization.** {
    *** Companion;
    *** INSTANCE;
    kotlinx.serialization.KSerializer serializer(...);
}
-keep class kotlinx.serialization.** { *; }

# Keep serializable classes
-keepclassmembers class com.xiaoshagua.xsgchat.data.** {
    <fields>;
}
-keep class com.xiaoshagua.xsgchat.data.** { *; }

# =============================================================================
# Hilt / Dagger
# =============================================================================
-keep class dagger.hilt.** { *; }
-dontwarn dagger.hilt.**
-keep class javax.inject.** { *; }
-keep class * extends dagger.hilt.internal.GeneratedComponent { *; }
-keep class * extends dagger.hilt.internal.GeneratedComponentManagerHolder { *; }
-keep class * extends dagger.hilt.android.internal.managers.ActivityComponentManager { *; }
-keep class * extends dagger.hilt.android.internal.managers.FragmentComponentManager { *; }
-keep class * extends dagger.hilt.android.internal.managers.ViewComponentManager { *; }
-keep class * extends dagger.hilt.android.internal.managers.SavedStateHandleHolder { *; }
-keepclassmembers class * {
    @dagger.hilt.android.lifecycle.HiltViewModel <init>(...);
}

# Keep Hilt modules
-keep class com.xiaoshagua.xsgchat.di.** { *; }

# =============================================================================
# Room Database
# =============================================================================
-keep class androidx.room.** { *; }
-dontwarn androidx.room.**
-keep @androidx.room.Entity class *
-keep @androidx.room.Dao class *
-keep @androidx.room.Database class *
-keepclassmembers class * {
    @androidx.room.* <fields>;
}
-keep class * extends androidx.room.RoomDatabase

# Keep Room entities and DAOs
-keep class com.xiaoshagua.xsgchat.data.local.** { *; }

# =============================================================================
# Ktor Client
# =============================================================================
-keep class io.ktor.** { *; }
-dontwarn io.ktor.**
-keepclassmembers class io.ktor.client.** { *; }

# =============================================================================
# AndroidX / Compose
# =============================================================================
-keep class androidx.** { *; }
-dontwarn androidx.**
-keep class androidx.compose.** { *; }
-dontwarn androidx.compose.**
-keep class androidx.lifecycle.** { *; }
-keep class androidx.navigation.** { *; }

# Keep Compose functions
-keepclassmembers class * {
    @androidx.compose.runtime.Composable <methods>;
}

# =============================================================================
# Services and Receivers
# =============================================================================
-keep class com.xiaoshagua.xsgchat.service.** { *; }
-keep class com.xiaoshagua.xsgchat.receiver.** { *; }

# Keep Service class
-keep class com.xiaoshagua.xsgchat.service.GatewayService { *; }

# Keep BootReceiver
-keep class com.xiaoshagua.xsgchat.receiver.BootReceiver { *; }

# =============================================================================
# DataStore
# =============================================================================
-keep class androidx.datastore.** { *; }
-dontwarn androidx.datastore.**

# =============================================================================
# Coil (Image Loading)
# =============================================================================
-keep class coil.** { *; }
-dontwarn coil.**

# =============================================================================
# General Android
# =============================================================================
-keepclassmembers class * implements android.os.Parcelable {
    static ** CREATOR;
}
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Application
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver
-keep public class * extends android.content.ContentProvider
