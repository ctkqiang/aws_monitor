import React from 'react';
import {
  View, Text, TextInput, ScrollView, StyleSheet,
  ActivityIndicator, Platform,
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
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'IF', 'ELSE', 'WHILE', 'FOR',
  'RETURNS', 'FUNCTION', 'PROCEDURE', 'DECLARE', 'CURSOR', 'FETCH',
  'VIEW', 'TRIGGER', 'EXEC', 'EXECUTE', 'EXPLAIN', 'ANALYZE',
];

const SQL_FUNCTIONS = [
  'COUNT(', 'SUM(', 'AVG(', 'MAX(', 'MIN(', 'COALESCE(', 'NULLIF(',
  'UPPER(', 'LOWER(', 'TRIM(', 'LENGTH(', 'NOW(', 'CURRENT_TIMESTAMP',
  'CONCAT(', 'SUBSTRING(', 'REPLACE(', 'ROUND(', 'ABS(', 'CAST(',
  'DATE(', 'TIME(', 'YEAR(', 'MONTH(', 'DAY(', 'HOUR(', 'IFNULL(',
];

interface SqlEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  onExecute: () => void;
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
  value,
  onChangeText,
  placeholder,
  placeholderColor,
  accentColor,
  textColor,
  multiline,
  numberOfLines,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  placeholderColor: string;
  accentColor: string;
  textColor: string;
  multiline?: boolean;
  numberOfLines?: number;
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
        multiline={multiline}
        numberOfLines={numberOfLines}
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
        multiline={multiline}
        numberOfLines={numberOfLines}
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
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical="top"
        autoFocus={isFocused}
      />
    </View>
  );
}

export default function SqlEditor({
  value,
  onChangeText,
  onExecute,
  isExecuting,
  results,
  columns,
  error,
  rowCount,
  durationMs,
  placeholder = 'SELECT * FROM ...',
}: SqlEditorProps) {
  const theme = useTheme();

  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const getAutocomplete = React.useCallback((text: string) => {
    if (!text) return [];
    const lastWord = text.split(/[\s,;()]+/).pop()?.toUpperCase() || '';
    if (!lastWord || lastWord.length < 1) return [];
    const kw = SQL_KEYWORDS.filter((k) => k.startsWith(lastWord)).slice(0, 8);
    const fn = SQL_FUNCTIONS.filter((f) => f.toUpperCase().startsWith(lastWord)).slice(0, 4);
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
    const newValue =
      value.substring(0, lastIndex) +
      suggestion +
      value.substring(lastIndex + lastNonSpace.length);
    onChangeText(newValue);
    setShowSuggestions(false);
  };

  const handleExecute = () => {
    if (!value.trim() || isExecuting) return;
    Haptic.medium();
    onExecute();
  };

  const effectiveRowCount = rowCount ?? results?.length ?? 0;

  const colWidth = React.useMemo(() => {
    if (columns.length === 0) return 130;
    const maxLen = Math.max(...columns.map((c) => c.length), 8);
    return Math.max(130, maxLen * 10 + 24);
  }, [columns]);

  return (
    <View style={styles.container}>
      <View style={styles.editorSection}>
        {showSuggestions && suggestions.length > 0 && (
          <View style={[styles.suggestionBar, { backgroundColor: theme.bgInput, borderBottomColor: theme.border }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionScroll}
              keyboardShouldPersistTaps="always"
            >
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
            multiline
            numberOfLines={4}
          />
          <View style={styles.actionCol}>
            {value.trim().length > 0 && (
              <RipplePressable
                onPress={() => onChangeText('')}
                haptic="light"
              >
                <Ionicons name="close-circle-outline" size={18} color={theme.textMuted} style={{ marginBottom: SPACING.sm }} />
              </RipplePressable>
            )}
            <RipplePressable
              onPress={handleExecute}
              disabled={isExecuting || !value.trim()}
              haptic={isExecuting ? 'none' : 'medium'}
            >
              <View style={[
                styles.executeBtn,
                {
                  backgroundColor: (isExecuting || !value.trim())
                    ? theme.btnSecondary
                    : theme.accent,
                },
              ]}>
                {isExecuting ? (
                  <ActivityIndicator size="small" color={theme.btnSecondaryText} />
                ) : (
                  <Ionicons
                    name="play"
                    size={16}
                    color={value.trim() ? theme.accentText : theme.btnSecondaryText}
                  />
                )}
              </View>
            </RipplePressable>
          </View>
        </View>
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
              <Text style={[styles.errorTitle, { color: theme.danger }]}>Connection Error</Text>
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
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator style={styles.tableScrollH}>
            <View>
              <View style={[styles.tableHeaderRow, { backgroundColor: theme.bgInput, borderBottomColor: theme.border }]}>
                {columns.map((col) => (
                  <View key={col} style={[styles.colHeader, { width: colWidth, borderRightColor: theme.border }]}>
                    <Text style={[styles.colHeaderText, { color: theme.accent }]} numberOfLines={1}>
                      {col}
                    </Text>
                  </View>
                ))}
              </View>
              <ScrollView style={styles.tableBodyScroll} nestedScrollEnabled>
                {results.map((row, i) => (
                  <View
                    key={i}
                    style={[
                      styles.tableRow,
                      { borderBottomColor: theme.border },
                      i % 2 === 0 && { backgroundColor: theme.bgInput + '40' },
                    ]}
                  >
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
  editorSection: {},
  suggestionBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  suggestionScroll: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  suggestionChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xs,
    borderWidth: StyleSheet.hairlineWidth,
  },
  suggestionText: {
    ...TYPOGRAPHY.monoSm,
    fontWeight: '600' as const,
  },
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
  tokenOverlay: {
    flex: 1,
    position: 'relative',
  },
  tokenLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
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
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 2,
  },
  actionCol: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: SPACING.xs,
  },
  executeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
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
  resultHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  resultTitle: {
    ...TYPOGRAPHY.label,
  },
  rowChip: {
    marginLeft: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  rowChipText: {
    ...TYPOGRAPHY.monoSm,
    fontWeight: '600' as const,
  },
  durationText: {
    ...TYPOGRAPHY.monoSm,
    fontSize: 10,
    marginLeft: SPACING.sm,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  centerText: {
    ...TYPOGRAPHY.caption,
    marginTop: SPACING.sm,
  },
  centerHint: {
    ...TYPOGRAPHY.monoSm,
    marginTop: SPACING.xs,
    fontSize: 10,
  },
  errorText: {
    ...TYPOGRAPHY.body,
    marginTop: SPACING.sm,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
  errorContainer: {
    flex: 1,
    marginHorizontal: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#e74c3c30',
    backgroundColor: '#e74c3c08',
    overflow: 'hidden',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e74c3c20',
  },
  errorTitle: {
    ...TYPOGRAPHY.label,
    marginLeft: SPACING.sm,
    fontWeight: '700' as const,
  },
  errorBody: {
    padding: SPACING.md,
    maxHeight: 220,
  },
  errorLine: {
    ...TYPOGRAPHY.monoSm,
    fontSize: 11,
    lineHeight: 18,
    paddingVertical: 1,
  },
  errorLineHeader: {
    fontWeight: '700' as const,
    fontSize: 12,
    marginTop: SPACING.xs,
  },
  errorLineAction: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: '#e74c3c10',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    overflow: 'hidden' as const,
    marginTop: 2,
  },
  tableScrollH: {
    flex: 1,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colHeader: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  colHeaderText: {
    ...TYPOGRAPHY.monoSm,
    fontWeight: '700' as const,
  },
  tableBodyScroll: {
    maxHeight: 240,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  cellText: {
    ...TYPOGRAPHY.monoSm,
    fontSize: 12,
  },
});
