import { useEffect, useRef } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

export default function LoadingScreen() {
  const pulse = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  return (
    <LinearGradient colors={['#F5F3FF', '#EDE9FE']} style={styles.container}>
      <View style={styles.logoWrap}>
        <View style={styles.logoMark}>
          <View style={styles.outerRing} />
          <View style={styles.innerDot} />
        </View>
        <Animated.Text style={[styles.wordmark, { opacity: pulse }]}>
          <Text style={styles.ampli}>ampli</Text>
          <Text style={styles.score}>score</Text>
        </Animated.Text>
      </View>
      <Text style={styles.tagline}>KNOW WHERE YOU STAND</Text>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoWrap: { alignItems: 'center', marginBottom: 16 },
  logoMark: { width: 64, height: 64, backgroundColor: '#EDE9FE', borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 2, borderColor: '#DDD6FE' },
  outerRing: { position: 'absolute', width: 36, height: 36, borderRadius: 18, borderWidth: 2.5, borderColor: '#7C3AED' },
  innerDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#7C3AED' },
  wordmark: { flexDirection: 'row', fontSize: 34, fontWeight: '700', letterSpacing: -0.5 },
  ampli: { color: '#1E1333', fontSize: 34, fontWeight: '700' },
  score: { color: '#7C3AED', fontSize: 34, fontWeight: '700' },
  tagline: { fontSize: 11, color: '#A78BFA', letterSpacing: 3, fontWeight: '600' },
})
