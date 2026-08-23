import { useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { StatusBar } from 'expo-status-bar'
import { Session } from '@supabase/supabase-js'
import * as SplashScreen from 'expo-splash-screen'
import * as Updates from 'expo-updates'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from './lib/supabase'
import LoginScreen from './app/LoginScreen'
import RegisterScreen from './app/RegisterScreen'
import DashboardScreen from './app/DashboardScreen'
import CoursesScreen from './app/CoursesScreen'
import GPAPlannerScreen from './app/GPAPlannerScreen'
import ProfessorsScreen from './app/ProfessorsScreen'
import ProfileScreen from './app/ProfileScreen'
import CourseDetailScreen from './app/CourseDetailScreen'
import SupportScreen from './app/SupportScreen'
import CalendarScreen from './app/CalendarScreen'
import AdminScreen from './app/AdminScreen'
import EditProfileScreen from './app/EditProfileScreen'
import BadgesScreen from './app/BadgesScreen'
import NotificationsScreen from './app/NotificationsScreen'
import PrivacySecurityScreen from './app/PrivacySecurityScreen'
import LoadingScreen from './app/LoadingScreen'

SplashScreen.preventAutoHideAsync()

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function MainTabs() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('profiles').select('is_admin').eq('id', user.id).single()
        if (active) setIsAdmin(!!data?.is_admin)
      } catch {
        // Not an admin, or offline. Either way the tab stays hidden.
      }
    })()
    return () => { active = false }
  }, [])

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
            Dashboard: { active: 'grid', inactive: 'grid-outline' },
            Courses: { active: 'book', inactive: 'book-outline' },
            Professors: { active: 'star', inactive: 'star-outline' },
            Calendar: { active: 'calendar', inactive: 'calendar-outline' },
            'GPA Planner': { active: 'trending-up', inactive: 'trending-up-outline' },
            Profile: { active: 'person', inactive: 'person-outline' },
            Admin: { active: 'shield-checkmark', inactive: 'shield-checkmark-outline' },
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
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="GPA Planner" component={GPAPlannerScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      {isAdmin && <Tab.Screen name="Admin" component={AdminScreen} />}
    </Tab.Navigator>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Updates land on the next launch by default, which means every change needs
  // two force quits to show up.
  //
  // Fast path: if the download finishes while the splash is still up, reload
  // immediately so the update is live in the same session.
  //
  // Slow path: on a bad connection the fetch can outlast that window. Rather
  // than falling back to "next cold start", the update is applied the next
  // time the app returns to the foreground. Leaving and coming back is enough,
  // and reloading on return is safe because the user isn't mid-gesture.
  useEffect(() => {
    const startedAt = Date.now()
    const AUTO_RELOAD_WINDOW_MS = 10000
    let pendingReload = false
    let cancelled = false

    async function syncUpdates() {
      if (__DEV__ || !Updates.isEnabled) return
      try {
        const check = await Updates.checkForUpdateAsync()
        if (!check.isAvailable || cancelled) return
        await Updates.fetchUpdateAsync()
        if (cancelled) return

        if (Date.now() - startedAt < AUTO_RELOAD_WINDOW_MS) {
          await Updates.reloadAsync()
        } else {
          pendingReload = true
        }
      } catch {
        // Offline, or the update server is unreachable. Keep running the
        // bundle we already have rather than blocking startup.
      }
    }

    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !pendingReload) return
      // Cleared first so a rapid background/foreground cycle can't fire twice.
      pendingReload = false
      Updates.reloadAsync().catch(() => {
        // If the reload fails, the update still applies on the next cold start.
      })
    })

    syncUpdates()

    return () => {
      cancelled = true
      sub.remove()
    }
  }, [])

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
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="CourseDetail"
              component={CourseDetailScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Support"
              component={SupportScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Badges"
              component={BadgesScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="PrivacySecurity"
              component={PrivacySecurityScreen}
              options={{ animation: 'slide_from_right' }}
            />
          </>
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
