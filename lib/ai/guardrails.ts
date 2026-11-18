import type { Lang } from '@/lib/i18n'

const SEVERE =
  /breathless|chest pain|cannot breathe|can't breathe|blue lips|unconscious|gasping|सांस नहीं|सीने में दर्द|શ્વાસ લઈ શકત/i
const MEDICAL = /diagnos|prescri|medication|antibiotic|which tablet|inhaler dose|दवाई की खुराक|ગોળીની માત્રા/i
const OFF_TOPIC = /\b(stock tip|bitcoin|crypto wallet|sql injection|write python|hack this)\b/i

const COPY: Record<Lang, { escalate: string; refuseMedical: string; refuseScope: string }> = {
  en: {
    escalate:
      'If someone is severely breathless, has chest pain, blue lips, or is hard to wake, seek emergency care now. Saans cannot assess a medical emergency. This is general information, not medical advice.',
    refuseMedical:
      'Saans cannot diagnose an illness or recommend medicine. For symptoms, talk to a clinician. This is general information, not medical advice.',
    refuseScope: 'Saans answers questions about air, daily routines, travel, and indoor air. This is general information, not medical advice.',
  },
  hi: {
    escalate:
      'अगर किसी को तेज साँस फूल रही हो, सीने में दर्द हो, होंठ नीले हों, या होश कम हो, तुरंत आपातकालीन मदद लें। सांस चिकित्सा आपात स्थिति नहीं जाँच सकता। यह सामान्य जानकारी है, चिकित्सा सलाह नहीं।',
    refuseMedical: 'सांस बीमारी का निदान या दवा की सलाह नहीं दे सकता। लक्षणों के लिए चिकित्सक से बात करें। यह सामान्य जानकारी है, चिकित्सा सलाह नहीं।',
    refuseScope: 'सांस हवा, दिनचर्या, सफर और घर की हवा के बारे में जवाब देता है। यह सामान्य जानकारी है, चिकित्सा सलाह नहीं।',
  },
  gu: {
    escalate:
      'જો કોઈને ખૂબ શ્વાસ ચડે, છાતીમાં દુખાવો થાય, હોઠ વાદળી થાય, અથવા ભાન ઓછું થાય, તરત ઇમરજન્સી મદદ લો. સાંસ તબીબી કટોકટી તપાસી શકતું નથી. આ સામાન્ય માહિતી છે, તબીબી સલાહ નથી.',
    refuseMedical: 'સાંસ બીમારીનું નિદાન અથવા દવાની સલાહ આપતું નથી. લક્ષણો માટે તબીબ સાથે વાત કરો. આ સામાન્ય માહિતી છે, તબીબી સલાહ નથી.',
    refuseScope: 'સાંસ હવા, દિનચર્યા, મુસાફરી અને ઘરની હવા વિશે જવાબ આપે છે. આ સામાન્ય માહિતી છે, તબીબી સલાહ નથી.',
  },
}

export function guardMessage(
  message: string,
  lang: Lang,
): { action: 'allow' } | { action: 'escalate' | 'refuse'; message: string } {
  if (SEVERE.test(message)) return { action: 'escalate', message: COPY[lang].escalate }
  if (MEDICAL.test(message)) return { action: 'refuse', message: COPY[lang].refuseMedical }
  if (OFF_TOPIC.test(message)) return { action: 'refuse', message: COPY[lang].refuseScope }
  return { action: 'allow' }
}
