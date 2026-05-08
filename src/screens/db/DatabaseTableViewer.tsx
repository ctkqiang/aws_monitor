import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  FlatList, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { useDbStore, DbConnection } from '@/stores/dbStore';
import { Haptic } from '@/utils/haptics';
import { Logger } from '@/utils/logger';
import RipplePressable from '@/components/RipplePressable';
import DatabaseStoreProcedureViewer from './DatabaseStoreProcedureViewer';
import HistorySQLQuery from './HistorySQLQuery';
import { executeQuery } from '@/services/db/client';
import { DbConnectionConfig } from '@/services/db/types';

const TAG = 'DBTableViewer';

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
  'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'JOIN', 'LEFT',
  'RIGHT', 'INNER', 'OUTER', 'ON', 'GROUP', 'BY', 'ORDER', 'ASC', 'DESC',
  'LIMIT', 'OFFSET', 'HAVING', 'UNION', 'ALL', 'DISTINCT', 'AS', 'AND',
  'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'COUNT',
  'SUM', 'AVG', 'MAX', 'MIN', 'SHOW', 'TABLES', 'DATABASES', 'USE', 'DESCRIBE',
];

const SQL_FUNCTIONS = [
  'COUNT(', 'SUM(', 'AVG(', 'MAX(', 'MIN(', 'COALESCE(', 'NULLIF(',
  'UPPER(', 'LOWER(', 'TRIM(', 'LENGTH(', 'NOW(', 'CURRENT_TIMESTAMP',
];

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
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const getAutocomplete = (text: string) => {
    if (!text) return [];
    const lastWord = text.split(/[\s,;()]+/).pop()?.toUpperCase() || '';
    if (!lastWord || lastWord.length < 1) return [];
    const kw = SQL_KEYWORDS.filter((k) => k.startsWith(lastWord)).slice(0, 6);
    const fn = SQL_FUNCTIONS.filter((f) => f.startsWith(lastWord)).slice(0, 3);
    return [...kw, ...fn];
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    const sug = getAutocomplete(text);
    setSuggestions(sug);
    setShowSuggestions(sug.length > 0 && text.length > 0);
  };

  const handleInsertSuggestion = (suggestion: string) => {
    const words = query.split(/(\s+)/);
    const lastNonSpace = words.filter(w => w.trim()).pop() || '';
    const lastIndex = query.lastIndexOf(lastNonSpace);
    const newQuery = query.substring(0, lastIndex) + suggestion + query.substring(lastIndex + lastNonSpace.length);
    setQuery(newQuery);
    setShowSuggestions(false);
    Haptic.selection();
  };

  const handleExecute = async () => {
    if (!query.trim() || isRunning) return;
    Haptic.medium();
    setIsRunning(true);
    setError(null);

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

      if (data.success && data.columns && data.rows) {
        setColumns(data.columns);
        setResults(data.rows);
      } else {
        setColumns(['error', 'detail']);
        setResults([{
          error: data.error || '未知错误',
          detail: data.errorCode || data.error || '查询失败',
        }] as any);
      }

      const duration = data.durationMs ?? (Date.now() - startTime);
      addQueryHistory({
        query: query.trim(),
        connectionId: connection.id,
        connectionName: connection.remark || connection.host,
        executedAt: Date.now(),
        duration,
      });
      Logger.info(TAG, '查询已执行', {
        duration,
        success: data.success,
        rowCount: data.rowCount,
      });
    } catch (e: any) {
      setError(e.message || '查询执行失败');
      Logger.logError(TAG, '查询执行失败', e);
    } finally {
      setIsRunning(false);
    }
  };

  const getRowCount = () => results?.length || 0;

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
            {connection.remark || connection.host}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {connection.type} - {connection.host}:{connection.port}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tableArea}>
        <View style={styles.tableHeader}>
          <Ionicons name="grid-outline" size={14} color={theme.accent} style={{ marginRight: SPACING.sm }} />
          <Text style={[styles.tableTitle, { color: theme.textLabel }]}>{t('db.results')}</Text>
          {results !== null && (
            <View style={[styles.rowChip, { backgroundColor: theme.accentLight }]}>
              <Text style={[styles.rowChipText, { color: theme.accent }]}>{getRowCount()} {t('db.rows')}</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          {results !== null && (
            <RipplePressable onPress={() => { setResults(null); setColumns([]); setError(null); }} haptic="light">
              <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
            </RipplePressable>
          )}
        </View>

        {isRunning ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.centerText, { color: theme.textMuted }]}>{t('db.executing')}</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="alert-circle" size={36} color={theme.danger} />
            <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
          </View>
        ) : results === null ? (
          <View style={styles.center}>
            <Ionicons name="terminal-outline" size={40} color={theme.textMuted} />
            <Text style={[styles.centerText, { color: theme.textMuted }]}>{t('db.noResults')}</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={[styles.tableHeader, { backgroundColor: theme.bgInput, borderBottomColor: theme.border, paddingVertical: SPACING.sm }]}>
                {columns.map((col) => (
                  <View key={col} style={[styles.colHeader, { borderRightColor: theme.border }]}>
                    <Text style={[styles.colHeaderText, { color: theme.accent }]} numberOfLines={1}>{col}</Text>
                  </View>
                ))}
              </View>
              <ScrollView style={styles.tableBody} nestedScrollEnabled>
                {results.map((row, i) => (
                  <View key={i} style={[styles.tableRow, { borderBottomColor: theme.border }, i % 2 === 0 && { backgroundColor: theme.bgInput + '40' }]}>
                    {columns.map((col) => (
                      <View key={col} style={[styles.colCell, { borderRightColor: theme.border }]}>
                        <Text style={[styles.cellText, { color: theme.text }]} numberOfLines={2}>
                          {String(row[col] ?? 'NULL')}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
        )}
      </View>

      <View style={[styles.middleBar, { borderTopColor: theme.border }]}>
        <DatabaseStoreProcedureViewer connection={connection} />
      </View>

      <View style={[styles.middleBar, { borderTopColor: theme.border }]}>
        <HistorySQLQuery
          connectionId={connection.id}
          onSelectQuery={(q) => {
            setQuery(q);
            handleQueryChange(q);
          }}
        />
      </View>

      <View style={[styles.cliArea, { backgroundColor: theme.cliBg, borderTopColor: theme.border }]}>
        {showSuggestions && suggestions.length > 0 && (
          <View style={[styles.suggestionBar, { backgroundColor: theme.bgInput, borderBottomColor: theme.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionScroll}>
              {suggestions.map((s) => (
                <RipplePressable key={s} onPress={() => handleInsertSuggestion(s)} haptic="selection">
                  <View style={[styles.suggestionChip, { backgroundColor: theme.accentLight, borderColor: theme.accent + '40' }]}>
                    <Text style={[styles.suggestionText, { color: theme.accent }]}>{s}</Text>
                  </View>
                </RipplePressable>
              ))}
            </ScrollView>
          </View>
        )}
        <View style={styles.cliRow}>
          <Text style={[styles.cliPrompt, { color: theme.cliAccent }]}>›</Text>
          <TextInput
            style={[styles.cliInput, { color: theme.cliText }]}
            value={query}
            onChangeText={handleQueryChange}
            placeholder="SELECT * FROM ..."
            placeholderTextColor={theme.placeholder + '60'}
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            cursorColor={theme.cliAccent}
            selectionColor={theme.cliAccent + '30'}
          />
          <RipplePressable onPress={handleExecute} disabled={isRunning || !query.trim()} accessibilityLabel={t('db.execute')}>
            <View style={[styles.executeBtn, { backgroundColor: (isRunning || !query.trim()) ? theme.btnSecondary : theme.accent }]}>
              {isRunning ? (
                <ActivityIndicator size="small" color={theme.btnSecondaryText} />
              ) : (
                <Ionicons name="play" size={16} color={query.trim() ? theme.accentText : theme.btnSecondaryText} />
              )}
            </View>
          </RipplePressable>
        </View>
      </View>
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
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: SPACING.md },
  title: { ...TYPOGRAPHY.title, fontSize: 13 },
  subtitle: { ...TYPOGRAPHY.monoSm, marginTop: 1 },
  tableArea: { flex: 1 },
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableTitle: { ...TYPOGRAPHY.label },
  rowChip: {
    marginLeft: SPACING.sm, paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  rowChipText: { ...TYPOGRAPHY.monoSm, fontWeight: '600' },
  tableBody: { maxHeight: 280 },
  tableRow: {
    flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colHeader: {
    width: 130, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  colHeaderText: { ...TYPOGRAPHY.monoSm, fontWeight: '700' },
  colCell: {
    width: 130, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  cellText: { ...TYPOGRAPHY.monoSm, fontSize: 12 },
  middleBar: { borderTopWidth: StyleSheet.hairlineWidth },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xxl },
  centerText: { ...TYPOGRAPHY.caption, marginTop: SPACING.sm },
  errorText: { ...TYPOGRAPHY.body, marginTop: SPACING.sm },
  cliArea: {
    borderTopWidth: 1, padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  suggestionBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  suggestionScroll: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  suggestionChip: {
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xs, borderWidth: StyleSheet.hairlineWidth,
  },
  suggestionText: { ...TYPOGRAPHY.monoSm, fontWeight: '600' },
  cliRow: {
    flexDirection: 'row', alignItems: 'flex-start',
  },
  cliPrompt: {
    fontSize: 15, fontWeight: '800' as const, lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginRight: SPACING.sm, marginTop: SPACING.xs,
  },
  cliInput: {
    flex: 1, fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.sm,
    maxHeight: 80, marginRight: SPACING.sm,
  },
  executeBtn: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
});
