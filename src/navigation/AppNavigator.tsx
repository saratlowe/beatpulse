import { MaterialIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import { DiscoverScreen } from '../screens/DiscoverScreen';
import { FriendPulseDetailScreen } from '../screens/FriendPulseDetailScreen';
import { EventRecommendationsScreen } from '../screens/EventRecommendationsScreen';
import { FriendMatchScreen } from '../screens/FriendMatchScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LogEventScreen } from '../screens/LogEventScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { PulseSignatureScreen } from '../screens/PulseSignatureScreen';
import { RefineVibeScreen } from '../screens/RefineVibeScreen';
import { TapSessionScreen } from '../screens/TapSessionScreen';
import { colors } from '../theme';
import type {
  DiscoverStackParamList,
  HomeStackParamList,
  LogStackParamList,
  ProfileStackParamList,
  RootTabParamList,
} from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const LogStack = createNativeStackNavigator<LogStackParamList>();
const DiscoverStack = createNativeStackNavigator<DiscoverStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.surface,
    primary: colors.accent,
  },
};

const stackScreenOpts = {
  headerStyle: {
    backgroundColor: colors.bg,
    minHeight: Platform.OS === 'android' ? 56 : Platform.OS === 'ios' ? 52 : 52,
  },
  headerTitleContainerStyle: {
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
  },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '600' as const, fontSize: 17 },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
};

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={stackScreenOpts}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} options={{ title: 'Home' }} />
    </HomeStack.Navigator>
  );
}

function LogStackNavigator() {
  return (
    <LogStack.Navigator initialRouteName="LogEventMain" screenOptions={stackScreenOpts}>
      <LogStack.Screen name="LogEventMain" component={LogEventScreen} options={{ title: 'Log event' }} />
      <LogStack.Screen
        name="TapSession"
        component={TapSessionScreen}
        options={{ title: 'Relive set' }}
      />
      <LogStack.Screen name="RefineVibe" component={RefineVibeScreen} options={{ title: 'Refine' }} />
      <LogStack.Screen
        name="PulseSignature"
        component={PulseSignatureScreen}
        options={{ title: 'Pulse signature' }}
      />
      <LogStack.Screen name="FriendMatch" component={FriendMatchScreen} options={{ title: 'Crowd match' }} />
      <LogStack.Screen
        name="FriendPulseDetail"
        component={FriendPulseDetailScreen}
        options={{ title: 'Compare pulse' }}
      />
      <LogStack.Screen
        name="EventRecommendations"
        component={EventRecommendationsScreen}
        options={{ title: 'Events for you' }}
      />
    </LogStack.Navigator>
  );
}

function DiscoverStackNavigator() {
  return (
    <DiscoverStack.Navigator initialRouteName="DiscoverMain" screenOptions={stackScreenOpts}>
      <DiscoverStack.Screen
        name="DiscoverMain"
        component={DiscoverScreen}
        options={{ title: 'Discover' }}
      />
      <DiscoverStack.Screen
        name="FriendPulseDetail"
        component={FriendPulseDetailScreen}
        options={{ title: 'Compare pulse' }}
      />
    </DiscoverStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={stackScreenOpts}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'Profile' }} />
    </ProfileStack.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: '#2a3148',
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.muted,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeStackNavigator}
          options={{
            tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} />,
          }}
        />
        <Tab.Screen
          name="LogEvent"
          component={LogStackNavigator}
          options={{
            title: 'Log',
            tabBarLabel: 'Log event',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="add-circle-outline" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Discover"
          component={DiscoverStackNavigator}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="explore" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileStackNavigator}
          options={{
            tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
