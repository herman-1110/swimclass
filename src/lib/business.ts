/**
 * The business name on signed-out pages (login, sign-up, forgot, reset). They always use
 * this constant, because `get_public_settings()` needs a signed-in account
 * (TECH_SPEC §5.4). Signed-in pages read `get_public_settings().business_name` instead;
 * later prompts switch them over. Same as the settings default (TECH_SPEC §3).
 */
export const DEFAULT_BUSINESS_NAME = 'Swim Class'
