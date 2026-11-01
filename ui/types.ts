/**
 * A known theme key with autocomplete, or any other string: flowbite-react typed
 * its color/size props this way, so a value the theme does not know renders
 * without that class group instead of failing to compile.
 */
export type DynamicStringEnumKeysOf<T extends object> = keyof T | (string & {})
