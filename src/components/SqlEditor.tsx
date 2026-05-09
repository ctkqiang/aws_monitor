import React from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  ActivityIndicator, Platform, Alert, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACING, SHADOWS, TYPOGRAPHY } from '@/theme/ThemeContext';
import { Haptic } from '@/utils/haptics';
import RipplePressable from './RipplePressable';

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET',
  'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'INDEX', 'JOIN', 'LEFT',
  'RIGHT', 'INNER', 'OUTER', 'ON', 'GROUP', 'BY', 'ORDER', 'ASC', 'DESC',
  'LIMIT', 'OFFSET', 'HAVING', 'UNION', 'ALL', 'DISTINCT', 'AS', 'AND',
  'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'COUNT',
  'SUM', 'AVG', 'MAX', 'MIN', 'SHOW', 'TABLES', 'DATABASES', 'USE', 'DESCRIBE',
  'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'DEFAULT', 'CHECK', 'UNIQUE',
  'CASCADE', 'TRUNCATE', 'REPLACE', 'RENAME', 'ADD', 'COLUMN', 'MODIFY',
  'BEGIN', 'COMMIT', 'ROLLBACK', 'TRANSACTION', 'GRANT', 'REVOKE',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IF', 'WHILE', 'FOR',
  'RETURNS', 'FUNCTION', 'PROCEDURE', 'DECLARE', 'CURSOR', 'FETCH',
  'VIEW', 'TRIGGER', 'EXEC', 'EXECUTE', 'EXPLAIN', 'ANALYZE',
  'START', 'SAVEPOINT', 'RELEASE', 'LOCK', 'UNLOCK', 'CROSS',
  'NATURAL', 'USING', 'FULL', 'RECURSIVE', 'VALUES', 'RETURNING',
  'OVER', 'PARTITION', 'WINDOW', 'RANGE', 'ROWS', 'UNBOUNDED',
  'PRECEDING', 'FOLLOWING', 'CURRENT', 'ROW', 'FIRST', 'LAST',
];

const SQL_FUNCTIONS = [
  'COUNT(', 'SUM(', 'AVG(', 'MAX(', 'MIN(', 'COALESCE(', 'NULLIF(',
  'UPPER(', 'LOWER(', 'TRIM(', 'LENGTH(', 'NOW(', 'CURRENT_TIMESTAMP',
  'CONCAT(', 'SUBSTRING(', 'REPLACE(', 'ROUND(', 'ABS(', 'CAST(',
  'DATE(', 'TIME(', 'YEAR(', 'MONTH(', 'DAY(', 'HOUR(', 'IFNULL(',
  'GROUP_CONCAT(', 'DATE_FORMAT(', 'STR_TO_DATE(', 'DATEDIFF(',
];

const PAGE_SIZE = 100;

interface SqlEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  onExecute: () => void;
  onFormat?: () => void;
  onExport?: (format: 'csv' | 'json') => void;
  isExecuting: boolean;
  results: Record<string, unknown>[] | null;
  columns: string[];
  error: string | null;
  rowCount?: number;
  durationMs?: number;
  placeholder?: string;
}

function TokenizedText({ text, accentColor }: { text: string; accentColor: string }) {
  const parts: { text: string; isKeyword: boolean; isQuote: boolean; isNumber: boolean }[] = [];
  const regex = /('(?:[^'\\]|\\.)*')|("(?:[^"\\]|\\.)*")|(\b\d+\.?\d*\b)|(\b[A-Z_]{2,}\b)|([^'"A-Z_\d]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const [full, singleQuote, doubleQuote, number, keyword] = match;
    if (singleQuote || doubleQuote) {
      parts.push({ text: full, isKeyword: false, isQuote: true, isNumber: false });
    } else if (number) {
      parts.push({ text: full, isKeyword: false, isQuote: false, isNumber: true });
    } else if (keyword && SQL_KEYWORDS.includes(keyword.toUpperCase())) {
      parts.push({ text: full, isKeyword: true, isQuote: false, isNumber: false });
    } else if (keyword && SQL_FUNCTIONS.some((f) => f.startsWith(keyword.toUpperCase()))) {
      parts.push({ text: full, isKeyword: true, isQuote: false, isNumber: false });
    } else {
      parts.push({ text: full, isKeyword: false, isQuote: false, isNumber: false });
    }
  }
  if (parts.length === 0) {
    return <Text style={{ color: '#e0e0e0' }}>{text}</Text>;
  }
  return (
    <Text>
      {parts.map((part, i) => (
        <Text
          key={i}
          style={{
            color: part.isQuote ? '#98c379' : part.isNumber ? '#d19a66' : part.isKeyword ? accentColor : '#abb2bf',
          }}
        >
          {part.text}
        </Text>
      ))}
    </Text>
  );
}

function TokenizedInput({
  value, onChangeText, placeholder, placeholderColor, accentColor, textColor,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  placeholderColor: string;
  accentColor: string;
  textColor: string;
}) {
  const [isFocused, setIsFocused] = React.useState(false);

  if (!isFocused && !value) {
    return (
      <TextInput
        style={[styles.cliInput, { color: textColor }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        onFocus={() => setIsFocused(true)}
      />
    );
  }
  if (!value) {
    return (
      <TextInput
        style={[styles.cliInput, { color: textColor }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        onBlur={() => { if (!value) setIsFocused(false); }}
        autoFocus
      />
    );
  }
  return (
    <View style={styles.tokenOverlay}>
      <View style={styles.tokenLayer} pointerEvents="none">
        <TokenizedText text={value} accentColor={accentColor} />
      </View>
      <TextInput
        style={[styles.cliInput, styles.cliInputOverlay, { color: 'transparent' }]}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        autoFocus={isFocused}
        blurOnSubmit={false}
        returnKeyType="default"
      />
    </View>
  );
}

const EXPORT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  csv: 'document-text',
  json: 'code-slash',
};

function formatSql(sql: string): string {
  const upper = sql.trim().toUpperCase();
  const breakBefore = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'ORDER BY', 'GROUP BY',
    'HAVING', 'LIMIT', 'OFFSET', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN',
    'INNER JOIN', 'OUTER JOIN', 'CROSS JOIN', 'ON', 'SET', 'VALUES',
    'INSERT INTO', 'UPDATE', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE',
    'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT',
  ];
  let result = upper;
  for (const kw of breakBefore) {
    const regex = new RegExp(`\\b${kw}\\b`, 'gi');
    result = result.replace(regex, `\n${kw}`);
  }
  return result
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

export default function SqlEditor({
  value, onChangeText, onExecute, onFormat, onExport,
  isExecuting, results, columns, error, rowCount, durationMs,
  placeholder = 'SELECT * FROM ...',
}: SqlEditorProps) {
  const theme = useTheme();
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [page, setPage] = React.useState(0);
  const [showExportMenu, setShowExportMenu] = React.useState(false);
  const inputRef = React.useRef<TextInput>(null);

  const effectiveRowCount = rowCount ?? results?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(effectiveRowCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  const pagedResults = React.useMemo(() => {
    if (!results) return null;
    const start = safePage * PAGE_SIZE;
    return results.slice(start, start + PAGE_SIZE);
  }, [results, safePage]);

  const getAutocomplete = React.useCallback((text: string) => {
    if (!text) return [];
    const lastWord = text.split(/[\s,;()]+/).pop()?.toUpperCase() || '';
    if (!lastWord || lastWord.length < 1) return [];
    const kw = SQL_KEYWORDS.filter((k) => k.startsWith(lastWord)).slice(0, 10);
    const fn = SQL_FUNCTIONS.filter((f) => f.toUpperCase().startsWith(lastWord)).slice(0, 5);
    return [...kw, ...fn];
  }, []);

  const handleTextChange = (text: string) => {
    onChangeText(text);
    const sug = getAutocomplete(text);
    setSuggestions(sug);
    setShowSuggestions(sug.length > 0 && text.length > 0);
  };

  const handleInsertSuggestion = (suggestion: string) => {
    Haptic.selection();
    const words = value.split(/(\s+)/);
    const lastNonSpace = words.filter((w) => w.trim()).pop() || '';
    const lastIndex = value.lastIndexOf(lastNonSpace);
    onChangeText(
      value.substring(0, lastIndex) +
      suggestion +
      value.substring(lastIndex + lastNonSpace.length)
    );
    setShowSuggestions(false);
  };

  const handleExecute = () => {
    if (!value.trim() || isExecuting) return;
    Haptic.medium();
    setPage(0);
    onExecute();
  };

  const handleFormat = () => {
    if (!value.trim()) return;
    Haptic.light();
    if (onFormat) {
      onFormat();
    } else {
      onChangeText(formatSql(value));
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    if (!results || columns.length === 0) return;
    Haptic.medium();
    setShowExportMenu(false);
    if (onExport) {
      onExport(format);
      return;
    }
    try {
      let content: string;
      if (format === 'csv') {
        const header = columns.join(',');
        const body = results.map((row) =>
          columns.map((col) => {
            const val = row[col] === null ? 'NULL' : String(row[col]);
            return val.includes(',') || val.includes('"') || val.includes('\n')
              ? `"${val.replace(/"/g, '""')}"`
              : val;
          }).join(',')
        ).join('\n');
        content = header + '\n' + body;
      } else {
        content = JSON.stringify(results, null, 2);
      }
      await Share.share({ message: content, title: `query_results.${format}` });
    } catch {
      Alert.alert('Export', 'Failed to export results');
    }
  };

  const colWidth = React.useMemo(() => {
    if (columns.length === 0) return 130;
    const maxLen = Math.max(...columns.map((c) => c.length), 8);
    return Math.max(130, maxLen * 10 + 24);
  }, [columns]);

  const canExport = results !== null && results.length > 0;

  return (
    <View style={styles.container}>
      <View style={[styles.toolbar, { borderBottomColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarContent}>
          {value.trim().length > 0 && (
            <RipplePressable onPress={() => onChangeText('')} haptic="light">
              <View style={[styles.toolChip, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
                <Ionicons name="trash-outline" size={13} color={theme.textMuted} style={{ marginRight: 4 }} />
                <Text style={[styles.toolChipText, { color: theme.textMuted }]}>Clear</Text>
              </View>
            </RipplePressable>
          )}
          <RipplePressable onPress={handleFormat} haptic="light">
            <View style={[styles.toolChip, { backgroundColor: theme.bgInput, borderColor: theme.border }]}>
              <Ionicons name="code-outline" size={13} color={theme.accent} style={{ marginRight: 4 }} />
              <Text style={[styles.toolChipText, { color: theme.accent }]}>Format</Text>
            </View>
          </RipplePressable>
          {canExport && (
            <RipplePressable onPress={() => setShowExportMenu(true)} haptic="light">
              <View style={[styles.toolChip, { backgroundColor: theme.successLight, borderColor: theme.success + '40' }]}>
                <Ionicons name="download-outline" size={13} color={theme.success} style={{ marginRight: 4 }} />
                <Text style={[styles.toolChipText, { color: theme.success }]}>Export</Text>
              </View>
            </RipplePressable>
          )}
        </ScrollView>
        <RipplePressable onPress={handleExecute} disabled={isExecuting || !value.trim()} haptic={isExecuting ? 'none' : 'medium'}>
          <View style={[
            styles.runBtn,
            { backgroundColor: (isExecuting || !value.trim()) ? theme.btnSecondary : theme.accent },
          ]}>
            {isExecuting ? (
              <ActivityIndicator size="small" color={theme.btnSecondaryText} />
            ) : (
              <>
                <Ionicons name="play" size={14} color={value.trim() ? theme.accentText : theme.btnSecondaryText} />
                <Text style={[styles.runBtnText, { color: value.trim() ? theme.accentText : theme.btnSecondaryText }]}>
                  Run
                </Text>
              </>
            )}
          </View>
        </RipplePressable>
      </View>

      {showExportMenu && (
        <View style={[styles.exportMenu, { backgroundColor: theme.bgCard, borderColor: theme.border }, SHADOWS.md]}>
          <View style={[styles.exportHeader, { borderBottomColor: theme.border }]}>
            <Ionicons name="download-outline" size={14} color={theme.textMuted} />
            <Text style={[styles.exportTitle, { color: theme.text }]}>Export Results</Text>
            <View style={{ flex: 1 }} />
            <RipplePressable onPress={() => setShowExportMenu(false)} haptic="none">
              <Ionicons name="close" size={16} color={theme.textMuted} />
            </RipplePressable>
          </View>
          <View style={styles.exportOptions}>
            <RipplePressable onPress={() => handleExport('csv')} haptic="light">
              <View style={[styles.exportOption, { borderColor: theme.border }]}>
                <Ionicons name="document-text-outline" size={22} color={theme.accent} />
                <Text style={[styles.exportOptionText, { color: theme.text }]}>CSV</Text>
                <Text style={[styles.exportOptionMeta, { color: theme.textMuted }]}>Comma-separated</Text>
              </View>
            </RipplePressable>
            <RipplePressable onPress={() => handleExport('json')} haptic="light">
              <View style={[styles.exportOption, { borderColor: theme.border }]}>
                <Ionicons name="code-slash-outline" size={22} color={theme.accent} />
                <Text style={[styles.exportOptionText, { color: theme.text }]}>JSON</Text>
                <Text style={[styles.exportOptionMeta, { color: theme.textMuted }]}>Structured data</Text>
              </View>
            </RipplePressable>
          </View>
        </View>
      )}

      <View style={styles.editorSection}>
        {showSuggestions && suggestions.length > 0 && (
          <View style={[styles.suggestionBar, { backgroundColor: theme.bgInput, borderBottomColor: theme.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionScroll} keyboardShouldPersistTaps="always">
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

        <View style={[styles.inputRow, { backgroundColor: theme.cliBg, borderColor: theme.border }]}>
          <Text style={[styles.prompt, { color: theme.cliAccent }]}>{'\u203A'}</Text>
          <TokenizedInput
            value={value}
            onChangeText={handleTextChange}
            placeholder={placeholder}
            placeholderColor={theme.placeholder + '60'}
            accentColor={theme.cliAccent}
            textColor={theme.cliText}
          />
        </View>
        <Text style={[styles.shortcutHint, { color: theme.textMuted }]}>
          Ctrl+Enter to execute
        </Text>
      </View>

      <View style={styles.resultSection}>
        <View style={[styles.resultHeader, { borderBottomColor: theme.border }]}>
          <View style={styles.resultHeaderLeft}>
            <Ionicons name="grid-outline" size={14} color={theme.accent} style={{ marginRight: SPACING.sm }} />
            <Text style={[styles.resultTitle, { color: theme.textLabel }]}>Results</Text>
            {results !== null && (
              <View style={[styles.rowChip, { backgroundColor: theme.accentLight }]}>
                <Text style={[styles.rowChipText, { color: theme.accent }]}>
                  {effectiveRowCount} rows
                </Text>
              </View>
            )}
            {durationMs !== undefined && durationMs > 0 && (
              <Text style={[styles.durationText, { color: theme.textMuted }]}>
                {durationMs}ms
              </Text>
            )}
          </View>
          {totalPages > 1 && (
            <View style={styles.pagination}>
              <RipplePressable onPress={() => setPage(Math.max(0, safePage - 1))} disabled={safePage === 0} haptic="light">
                <Ionicons name="chevron-back" size={16} color={safePage === 0 ? theme.textMuted + '40' : theme.accent} />
              </RipplePressable>
              <Text style={[styles.pageText, { color: theme.text }]}>
                {safePage + 1} / {totalPages}
              </Text>
              <RipplePressable onPress={() => setPage(Math.min(totalPages - 1, safePage + 1))} disabled={safePage >= totalPages - 1} haptic="light">
                <Ionicons name="chevron-forward" size={16} color={safePage >= totalPages - 1 ? theme.textMuted + '40' : theme.accent} />
              </RipplePressable>
            </View>
          )}
        </View>

        {isExecuting ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.centerText, { color: theme.textMuted }]}>Executing...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorHeader}>
              <Ionicons name="alert-circle" size={22} color={theme.danger} />
              <Text style={[styles.errorTitle, { color: theme.danger }]}>Error</Text>
            </View>
            <ScrollView style={styles.errorBody} nestedScrollEnabled>
              {error.split('\n').map((line, i) => {
                const isHeader = line.endsWith(':') && !line.startsWith(' ');
                const isRecommendation = line.startsWith('  ');
                const isAction = line.includes('npx ') || line.includes('nc -zv');
                return (
                  <Text
                    key={i}
                    style={[
                      styles.errorLine,
                      { color: theme.text },
                      isHeader && styles.errorLineHeader,
                      isRecommendation && { color: theme.textMuted },
                      isAction && styles.errorLineAction,
                    ]}
                    selectable
                  >
                    {line}
                  </Text>
                );
              })}
            </ScrollView>
          </View>
        ) : results === null ? (
          <View style={styles.center}>
            <Ionicons name="terminal-outline" size={40} color={theme.textMuted} />
            <Text style={[styles.centerText, { color: theme.textMuted }]}>No results yet</Text>
            <Text style={[styles.centerHint, { color: theme.textMuted }]}>
              Write a SQL query and press Run
            </Text>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="checkmark-circle-outline" size={40} color={theme.success} />
            <Text style={[styles.centerText, { color: theme.success }]}>Query executed successfully</Text>
            <Text style={[styles.centerHint, { color: theme.textMuted }]}>No rows returned</Text>
          </View>
        ) : pagedResults && (
          <ScrollView horizontal showsHorizontalScrollIndicator style={styles.tableScrollH}>
            <View>
              <View style={[styles.tableHeaderRow, { backgroundColor: theme.bgInput, borderBottomColor: theme.border }]}>
                {columns.map((col) => (
                  <View key={col} style={[styles.colHeader, { width: colWidth, borderRightColor: theme.border }]}>
                    <Text style={[styles.colHeaderText, { color: theme.accent }]} numberOfLines={1}>{col}</Text>
                  </View>
                ))}
              </View>
              <ScrollView style={styles.tableBodyScroll} nestedScrollEnabled>
                {pagedResults.map((row, i) => (
                  <View key={i} style={[
                    styles.tableRow,
                    { borderBottomColor: theme.border },
                    i % 2 === 0 && { backgroundColor: theme.bgInput + '40' },
                  ]}>
                    {columns.map((col) => (
                      <View key={col} style={[styles.cell, { width: colWidth, borderRightColor: theme.border }]}>
                        <Text style={[styles.cellText, { color: theme.text }]} numberOfLines={2}>
                          {row[col] === null ? 'NULL' : String(row[col])}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toolChipText: {
    ...TYPOGRAPHY.monoSm,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  runBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.sm,
  },
  runBtnText: {
    ...TYPOGRAPHY.monoSm,
    fontSize: 11,
    fontWeight: '700' as const,
    marginLeft: 4,
  },
  shortcutHint: {
    ...TYPOGRAPHY.monoSm,
    fontSize: 9,
    textAlign: 'right',
    paddingHorizontal: SPACING.md,
    paddingTop: 2,
  },
  exportMenu: {
    position: 'absolute',
    top: 40,
    right: SPACING.md,
    zIndex: 10,
    borderRadius: RADIUS.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: SPACING.md,
    minWidth: 200,
  },
  exportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: SPACING.sm,
  },
  exportTitle: {
    ...TYPOGRAPHY.label,
    marginLeft: SPACING.sm,
  },
  exportOptions: {
    gap: SPACING.sm,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: SPACING.sm,
  },
  exportOptionText: {
    ...TYPOGRAPHY.bodyBold,
    fontSize: 13,
  },
  exportOptionMeta: {
    ...TYPOGRAPHY.monoSm,
    fontSize: 10,
    marginLeft: 'auto',
  },
  editorSection: {},
  suggestionBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  suggestionScroll: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  suggestionChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xs,
    borderWidth: StyleSheet.hairlineWidth,
  },
  suggestionText: { ...TYPOGRAPHY.monoSm, fontWeight: '600' as const },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
  },
  prompt: {
    fontSize: 16,
    fontWeight: '800' as const,
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginRight: SPACING.sm,
    marginTop: SPACING.xs,
  },
  tokenOverlay: { flex: 1, position: 'relative' },
  tokenLayer: {
    position: 'absolute',
    left: 0, right: 0, top: 0,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    minHeight: 20,
  },
  cliInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    maxHeight: 100,
  },
  cliInputOverlay: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    zIndex: 2,
  },
  resultSection: {
    flex: 1,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  resultTitle: { ...TYPOGRAPHY.label },
  rowChip: { marginLeft: SPACING.sm, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.xs },
  rowChipText: { ...TYPOGRAPHY.monoSm, fontWeight: '600' as const },
  durationText: { ...TYPOGRAPHY.monoSm, fontSize: 10, marginLeft: SPACING.sm },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  pageText: { ...TYPOGRAPHY.monoSm, fontSize: 12, fontWeight: '600' as const },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xxl },
  centerText: { ...TYPOGRAPHY.caption, marginTop: SPACING.sm },
  centerHint: { ...TYPOGRAPHY.monoSm, marginTop: SPACING.xs, fontSize: 10 },
  errorText: { ...TYPOGRAPHY.body, marginTop: SPACING.sm, textAlign: 'center', paddingHorizontal: SPACING.lg },
  errorContainer: {
    flex: 1, marginHorizontal: SPACING.sm, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: '#e74c3c30', backgroundColor: '#e74c3c08', overflow: 'hidden',
  },
  errorHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e74c3c20',
  },
  errorTitle: { ...TYPOGRAPHY.label, marginLeft: SPACING.sm, fontWeight: '700' as const },
  errorBody: { padding: SPACING.md, maxHeight: 220 },
  errorLine: { ...TYPOGRAPHY.monoSm, fontSize: 11, lineHeight: 18, paddingVertical: 1 },
  errorLineHeader: { fontWeight: '700' as const, fontSize: 12, marginTop: SPACING.xs },
  errorLineAction: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#e74c3c10',
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: RADIUS.xs, overflow: 'hidden' as const, marginTop: 2,
  },
  tableScrollH: { flex: 1 },
  tableHeaderRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  colHeader: {
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  colHeaderText: { ...TYPOGRAPHY.monoSm, fontWeight: '700' as const },
  tableBodyScroll: { maxHeight: 300 },
  tableRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  cell: {
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  cellText: { ...TYPOGRAPHY.monoSm, fontSize: 12 },
});
