import type { Language } from '@/shared/i18n/language'
import { wordsIn } from '@/shared/i18n/words'

import type { Group } from './types'
import { groupWords } from './words'

/**
 * A group's type in the screen's language: group_details' "1-to-2" in English, and in Chinese
 * "一对二", built from its size (the database writes the English one).
 */
export function typeLabelIn(group: Pick<Group, 'size' | 'type_label'>, language: Language): string {
  return language === 'en' ? group.type_label : wordsIn(groupWords, language).typeLabel(group.size)
}
