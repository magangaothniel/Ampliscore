import { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { StatusBar } from 'expo-status-bar'
import { Text } from 'react-native'
import { Session } from '@supabase/supabase-js'
import * as SplashScreen from 'expo-splash-screen'
import { supabase } from './lib/supabase'
import LoginScreen from './app/LoginScreen'
import RegisterScreen from './app/RegisterScreen'
import DashboardScreen from './app/DashboardScreen'
import CoursesScreen from './app/CoursesScreen'
import ProfileScreen from './app/ProfileScreen'
import LoadingScreen from './app/LoadingScreen'

SplashScreen.preventAutoHideAsync()

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: '📊',
    Courses: '📚',
    Professors: '⭐',
    'GPA Planner': '📈',
    Profile: '👤',
  }
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.4 }}>
      {icons[label] || '📱'}
    </Text>
  )
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => <TabIcon label={route.name} focused={focused} />,
        tabBarLabel: ({ focused }) => (
          <Text style={{
            fontSize: 10,
            fontWeight: focused ? '700' : '400',
            color: focused ? '#7C3AED' : '#9CA3AF',
            marginBottom: 4,
          }}>
            {route.name}
          </Text>
        ),
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#F5F3FF',
          borderTopWidth: 1,
          height: 85,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: '#9CA3AF',
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Courses" component={CoursesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      SplashScreen.hideAsync()
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  if (loading) return <LoadingScreen />

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {session ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
