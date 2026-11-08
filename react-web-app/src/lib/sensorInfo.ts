/** Label ramah + satuan per kunci sensor; kunci data (ESP32) tidak diubah. */
export const SENSOR_INFO: Record<string, { label: string; satuan: string }> = {
  humidity: { label: 'Kelembapan', satuan: '%' },
  airTemp: { label: 'Suhu udara', satuan: '°C' },
  tds: { label: 'TDS', satuan: 'ppm' },
  ph: { label: 'pH', satuan: '' },
  waterTemp: { label: 'Suhu air', satuan: '°C' },
}
