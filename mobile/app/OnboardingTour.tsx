import type React from 'react'
import { useState } from 'react'
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const { width } = Dimensions.get('window')

type Step = {
  icon: React.ComponentProps<typeof Ionicons>['name']
  title: string
  body: string
}

// Mirrors the six web tour steps, minus the emoji (mobile uses Ionicons) and
// minus the navbar step, which has no mobile equivalent.
const STEPS: Step[] = [
  {
    icon: 'grid',
    title: 'Your dashboard',
    body: 'Your overall GPA, at-risk courses, and a summary of every class in one place.',
  },
  {
    icon: 'book',
    title: 'Courses',
    body: 'Add your classes and assignment weights once. Your real grade stays up to date from there.',
  },
  {
    icon: 'star',
    title: 'Professor ratings',
    body: 'Rate your professors and read honest reviews from other students at your school.',
  },
  {
    icon: 'trending-up',
    title: 'GPA planner',
    body: 'Run what-if scenarios and see exactly what you need on the next exam to hit your goal.',
  },
  {
    icon: 'person',
    title: 'Your profile',
    body: 'Manage your account, share your referral code, and get help when you need it.',
  },
]

export default function OnboardingTour({
  visible,
  onDone,
}: {
  visible: boolean
  onDone: () => void
}) {
  const [i, setI] = useState(0)
  const step = STEPS[i]
  const last = i === STEPS.length - 1

  function next() {
    if (last) {
      onDone()
    } else {
      setI(i + 1)
    }
  }

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onDone}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.skip} onPress={onDone} hitSlop={12}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <View style={styles.iconWrap}>
            <Ionicons name={step.icon} size={38} color="#7C3AED" />
          </View>

          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>

          <View style={styles.dots}>
            {STEPS.map((_, n) => (
              <View key={n} style={[styles.dot, n === i && styles.dotActive]} />
            ))}
          </View>

          <TouchableOpacity style={styles.cta} onPress={next}>
            <Text style={styles.ctaText}>{last ? 'Get started' : 'Next'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30,19,51,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: Math.min(width - 48, 380), backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center' },
  skip: { position: 'absolute', top: 16, right: 18 },
  skipText: { fontSize: 14, color: '#8E88A3' },
  iconWrap: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#1E1333', textAlign: 'center', marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 22, color: '#5B5470', textAlign: 'center', marginBottom: 24 },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E9D5FF' },
  dotActive: { backgroundColor: '#7C3AED', width: 20 },
  cta: { backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 15, alignItems: 'center', alignSelf: 'stretch' },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
