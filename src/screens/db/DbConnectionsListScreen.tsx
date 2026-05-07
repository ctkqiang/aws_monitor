import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { useDbStore, DbConnection } from '@/stores/dbStore';
import { Haptic } from '@/utils/haptics';
import RipplePressable from '@/components/RipplePressable';

interface Props {
  onBack: () => void;
  onAdd: () => void;
  onEdit: (c: DbConnection) => void;
  onConnect: (c: DbConnection) => void;
}

const DB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  mysql: 'server',
  postgresql: 'logo-electron',
  questdb: 'flash',
  sqlite: 'file-tray-full',
};

export default function DbConnectionsListScreen({ onBack, onAdd, onEdit, onConnect }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const connections = useDbStore((s) => s.connections);
  const removeConnection = useDbStore((s) => s.removeConnection);

  const handleDelete = (c: DbConnection) => {
    Haptic.warning();
    Alert.alert(t('db.deleteConfirm'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: () => removeConnection(c.id),
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <RipplePressable onPress={onBack}>
          <View style={styles.backRow}>
            <Ionicons name="chevron-back" size={20} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent }]}>{t('common.back')}</Text>
          </View>
        </RipplePressable>
        <Text style={[styles.title, { color: theme.text }]}>{t('db.title')}</Text>
        <RipplePressable onPress={onAdd}>
          <View style={[styles.addBtn, { backgroundColor: theme.accent }]}>
            <Ionicons name="add" size={20} color={theme.accentText} />
          </View>
        </RipplePressable>
      </View>

      <FlatList
        data={connections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="server-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>暂无数据库连接</Text>
            <RipplePressable onPress={onAdd}>
              <View style={[styles.emptyBtn, { backgroundColor: theme.accent }]}>
                <Ionicons name="add" size={16} color={theme.accentText} style={{ marginRight: SPACING.xs }} />
                <Text style={[styles.emptyBtnText, { color: theme.accentText }]}>{t('db.addConnection')}</Text>
              </View>
            </RipplePressable>
          </View>
        }
        renderItem={({ item }) => (
          <RipplePressable onPress={() => { Haptic.light(); onConnect(item); }}>
            <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.borderLight }, SHADOWS.md]}>
              <View style={[styles.cardIcon, { backgroundColor: item.type === 'sqlite' ? theme.infoLight : theme.accentLight }]}>
                <Ionicons name={DB_ICONS[item.type] || 'server'} size={22} color={item.type === 'sqlite' ? theme.info : theme.accent} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>
                  {item.remark || `${item.type} - ${item.host}`}
                </Text>
                <Text style={[styles.cardMeta, { color: theme.textMuted }]}>
                  {item.type}  {item.host}:{item.port}
                </Text>
                {item.dbName ? (
                  <Text style={[styles.cardDb, { color: theme.textSecondary }]}>
                    DB: {item.dbName}
                  </Text>
                ) : null}
              </View>
              <View style={styles.cardActions}>
                <RipplePressable onPress={() => onEdit(item)} haptic="light">
                  <Ionicons name="create-outline" size={18} color={theme.textMuted} style={{ marginBottom: SPACING.sm }} />
                </RipplePressable>
                <RipplePressable onPress={() => handleDelete(item)} haptic="light">
                  <Ionicons name="trash-outline" size={18} color={theme.danger} />
                </RipplePressable>
              </View>
            </View>
          </RipplePressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  backText: { ...TYPOGRAPHY.bodyBold },
  title: { ...TYPOGRAPHY.title, fontSize: 15 },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  list: { padding: SPACING.lg },
  empty: { alignItems: 'center', paddingVertical: SPACING.xxxl * 2 },
  emptyText: { ...TYPOGRAPHY.body, marginTop: SPACING.md, marginBottom: SPACING.lg },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
    borderRadius: RADIUS.xl,
  },
  emptyBtnText: { ...TYPOGRAPHY.button },
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: RADIUS.xl, borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.lg, marginBottom: SPACING.md,
  },
  cardIcon: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md,
  },
  cardInfo: { flex: 1 },
  cardName: { ...TYPOGRAPHY.bodyBold, marginBottom: 2 },
  cardMeta: { ...TYPOGRAPHY.monoSm },
  cardDb: { ...TYPOGRAPHY.monoSm, marginTop: 1 },
  cardActions: { alignItems: 'center', marginLeft: SPACING.sm },
});
