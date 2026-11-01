import { extendTailwindMerge } from 'tailwind-merge'

/**
 * Class merge for the owned UI layer: tailwind-merge with the same extra class
 * groups flowbite-react registered, so a caller's `className` overrides the
 * defaults the way it always has.
 */
export const cn = extendTailwindMerge({
  extend: {
    classGroups: {
      'bg-image': [
        'bg-arrow-down-icon',
        'bg-check-icon',
        'bg-dash-icon',
        'bg-dot-icon',
      ],
      shadow: ['shadow-sm-light'],
    },
  },
})
