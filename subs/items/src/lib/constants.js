export const CLASSES = {
  DECORATION: 'Decoration',
  ACCESSORY: 'Accessory',
  LIGHT: 'Light',
  RECEPTACLE: 'Receptacle'
}

export const CLASS_TYPES = {
  [CLASSES.DECORATION]: ['Inflatable', 'Static Prop', 'Animatronic'],
  [CLASSES.ACCESSORY]: ['Plug', 'Cord', 'Adapter'],
  [CLASSES.LIGHT]: ['String Light', 'Spot Light'],
  [CLASSES.RECEPTACLE]: ['Outlet']
}

export const SEASONS = [
  'Halloween',
  'Christmas',
  'Easter',
  'Year-Round'
]

export const STATUSES = [
  'Active',
  'Retired',
  'Damaged',
  'Lost'
]

export const CONDITIONAL_FIELDS = {
  [CLASSES.DECORATION]: {
    'Inflatable': ['stakes', 'tethers', 'height_length'],
    'Static Prop': ['stakes', 'tethers', 'height_length'],
    'Animatronic': ['stakes', 'tethers', 'height_length']
  },
  [CLASSES.ACCESSORY]: {
    'Plug': ['male_ends', 'female_ends', 'length'],
    'Cord': ['male_ends', 'female_ends', 'length'],
    'Adapter': []
  },
  [CLASSES.LIGHT]: {
    'String Light': ['color', 'bulb_type', 'length'],
    'Spot Light': ['color', 'bulb_type']
  }
}

export const TAB_OPTIONS = [
  { value: 'decorations', label: 'Decorations', class: CLASSES.DECORATION },
  { value: 'accessories', label: 'Accessories', class: CLASSES.ACCESSORY },
  { value: 'lights', label: 'Lights', class: CLASSES.LIGHT }
]
