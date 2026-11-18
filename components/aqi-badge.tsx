import { categoryKey } from '@/lib/i18n'
import type { AqiResult } from '@/lib/engine/aqi'
import type { CpcbCategoryId } from '@/lib/engine/constants'

const CATEGORY_CLASS: Record<CpcbCategoryId, string> = {
  good: 'bg-[#0c6b3e] text-white',
  satisfactory: 'bg-[#2f6f12] text-white',
  moderate: 'bg-[#6b5300] text-white',
  poor: 'bg-[#8a3d00] text-white',
  'very-poor': 'bg-[#8d1c1c] text-white',
  severe: 'bg-[#5c1020] text-white',
}

export function AqiBadge({ aqi, label }: { aqi: AqiResult; label: string }) {
  return (
    <p
      className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2 font-semibold ${CATEGORY_CLASS[aqi.category]}`}
    >
      <AqiIcon name={aqi.icon} />
      <span>
        {label}. {aqi.label}. AQI {aqi.aqi}
      </span>
    </p>
  )
}

export function categoryPath(aqi: AqiResult): string {
  return categoryKey(aqi.category)
}

function AqiIcon({ name }: { name: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      {name === 'clear' ? <circle cx="12" cy="12" r="4" /> : null}
      {name === 'leaf' ? <path d="M5 19c8 0 12-8 14-14-6 2-14 6-14 14Z" /> : null}
      {name === 'cloud' ? <path d="M7 17h10a4 4 0 0 0 0-8 5 5 0 0 0-9-2A4 4 0 0 0 7 17Z" /> : null}
      {name === 'mask' ? <path d="M4 10c4 6 12 6 16 0v4c-4 4-12 4-16 0v-4Z" /> : null}
      {name === 'alert' || name === 'severe' ? <path d="M12 4 3 20h18L12 4Zm0 6v4m0 3h.01" /> : null}
    </svg>
  )
}
