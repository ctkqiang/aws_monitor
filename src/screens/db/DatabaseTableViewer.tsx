import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { SPACING, TYPOGRAPHY } from '@/theme/ThemeContext';
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

  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<Record<string, unknown>[] | null>(null);
  const [columns, setColumns] = React.useState<string[]>([]);
  const [isRunning, setIsRunning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastDuration, setLastDuration] = React.useState<number | null>(null);
  const [rowCount, setRowCount] = React.useState(0);

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
        setError(data.error || t('db.unknownError') || '查询失败');
      }

      addQueryHistory({
        query: query.trim(),
        connectionId: connection.id,
        connectionName: connection.remark || (connection.type === 'sqlite' ? connection.dbName : connection.host),
        executedAt: Date.now(),
        duration,
      });
      Logger.info(TAG, '查询已执行', { duration, success: data.success, rowCount: data.rowCount });
    } catch (e: any) {
      setError(e.message || t('db.queryFailed'));
      setLastDuration(Date.now() - startTime);
      Logger.logError(TAG, '查询执行失败', e);
    } finally {
      setIsRunning(false);
    }
  }, [query, isRunning, connection, addQueryHistory, t]);

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
            {connection.remark || (connection.type === 'sqlite' ? connection.dbName : connection.host)}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {connection.type === 'sqlite' ? `SQLite - ${connection.dbName}.sqlite` : `${connection.type} - ${connection.host}:${connection.port}`}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.proceduresBar}>
        <DatabaseStoreProcedureViewer connection={connection} />
      </View>

      <View style={styles.historyBar}>
        <HistorySQLQuery
          connectionId={connection.id}
          onSelectQuery={(q) => setQuery(q)}
        />
      </View>

      <View style={styles.editorContainer}>
        <SqlEditor
          value={query}
          onChangeText={setQuery}
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
  subtitle: { ...TYPOGRAPHY.monoSm, marginTop: 1 },
  proceduresBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  historyBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  editorContainer: {
    flex: 1,
    padding: SPACING.md,
  },
});
