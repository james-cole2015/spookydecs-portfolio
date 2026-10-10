import {
  Ban,
  Bot,
  Cable,
  Flashlight,
  Ghost,
  Lightbulb,
  Projector,
  Skull,
  Sparkles,
  Split,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { GraphNodeData } from '../../lib/graphDerivation';

// SVG glyphs for graph nodes. Decorations are told apart by class_type; every other tier has
// one glyph per kind (light by sub-type), so the tier reads from shape + size + glyph.
const DECORATION_ICONS: Record<string, LucideIcon> = {
  Inflatable: Ghost,
  Animatronic: Bot,
  'Static Prop': Skull,
  Projection: Projector,
};

export function nodeIcon(data: Pick<GraphNodeData, 'kind' | 'classType'>): LucideIcon {
  switch (data.kind) {
    case 'hub':
      return Zap;
    case 'light':
      return data.classType === 'Spot Light' ? Flashlight : Lightbulb;
    case 'branch':
      return Split;
    case 'cord':
      return Cable;
    case 'placeholder':
      return Ban;
    default:
      return DECORATION_ICONS[data.classType || ''] || Sparkles;
  }
}
