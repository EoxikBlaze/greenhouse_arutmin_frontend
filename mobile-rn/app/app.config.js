// GARAP_CLEARTEXT=1 hanya untuk uji lokal ke gateway http://10.0.2.2; rilis wajib HTTPS.
module.exports = {
  expo: {
    name: 'GARAP Petani',
    slug: 'garap-petani',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    android: { package: 'net.garap.petani' },
    plugins: ['expo-secure-store'],
  },
}
