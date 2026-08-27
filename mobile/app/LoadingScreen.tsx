import { View, StyleSheet, Image } from 'react-native'

// Deliberately identical to the native splash: same asset, same width, same
// flat background. The native splash hides the moment the session resolves, so
// anything that differs here shows up as a flash. Keep them in step.
export default function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/splash-icon.png')}
        style={styles.lockup}
        resizeMode="contain"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
  },
  // 240 matches imageWidth in app.json; height keeps the asset's 748x719 ratio.
  lockup: { width: 240, height: 231 },
})
