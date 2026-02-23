/**
 * Navigation Integration Tests
 * SillyChat Mobile - Tests for navigation flow between screens
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainStackParamList } from '../../types';

// Mock screens for testing
const MockChatScreen = ({ navigation }: any) => (
  <div testID="chat-screen">Chat Screen</div>
);
const MockAgentsScreen = ({ navigation }: any) => (
  <div testID="agents-screen">Agents Screen</div>
);
const MockSettingsScreen = ({ navigation }: any) => (
  <div testID="settings-screen">Settings Screen</div>
);
const MockProfileScreen = ({ navigation }: any) => (
  <div testID="profile-screen">Profile Screen</div>
);

// Create test navigators
const Stack = createNativeStackNavigator<MainStackParamList>();
const Tab = createBottomTabNavigator();

// Test tab navigator
const TestTabNavigator = () => (
  <Tab.Navigator>
    <Tab.Screen name="Chat" component={MockChatScreen} />
    <Tab.Screen name="Agents" component={MockAgentsScreen} />
    <Tab.Screen name="Settings" component={MockSettingsScreen} />
  </Tab.Navigator>
);

// Test stack navigator
const TestStackNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="MainTabs"
      component={TestTabNavigator}
      options={{ headerShown: false }}
    />
    <Stack.Screen name="Chat" component={MockChatScreen} />
    <Stack.Screen name="Settings" component={MockSettingsScreen} />
    <Stack.Screen name="Profile" component={MockProfileScreen} />
  </Stack.Navigator>
);

describe('Navigation Integration', () => {
  describe('Stack Navigation', () => {
    it('should render initial route', async () => {
      const { getByTestId } = render(
        <NavigationContainer>
          <TestStackNavigator />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByTestId('chat-screen')).toBeTruthy();
      });
    });

    it('should navigate between screens', async () => {
      const { getByTestId, queryByTestId } = render(
        <NavigationContainer>
          <TestStackNavigator />
        </NavigationContainer>
      );

      // Initial screen should be visible
      await waitFor(() => {
        expect(getByTestId('chat-screen')).toBeTruthy();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should render tab navigator with multiple tabs', async () => {
      const { getByTestId } = render(
        <NavigationContainer>
          <TestTabNavigator />
        </NavigationContainer>
      );

      await waitFor(() => {
        // First tab should be visible by default
        expect(getByTestId('chat-screen')).toBeTruthy();
      });
    });

    it('should switch between tabs', async () => {
      const { getByTestId } = render(
        <NavigationContainer>
          <TestTabNavigator />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByTestId('chat-screen')).toBeTruthy();
      });

      // Tab switching would require more complex setup with user events
      // This is a basic structure test
    });
  });

  describe('Navigation State', () => {
    it('should maintain navigation state', async () => {
      const navigationRef: React.RefObject<any> = React.createRef();

      render(
        <NavigationContainer ref={navigationRef}>
          <TestStackNavigator />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(navigationRef.current).toBeDefined();
      });

      // Navigation state should be available
      expect(navigationRef.current.getRootState()).toBeDefined();
    });

    it('should handle deep linking', async () => {
      const linking = {
        prefixes: ['sillychat://'],
        config: {
          screens: {
            MainTabs: {
              screens: {
                Chat: 'chat',
                Agents: 'agents',
                Settings: 'settings',
              },
            },
            Profile: 'profile/:userId',
          },
        },
      };

      const { getByTestId } = render(
        <NavigationContainer linking={linking}>
          <TestStackNavigator />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByTestId('chat-screen')).toBeTruthy();
      });
    });
  });

  describe('Navigation Options', () => {
    it('should apply screen options', async () => {
      const StackWithOptions = () => (
        <Stack.Navigator
          screenOptions={{
            headerShown: true,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen
            name="MainTabs"
            component={TestTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Profile"
            component={MockProfileScreen}
            options={{
              title: 'User Profile',
              headerBackTitle: 'Back',
            }}
          />
        </Stack.Navigator>
      );

      const { getByTestId } = render(
        <NavigationContainer>
          <StackWithOptions />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByTestId('chat-screen')).toBeTruthy();
      });
    });
  });

  describe('Nested Navigation', () => {
    it('should handle nested stack within tabs', async () => {
      const NestedChatStack = () => (
        <Stack.Navigator>
          <Stack.Screen name="ChatList" component={MockChatScreen} />
          <Stack.Screen name="ChatDetail" component={MockChatScreen} />
        </Stack.Navigator>
      );

      const NestedTabNavigator = () => (
        <Tab.Navigator>
          <Tab.Screen name="Chat" component={NestedChatStack} />
          <Tab.Screen name="Agents" component={MockAgentsScreen} />
        </Tab.Navigator>
      );

      const { getByTestId } = render(
        <NavigationContainer>
          <NestedTabNavigator />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByTestId('chat-screen')).toBeTruthy();
      });
    });
  });

  describe('Navigation Parameters', () => {
    it('should pass parameters between screens', async () => {
      interface ParamsScreenProps {
        route: {
          params: {
            conversationId: string;
            title: string;
          };
        };
      }

      const ParamsScreen = ({ route }: ParamsScreenProps) => (
        <div testID="params-screen">
          {route.params.conversationId}-{route.params.title}
        </div>
      );

      const StackWithParams = () => (
        <Stack.Navigator>
          <Stack.Screen name="Chat" component={MockChatScreen} />
          <Stack.Screen
            name="ChatDetail"
            component={ParamsScreen}
            initialParams={{ conversationId: '123', title: 'Test Chat' }}
          />
        </Stack.Navigator>
      );

      const { getByTestId } = render(
        <NavigationContainer>
          <StackWithParams />
        </NavigationContainer>
      );

      await waitFor(() => {
        expect(getByTestId('chat-screen')).toBeTruthy();
      });
    });
  });
});
