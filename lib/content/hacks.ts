import type { BudgetLevel } from '@/lib/engine/constants'
import type { Lang } from '@/lib/i18n'

export type HackId = 'seal' | 'mop' | 'cook' | 'mask' | 'diy' | 'purifier'

export type Hack = {
  id: HackId
  title: string
  body: string
  fitsBudget: boolean
  engineFieldsUsed: string[]
}

const RANK: Record<BudgetLevel, number> = { none: 0, low: 1, medium: 2, high: 3 }

export function buildHacks(input: { budget: BudgetLevel; purifierOwned: boolean; language: Lang }): Hack[] {
  const copy = HACK_COPY[input.language]
  const hacks: Hack[] = [
    { id: 'seal', ...copy.seal, fitsBudget: true, engineFieldsUsed: ['indoor.sealed.central'] },
    { id: 'mop', ...copy.mop, fitsBudget: true, engineFieldsUsed: ['indoor.now.central'] },
    { id: 'cook', ...copy.cook, fitsBudget: true, engineFieldsUsed: ['indoor.now.central'] },
    { id: 'mask', ...copy.mask, fitsBudget: true, engineFieldsUsed: ['scenario.exposure.central'] },
    {
      id: 'diy',
      ...copy.diy,
      fitsBudget: RANK[input.budget] >= RANK.low,
      engineFieldsUsed: ['indoor.diy.central'],
    },
  ]
  if (!input.purifierOwned && input.budget === 'high') {
    hacks.push({ id: 'purifier', ...copy.purifier, fitsBudget: true, engineFieldsUsed: ['scenario.exposure.central'] })
  }
  return hacks
}

export const HACK_COPY: Record<Lang, Record<HackId, { title: string; body: string }>> = {
  en: {
    seal: { title: 'Seal the gaps', body: 'Tape the largest window gaps. This costs nothing and does not assume you can buy a purifier.' },
    mop: { title: 'Damp mop', body: 'Use a damp cloth so dust does not go back into the air.' },
    cook: { title: 'Cook with the fan you have', body: 'Run the exhaust or chimney you already own. Keep the bedroom door shut while the pan is hot.' },
    mask: { title: 'Mask only when you are outside', body: 'If you cannot buy masks, stay indoors in the worst hours. A mask does not clean the room.' },
    diy: { title: 'Box-fan filter, only if you already own a fan', body: 'Tape a filter to a fan you already have. This is not a shopping list for a new purifier.' },
    purifier: { title: 'A purifier is optional at your budget', body: 'If you buy one, match the clean-air rate to the room. The brand is not the figure that matters.' },
  },
  hi: {
    seal: { title: 'दरारें बंद करें', body: 'बड़ी खिड़की की दरारों पर टेप लगाएँ। इसमें प्यूरिफायर खरीदने की ज़रूरत नहीं।' },
    mop: { title: 'गीला पोछा', body: 'गीले कपड़े से पोंछें ताकि धूल फिर हवा में न उड़े।' },
    cook: { title: 'जो पंखा है उसी से खाना बनाएँ', body: 'जो एग्जॉस्ट या चिमनी पहले से है उसे चलाएँ। तवा गर्म हो तो बेडरूम का दरवाज़ा बंद रखें।' },
    mask: { title: 'मास्क सिर्फ बाहर', body: 'अगर मास्क नहीं खरीद सकते तो सबसे खराब घंटों में अंदर रहें। मास्क कमरे को साफ नहीं करता।' },
    diy: { title: 'बॉक्स-फैन फिल्टर, अगर पंखा पहले से हो', body: 'जो पंखा पहले से है उस पर फिल्टर लगाएँ। यह नया प्यूरिफायर खरीदने की सूची नहीं है।' },
    purifier: { title: 'आपके बजट पर प्यूरिफायर वैकल्पिक है', body: 'अगर खरीदें तो कमरे के हिसाब से साफ हवा की दर देखें। ब्रांड वह आंकड़ा नहीं है।' },
  },
  gu: {
    seal: { title: 'તડો બંધ કરો', body: 'મોટી બારીની તડો પર ટેપ લગાવો. આમાં પ્યુરિફાયર ખરીદવાની જરૂર નથી.' },
    mop: { title: 'ભીનું પોતું', body: 'ભીના કપડાથી લૂછો જેથી ધૂળ ફરી હવામાં ન ઊડે.' },
    cook: { title: 'જે પંખો હોય તેથી રસોઈ કરો', body: 'જે એક્ઝોસ્ટ અથવા ચીમની પહેલેથી હોય તે ચલાવો. તવો ગરમ હોય ત્યારે બેડરૂમનો દરવાજો બંધ રાખો.' },
    mask: { title: 'માસ્ક ફક્ત બહાર', body: 'જો માસ્ક ન ખરીદી શકો તો સૌથી ખરાબ કલાકોમાં અંદર રહો. માસ્ક ઓરડાને સાફ નથી કરતો.' },
    diy: { title: 'બોક્સ-ફેન ફિલ્ટર, જો પંખો પહેલેથી હોય', body: 'જે પંખો પહેલેથી હોય તેના પર ફિલ્ટર લગાવો. આ નવું પ્યુરિફાયર ખરીદવાની યાદી નથી.' },
    purifier: { title: 'તમારા બજેટે પ્યુરિફાયર વૈકલ્પિક છે', body: 'જો ખરીદો તો ઓરડા પ્રમાણે સ્વચ્છ હવાનો દર જુઓ. બ્રાન્ડ તે આંકડો નથી.' },
  },
}
