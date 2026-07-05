import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { colors, fonts, spacing } from '@/constants/theme';
import { resolveDef } from '@/lib/attributes';
import { confirmDestructive } from '@/lib/confirm';
import { notifySuccess } from '@/lib/haptics';
import { useGameStore } from '@/store/gameStore';
import { AttributeKey } from '@/types/game';

const MAX_FOCUS = 3;

export default function SettingsScreen() {
  const profile = useGameStore((s) => s.profile);
  const updateFocusDomains = useGameStore((s) => s.updateFocusDomains);
  const resetAllData = useGameStore((s) => s.resetAllData);
  const importData = useGameStore((s) => s.importData);
  const attributeDefs = useGameStore((s) => s.attributeDefs);
  const attributeOrder = useGameStore((s) => s.attributeOrder);
  const fullState = useGameStore((s) => s);

  const [focusDomains, setFocusDomains] = useState<AttributeKey[]>(profile?.focusDomains ?? []);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  const activeKeys = useMemo(
    () => attributeOrder.filter((k) => attributeDefs[k] && !attributeDefs[k].archived),
    [attributeOrder, attributeDefs]
  );

  function toggleFocus(key: AttributeKey) {
    setFocusDomains((prev) => {
      let next: AttributeKey[];
      if (prev.includes(key)) next = prev.filter((k) => k !== key);
      else if (prev.length >= MAX_FOCUS) next = prev;
      else next = [...prev, key];
      updateFocusDomains(next);
      return next;
    });
  }

  async function exportData() {
    const payload = {
      profile: fullState.profile,
      attributes: fullState.attributes,
      attributeDefs: fullState.attributeDefs,
      attributeOrder: fullState.attributeOrder,
      events: fullState.events,
      quests: fullState.quests,
      streak: fullState.streak,
      wallet: fullState.wallet,
      habits: fullState.habits,
      dailies: fullState.dailies,
      rewards: fullState.rewards,
      inventory: fullState.inventory,
      challenge: fullState.challenge,
      unlockedPerks: fullState.unlockedPerks,
      spentAP: fullState.spentAP,
    };
    await Share.share({ message: JSON.stringify(payload) });
  }

  function runImport() {
    confirmDestructive(
      'Restore from backup?',
      'This replaces everything currently in the app with the backup data.',
      'Restore',
      () => {
        const ok = importData(importText);
        setImportStatus(ok ? 'ok' : 'error');
        if (ok) {
          notifySuccess();
          setImportText('');
        }
      }
    );
  }

  function confirmReset() {
    confirmDestructive(
      'Reset all data?',
      'This permanently deletes your Hunter profile, attributes, quests, and journal from this device. This cannot be undone.',
      'Delete Everything',
      () => {
        resetAllData();
        router.replace('/');
      }
    );
  }

  return (
    <ScreenContainer>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Settings',
          headerStyle: { backgroundColor: colors.bgBase },
          headerTintColor: colors.textPrimary,
        }}
      />

      <Card>
        <Text style={styles.sectionLabel}>HUNTER NAME</Text>
        <TextInput style={styles.input} value={profile?.name} editable={false} placeholderTextColor={colors.textMuted} />
        <Text style={styles.muted}>Name is set once during onboarding.</Text>
      </Card>

      <Card style={{ marginTop: spacing(4) }}>
        <Text style={styles.sectionLabel}>FOCUS DOMAINS</Text>
        <View style={styles.grid}>
          {activeKeys.map((key) => {
            const def = resolveDef(attributeDefs, key);
            const selected = focusDomains.includes(key);
            return (
              <PressableScale
                key={key}
                onPress={() => toggleFocus(key)}
                style={[styles.tile, selected ? { borderColor: def.color, backgroundColor: `${def.color}18` } : null]}
              >
                <Text style={[styles.tileText, selected ? { color: def.color } : null]}>{def.name}</Text>
              </PressableScale>
            );
          })}
        </View>
      </Card>

      <Card style={{ marginTop: spacing(4) }}>
        <Text style={styles.sectionLabel}>BACKUP</Text>
        <Text style={styles.muted}>Everything lives only on this device. Export a copy, or restore one on a new phone.</Text>
        <View style={{ marginTop: spacing(4), gap: spacing(3) }}>
          <Button variant="secondary" onPress={exportData}>
            <Ionicons name="download" size={16} color={colors.textPrimary} />
            <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Export My Data</Text>
          </Button>
          <TextInput
            style={[styles.input, { minHeight: 64, textAlignVertical: 'top' }]}
            placeholder="Paste a backup here to restore it"
            placeholderTextColor={colors.textMuted}
            value={importText}
            onChangeText={(t) => {
              setImportText(t);
              setImportStatus('idle');
            }}
            multiline
          />
          <Button variant="secondary" onPress={runImport} disabled={!importText.trim()}>
            <Ionicons name="cloud-upload" size={16} color={colors.textPrimary} />
            <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Restore From Backup</Text>
          </Button>
          {importStatus === 'ok' && <Text style={[styles.muted, { color: colors.success }]}>Backup restored.</Text>}
          {importStatus === 'error' && (
            <Text style={[styles.muted, { color: colors.danger }]}>That doesn't look like a valid backup.</Text>
          )}
        </View>
      </Card>

      <Card style={{ marginTop: spacing(4) }}>
        <Text style={styles.sectionLabel}>DANGER ZONE</Text>
        <Button variant="danger" onPress={confirmReset} style={{ marginTop: spacing(2) }}>
          Reset All Data
        </Button>
      </Card>

      <Text style={styles.about}>Game Life v3 — a local-first, honest progression system.</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    color: colors.textMuted,
    fontFamily: fonts.heading,
    fontSize: 12,
    letterSpacing: 1.5,
    marginBottom: spacing(3),
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderGlass,
    borderRadius: 10,
    padding: spacing(3),
    color: colors.textPrimary,
    backgroundColor: colors.bgSurfaceRaised,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing(2),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  tile: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    backgroundColor: colors.bgSurfaceRaised,
  },
  tileText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 12,
  },
  about: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing(6),
  },
});
