import { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { StatusBar } from 'expo-status-bar'
import { Session } from '@supabase/supabase-js'
import * as SplashScreen from 'expo-splash-screen'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from './lib/supabase'
import LoginScreen from './app/LoginScreen'
import RegisterScreen from './app/RegisterScreen'
import DashboardScreen from './app/DashboardScreen'
import CoursesScreen from './app/CoursesScreen'
import GPAPlannerScreen from './app/GPAPlannerScreen'
import ProfessorsScreen from './app/ProfessorsScreen'
import ProfileScreen from './app/ProfileScreen'
import LoadingScreen from './app/LoadingScreen'

SplashScreen.preventAutoHideAsync()

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
            Dashboard: { active: 'grid', inactive: 'grid-outline' },
            Courses: { active: 'book', inactive: 'book-outline' },
            Professors: { active: 'star', inactive: 'star-outline' },
            'GPA Planner': { active: 'trending-up', inactive: 'trending-up-outline' },
            Profile: { active: 'person', inactive: 'person-outline' },
          }
          const icon = icons[route.name]
          return <Ionicons name={focused ? icon.active : icon.inactive} size={22} color={color} />
        },
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#F0EBFF',
          borderTopWidth: 1,
          height: 85,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Courses" component={CoursesScreen} />
      <Tab.Screen name="Professors" component={ProfessorsScreen} />
      <Tab.Screen name="GPA Planner" component={GPAPlannerScreen} />
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
