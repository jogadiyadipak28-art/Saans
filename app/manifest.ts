import type { MetadataRoute } from 'next'
export default function manifest(): MetadataRoute.Manifest {
  return { name: 'Saans', short_name: 'Saans', description: 'Practical air-quality guidance for your household.', start_url: '/', display: 'standalone', background_color: '#f7faf9', theme_color: '#087e73', lang: 'en', icons: [{ src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' }] }
}
