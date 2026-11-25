import React from 'react'
import { View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { BerandaLayar } from './screens/Beranda'
import { SensorLayar } from './screens/Sensor'
import { KebunLayar } from './screens/Kebun'
import { OtomatisLayar } from './screens/Otomatis'
import { KalibrasiLayar } from './screens/Kalibrasi'
import { UjiLabLayar } from './screens/UjiLab'
import { CctvLayar } from './screens/Cctv'
import { PeringatanLayar } from './screens/Peringatan'
import { AsistenLayar } from './screens/Asisten'
import { LaporanLayar } from './screens/Laporan'
import { ProfilLayar } from './screens/Profil'
import { LainnyaLayar } from './screens/Lainnya'
import { c } from './theme'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()

const IKON = { Beranda: 'home', Sensor: 'activity', Kebun: 'sun', Menu: 'grid' } as const

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: c.forest,
        tabBarInactiveTintColor: c.abu,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        // Bilah pil melayang: pembeda tampilan dari web (sidebar) dengan bahasa desain yang sama.
        tabBarStyle: { position: 'absolute', left: 16, right: 16, bottom: 14, height: 64, borderRadius: 32, backgroundColor: '#fff', borderTopWidth: 0, paddingBottom: 8, paddingTop: 6, elevation: 8, shadowColor: '#0A1F38', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
        tabBarIcon: ({ color, focused }) => (
          <View style={{ backgroundColor: focused ? c.mint : 'transparent', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 3 }}>
            <Feather name={IKON[route.name as keyof typeof IKON]} size={20} color={color} />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Beranda" component={BerandaLayar} />
      <Tab.Screen name="Sensor" component={SensorLayar} />
      <Tab.Screen name="Kebun" component={KebunLayar} />
      <Tab.Screen name="Menu" component={LainnyaLayar as never} />
    </Tab.Navigator>
  )
}

export function Navigasi() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="Otomatis" component={OtomatisLayar as never} />
      <Stack.Screen name="Kalibrasi" component={KalibrasiLayar as never} />
      <Stack.Screen name="UjiLab" component={UjiLabLayar as never} />
      <Stack.Screen name="Cctv" component={CctvLayar as never} />
      <Stack.Screen name="Peringatan" component={PeringatanLayar as never} />
      <Stack.Screen name="Asisten" component={AsistenLayar as never} />
      <Stack.Screen name="Laporan" component={LaporanLayar as never} />
      <Stack.Screen name="Profil" component={ProfilLayar as never} />
    </Stack.Navigator>
  )
}
