import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { resolveDef } from '@/lib/attributes';
import { useGameStore } from '@/store/gameStore';
import { AttributeKey } from '@/types/game';

export function AttributeIcon({ attributeKey, size = 20 }: { attributeKey: AttributeKey; size?: number }) {
  const defs = useGameStore((s) => s.attributeDefs);
  const def = resolveDef(defs, attributeKey);
  return (
    <View style={[styles.wrap, { width: size * 1.9, height: size * 1.9, borderRadius: size, backgroundColor: `${def.color}22` }]}>
      <Ionicons name={def.icon as any} size={size} color={def.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
