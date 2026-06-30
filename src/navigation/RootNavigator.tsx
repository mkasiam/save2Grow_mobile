import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { AppWordmark } from '../components';

// Screen components used across the auth flow, main tabs, and goal detail flow.
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import GoalsScreen from '../screens/GoalsScreen';
import GoalDetailScreen from '../screens/GoalDetailScreen';
import ChallengesScreen from '../screens/ChallengesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SplashScreen from '../screens/SplashScreen';
import TransactionHistoryScreen from '../screens/TransactionHistoryScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ChallengeDetailScreen from '../screens/ChallengeDetailScreen';
import MonthlyReportScreen from '../screens/MonthlyReportScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import ReminderSettingsScreen from '../screens/ReminderSettingsScreen';

// Admin screens
import AdminStudentsScreen from '../screens/AdminStudentsScreen';
import AdminTransactionsScreen from '../screens/AdminTransactionsScreen';
import AdminChallengesScreen from '../screens/AdminChallengesScreen';
import AdminProfileScreen from '../screens/AdminProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const AdminTab = createBottomTabNavigator();
const AdminStackInstance = createStackNavigator();

const sharedHeaderOptions = {
  headerTitle: () => <AppWordmark />,
  headerTitleAlign: 'center' as const,
  headerShadowVisible: false,
  headerStyle: {
    backgroundColor: '#F7FBF8',
  },
  headerTintColor: '#173629',
  headerBackTitleVisible: false,
};

// Stack shown to signed-out users so they can log in or create an account.
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// Main signed-in tab experience with contextual icons for each section.
function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        ...sharedHeaderOptions,
        headerShown: true,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'home';
          
          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Goals') {
            iconName = focused ? 'flag' : 'flag-outline';
          } else if (route.name === 'Challenges') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FCFEFD',
          borderTopColor: '#DDE9E3',
          borderTopWidth: 1,
          height: 68,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 6,
          marginVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{ title: 'Goals' }}
      />
      <Tab.Screen
        name="Challenges"
        component={ChallengesScreen}
        options={{ title: 'Challenges' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

// Signed-in navigation tree with tabs as the root and goal details pushed on top.
function AppStack() {
  return (
    <Stack.Navigator screenOptions={sharedHeaderOptions}>
      <Stack.Screen
        name="MainTabs"
        component={AppTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="GoalDetail"
        component={GoalDetailScreen}
        options={{ title: 'Goal Details' }}
      />
      <Stack.Screen
        name="TransactionHistory"
        component={TransactionHistoryScreen}
        options={{ title: 'History' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen
        name="ChallengeDetail"
        component={ChallengeDetailScreen}
        options={{ title: 'Challenge Details' }}
      />
      <Stack.Screen
        name="MonthlyReport"
        component={MonthlyReportScreen}
        options={{ title: 'Monthly Report' }}
      />
      <Stack.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={{ title: 'Achievements' }}
      />
      <Stack.Screen
        name="ReminderSettings"
        component={ReminderSettingsScreen}
        options={{ title: 'Reminder Settings' }}
      />
    </Stack.Navigator>
  );
}

// Admin tab layout with custom admin headers and icons
function AdminTabs() {
  return (
    <AdminTab.Navigator
      screenOptions={({ route }) => ({
        ...sharedHeaderOptions,
        headerShown: true,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'people';
          
          if (route.name === 'AdminStudents') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'AdminTransactions') {
            iconName = focused ? 'cash' : 'cash-outline';
          } else if (route.name === 'AdminChallenges') {
            iconName = focused ? 'rocket' : 'rocket-outline';
          } else if (route.name === 'AdminProfile') {
            iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1E8E5A',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FCFEFD',
          borderTopColor: '#DDE9E3',
          borderTopWidth: 1,
          height: 68,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 6,
          marginVertical: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      })}
    >
      <AdminTab.Screen
        name="AdminStudents"
        component={AdminStudentsScreen}
        options={{ title: 'Students' }}
      />
      <AdminTab.Screen
        name="AdminTransactions"
        component={AdminTransactionsScreen}
        options={{ title: 'Payments' }}
      />
      <AdminTab.Screen
        name="AdminChallenges"
        component={AdminChallengesScreen}
        options={{ title: 'Create Challenge' }}
      />
      <AdminTab.Screen
        name="AdminProfile"
        component={AdminProfileScreen}
        options={{ title: 'Profile' }}
      />
    </AdminTab.Navigator>
  );
}

// Protected admin navigation tree
function AdminStack() {
  return (
    <AdminStackInstance.Navigator screenOptions={sharedHeaderOptions}>
      <AdminStackInstance.Screen
        name="AdminMainTabs"
        component={AdminTabs}
        options={{ headerShown: false }}
      />
    </AdminStackInstance.Navigator>
  );
}

// Root navigator chooses between splash, auth flow, and signed-in flow based on auth state and role.
function RootNavigationContent() {
  const { isLoggedIn, loading, user } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {isLoggedIn ? (
        user && user.role === 'admin' ? (
          <AdminStack />
        ) : (
          <AppStack />
        )
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}

export default function RootNavigator() {
  return (
    <AuthProvider>
      <RootNavigationContent />
    </AuthProvider>
  );
}
