import React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from './src/auth'
import { Login } from './src/screens/Login'
import { Navigasi } from './src/nav'
import { c } from './src/theme'

function Akar() {
  const { pengguna, siap } = useAuth()
  if (!siap) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: c.navy }}><ActivityIndicator color={c.emas} /></View>
  return pengguna ? <NavigationContainer><Navigasi /></NavigationContainer> : <Login />
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider><Akar /></AuthProvider>
    </SafeAreaProvider>
  )
}
