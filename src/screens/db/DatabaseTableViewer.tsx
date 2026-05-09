import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { useDbStore, DbConnection } from '@/stores/dbStore';
import { Haptic } from '@/utils/haptics';
import { Logger } from '@/utils/logger';
import RipplePressable from '@/components/RipplePressable';
import SqlEditor from '@/components/SqlEditor';
import DatabaseStoreProcedureViewer from './DatabaseStoreProcedureViewer';
import HistorySQLQuery from './HistorySQLQuery';
import { executeQuery } from '@/services/db/client';
import { DbConnectionConfig } from '@/services/db/types';

const TAG = 'DBTableViewer';

interface Props {
  connection: DbConnection;
  onBack: () => void;
}

export default function DatabaseTableViewer({ connection, onBack }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const addQueryHistory = useDbStore((s) => s.addQueryHistory);
  const addSavedQuery = useDbStore((s) => s.addSavedQuery);
  const queryTabs = useDbStore((s) => s.queryTabs);
  const activeTabId = useDbStore((s) => s.activeTabId);
  const addQueryTab = useDbStore((s) => s.addQueryTab);
  const removeQueryTab = useDbStore((s) => s.removeQueryTab);
  const setActiveTab = useDbStore((s) => s.setActiveTab);
  const updateTabQuery = useDbStore((s) => s.updateTabQuery);

  const activeTab = React.useMemo(
    () => queryTabs.find((t) => t.id === activeTabId) || queryTabs[0],
    [queryTabs, activeTabId]
  );
  const [query, setQuery] = React.useState(activeTab?.query || '');
  const [results, setResults] = React.useState<Record<string, unknown>[] | null>(null);
  const [columns, setColumns] = React.useState<string[]>([]);
  const [isRunning, setIsRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastDuration, setLastDuration] = React.useState<number | null>(null);
  const [rowCount, setRowCount] = React.useState(0);

  const [showSaveModal, setShowSaveModal] = React.useState(false);
  const [saveName, setSaveName] = React.useState('');
  const [showSavedQueries, setShowSavedQueries] = React.useState(false);
  const [showProcedures, setShowProcedures] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const [transactionActive, setTransactionActive] = React.useState(false);

  const allSaved = useDbStore((s) => s.savedQueries);
  const savedQueries = React.useMemo(
    () => allSaved.filter((q) => q.connectionId === connection.id),
    [allSaved, connection.id]
  );

  React.useEffect(() => {
    setQuery(activeTab?.query || '');
  }, [activeTabId]);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (activeTabId) {
      updateTabQuery(activeTabId, text);
    }
  };

  const handleExecute = React.useCallback(async () => {
    if (!query.trim() || isRunning) return;
    Haptic.medium();
    setIsRunning(true);
    setError(null);
    setResults(null);
    setColumns([]);
    setLastDuration(null);
    setRowCount(0);

    const startTime = Date.now();

    try {
      const dbConfig: DbConnectionConfig = {
        id: connection.id,
        type: connection.type,
        host: connection.host,
        port: parseInt(connection.port, 10) || 3306,
        dbName: connection.dbName,
        username: connection.username,
        password: connection.password,
      };

      const data = await executeQuery(dbConfig, query.trim());
      const duration = data.durationMs ?? (Date.now() - startTime);
      setLastDuration(duration);

      if (data.success && data.columns && data.rows) {
        setColumns(data.columns);
        setResults(data.rows);
        setRowCount(data.rowCount);
      } else {
        setError(data.error || t('db.unknownError') || 'Query failed');
      }

      const upperQuery = query.trim().toUpperCase();
      if (upperQuery.startsWith('BEGIN') || upperQuery.startsWith('START TRANSACTION')) {
        setTransactionActive(true);
      } else if (upperQuery.startsWith('COMMIT') || upperQuery.startsWith('ROLLBACK')) {
        setTransactionActive(false);
      }

      addQueryHistory({
        query: query.trim(),
        connectionId: connection.id,
        connectionName:
          connection.remark || (connection.type === 'sqlite' ? connection.dbName : connection.host),
        executedAt: Date.now(),
        duration,
      });

      Logger.info(TAG, 'Query executed', { duration, success: data.success, rowCount: data.rowCount });
    } catch (e: any) {
      setError(e.message || t('db.queryFailed'));
      setLastDuration(Date.now() - startTime);
      Logger.logError(TAG, 'Query failed', e);
    } finally {
      setIsRunning(false);
    }
  }, [query, isRunning, connection, addQueryHistory, t]);

  const handleSaveQuery = () => {
    if (!saveName.trim() || !query.trim()) return;
    Haptic.medium();
    addSavedQuery({
      name: saveName.trim(),
      query: query.trim(),
      connectionId: connection.id,
      connectionName:
        connection.remark || (connection.type === 'sqlite' ? connection.dbName : connection.host),
    });
    setSaveName('');
    setShowSaveModal(false);
    Alert.alert('', t('common.saved') || 'Saved');
  };

  const handleSelectSaved = (q: typeof savedQueries[0]) => {
    Haptic.selection();
    handleQueryChange(q.query);
    setShowSavedQueries(false);
  };

  const handleSelectHistory = (sql: string) => {
    Haptic.selection();
    handleQueryChange(sql);
  };

  const handleNewTab = () => {
    Haptic.light();
    const id = addQueryTab();
    setActiveTab(id);
    setQuery('');
    setResults(null);
    setColumns([]);
    setError(null);
  };

  const handleSwitchTab = (id: string) => {
    Haptic.light();
    setActiveTab(id);
    const tab = queryTabs.find((t) => t.id === id);
    if (tab) {
      setQuery(tab.query);
    }
  };

  const handleCloseTab = (id: string) => {
    if (queryTabs.length <= 1) return;
    Haptic.light();
    removeQueryTab(id);
  };

  const displayTitle =
    connection.remark || (connection.type === 'sqlite' ? connection.dbName : connection.host);

  const displaySubtitle =
    connection.type === 'sqlite'
      ? `SQLite - ${connection.dbName}.sqlite`
      : `${connection.type} - ${connection.host}:${connection.port}`;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <RipplePressable onPress={onBack}>
          <View style={styles.backRow}>
            <Ionicons name="chevron-back" size={20} color={theme.accent} />
            <Text style={[styles.backText, { color: theme.accent }]}>{t('common.back')}</Text>
          </View>
        </RipplePressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {displayTitle}
          </Text>
          <View style={styles.subtitleRow}>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>{displaySubtitle}</Text>
            {transactionActive && (
              <View style={[styles.txBadge, { backgroundColor: theme.accentLight }]}>
                <Ionicons name="swap-horizontal" size={10} color={theme.accent} />
                <Text style={[styles.txBadgeText, { color: theme.accent }]}>TX</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.headerActions}>
          <RipplePressable onPress={handleNewTab} haptic="light">
            <Ionicons name="add-circle-outline" size={22} color={theme.accent} />
          </RipplePressable>
        </View>
      </View>

      <View style={[styles.tabBar, { backgroundColor: theme.bgInput, borderBottomColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
          {queryTabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <RipplePressable key={tab.id} onPress={() => handleSwitchTab(tab.id)} haptic="light">
                <View style={[
                  styles.tab,
                  { borderBottomColor: isActive ? theme.accent : 'transparent' },
                ]}>
                  <Ionicons
                    name={tab.isPinned ? 'pin' : 'document-text-outline'}
                    size={11}
                    color={isActive ? theme.accent : theme.textMuted}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={[styles.tabText, { color: isActive ? theme.text : theme.textMuted }]}
                    numberOfLines={1}
                  >
                    {tab.name}
                  </Text>
                  {tab.query.length > 0 && (
                    <View style={[styles.tabDot, { backgroundColor: theme.accent }]} />
                  )}
                  {queryTabs.length > 1 && (
                    <RipplePressable onPress={() => handleCloseTab(tab.id)} haptic="none">
                      <Ionicons name="close" size={12} color={theme.textMuted} style={{ marginLeft: 6 }} />
                    </RipplePressable>
                  )}
                </View>
              </RipplePressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={[styles.actionBar, { borderBottomColor: theme.border }]}>
        <RipplePressable onPress={() => { Haptic.light(); setShowSavedQueries(true); }}>
          <View style={styles.actionChip}>
            <Ionicons name="bookmark-outline" size={13} color={theme.accent} style={{ marginRight: 3 }} />
            <Text style={[styles.actionText, { color: theme.accent }]}>
              {savedQueries.length > 0 ? `${savedQueries.length} saved` : 'Saved'}
            </Text>
          </View>
        </RipplePressable>
        <RipplePressable onPress={() => { Haptic.light(); setShowHistory(true); }}>
          <View style={styles.actionChip}>
            <Ionicons name="time-outline" size={13} color={theme.textMuted} style={{ marginRight: 3 }} />
            <Text style={[styles.actionText, { color: theme.textMuted }]}>History</Text>
          </View>
        </RipplePressable>
        <RipplePressable onPress={() => { Haptic.light(); setShowProcedures(true); }}>
          <View style={styles.actionChip}>
            <Ionicons name="code-slash-outline" size={13} color={theme.textMuted} style={{ marginRight: 3 }} />
            <Text style={[styles.actionText, { color: theme.textMuted }]}>Procedures</Text>
          </View>
        </RipplePressable>
        {query.trim().length > 0 && (
          <RipplePressable onPress={() => { setSaveName(''); setShowSaveModal(true); }} haptic="light">
            <View style={styles.actionChip}>
              <Ionicons name="save-outline" size={13} color={theme.success} style={{ marginRight: 3 }} />
              <Text style={[styles.actionText, { color: theme.success }]}>Save</Text>
            </View>
          </RipplePressable>
        )}
      </View>

      <View style={styles.editorContainer}>
        <SqlEditor
          value={query}
          onChangeText={handleQueryChange}
          onExecute={handleExecute}
          isExecuting={isRunning}
          results={results}
          columns={columns}
          error={error}
          rowCount={rowCount}
          durationMs={lastDuration ?? undefined}
          placeholder={t('db.sqlPlaceholder') || 'SELECT * FROM ...'}
        />
      </View>

      <Modal visible={showSaveModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.bgCard }, SHADOWS.lg]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Save Query</Text>
            <TextInput
              style={[styles.modalInput, { color: theme.text, backgroundColor: theme.bgInput, borderColor: theme.border }]}
              value={saveName}
              onChangeText={setSaveName}
              placeholder="Query name..."
              placeholderTextColor={theme.placeholder}
              autoFocus
            />
            <Text style={[styles.modalPreview, { color: theme.textMuted }]} numberOfLines={3}>
              {query.trim()}
            </Text>
            <View style={styles.modalActions}>
              <RipplePressable onPress={() => setShowSaveModal(false)} haptic="light">
                <Text style={[styles.modalCancel, { color: theme.textMuted }]}>{t('common.cancel')}</Text>
              </RipplePressable>
              <RipplePressable onPress={handleSaveQuery} haptic="medium" disabled={!saveName.trim()}>
                <View style={[styles.modalSaveBtn, { backgroundColor: saveName.trim() ? theme.accent : theme.btnSecondary }]}>
                  <Text style={[styles.modalSaveText, { color: saveName.trim() ? theme.accentText : theme.btnSecondaryText }]}>
                    Save
                  </Text>
                </View>
              </RipplePressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSavedQueries} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.bgCard }, styles.modalFull, SHADOWS.lg]}>
            <View style={styles.modalHeader}>
              <Ionicons name="bookmark-outline" size={18} color={theme.accent} />
              <Text style={[styles.modalTitle, { color: theme.text, marginLeft: SPACING.sm }]}>Saved Queries</Text>
              <View style={{ flex: 1 }} />
              <RipplePressable onPress={() => setShowSavedQueries(false)} haptic="none">
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </RipplePressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              {savedQueries.length === 0 ? (
                <View style={styles.emptyModal}>
                  <Ionicons name="bookmark-outline" size={32} color={theme.textMuted} />
                  <Text style={[styles.emptyModalText, { color: theme.textMuted }]}>No saved queries yet</Text>
                </View>
              ) : (
                savedQueries.map((q) => (
                  <RipplePressable key={q.id} onPress={() => handleSelectSaved(q)} haptic="selection">
                    <View style={[styles.savedItem, { borderBottomColor: theme.border }]}>
                      <View style={styles.savedItemHeader}>
                        <Text style={[styles.savedItemName, { color: theme.text }]} numberOfLines={1}>
                          {q.name}
                        </Text>
                        <Text style={[styles.savedItemDate, { color: theme.textMuted }]}>
                          {new Date(q.updatedAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={[styles.savedItemQuery, { color: theme.textMuted }]} numberOfLines={2}>
                        {q.query}
                      </Text>
                    </View>
                  </RipplePressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showHistory} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.bgCard }, styles.modalFull, SHADOWS.lg]}>
            <View style={styles.modalHeader}>
              <Ionicons name="time-outline" size={18} color={theme.accent} />
              <Text style={[styles.modalTitle, { color: theme.text, marginLeft: SPACING.sm }]}>Query History</Text>
              <View style={{ flex: 1 }} />
              <RipplePressable onPress={() => setShowHistory(false)} haptic="none">
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </RipplePressable>
            </View>
            <HistorySQLQuery
              connectionId={connection.id}
              onSelectQuery={(sql) => {
                handleSelectHistory(sql);
                setShowHistory(false);
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showProcedures} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.bgCard }, styles.modalFull, SHADOWS.lg]}>
            <View style={styles.modalHeader}>
              <Ionicons name="code-slash-outline" size={18} color={theme.accent} />
              <Text style={[styles.modalTitle, { color: theme.text, marginLeft: SPACING.sm }]}>
                Stored Procedures
              </Text>
              <View style={{ flex: 1 }} />
              <RipplePressable onPress={() => setShowProcedures(false)} haptic="none">
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </RipplePressable>
            </View>
            <DatabaseStoreProcedureViewer connection={connection} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  backText: { ...TYPOGRAPHY.bodyBold },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: SPACING.md },
  title: { ...TYPOGRAPHY.title, fontSize: 13 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  subtitle: { ...TYPOGRAPHY.monoSm },
  txBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.xs,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: RADIUS.xs,
  },
  txBadgeText: { ...TYPOGRAPHY.monoSm, fontSize: 9, marginLeft: 2, fontWeight: '700' as const },
  headerActions: { width: 30, alignItems: 'center' },
  tabBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBarContent: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 2,
    maxWidth: 140,
  },
  tabText: { ...TYPOGRAPHY.monoSm, fontSize: 11 },
  tabDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 4 },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: SPACING.sm,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  actionText: { ...TYPOGRAPHY.monoSm, fontSize: 10 },
  editorContainer: {
    flex: 1,
    padding: SPACING.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalCard: {
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 400,
  },
  modalFull: {
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: { ...TYPOGRAPHY.bodyBold, fontSize: 15 },
  modalInput: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 14,
  },
  modalPreview: {
    ...TYPOGRAPHY.monoSm,
    marginTop: SPACING.sm,
    padding: SPACING.sm,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  modalCancel: { ...TYPOGRAPHY.body },
  modalSaveBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  modalSaveText: { ...TYPOGRAPHY.button },
  modalScroll: { flex: 1 },
  emptyModal: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyModalText: { ...TYPOGRAPHY.caption, marginTop: SPACING.sm },
  savedItem: {
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  savedItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  savedItemName: { ...TYPOGRAPHY.bodyBold, fontSize: 13 },
  savedItemDate: { ...TYPOGRAPHY.monoSm, fontSize: 10 },
  savedItemQuery: { ...TYPOGRAPHY.monoSm, fontSize: 11, lineHeight: 16 },
});
