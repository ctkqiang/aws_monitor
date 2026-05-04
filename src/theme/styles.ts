import { StyleSheet } from 'react-native';
import { ThemeColors } from './ThemeContext';

interface LoginStyles {
  container: object;
  scrollLogin: object;
  headerCenter: object;
  title: object;
  label: object;
  input: (theme: ThemeColors) => object;
  btnPrimary: object;
  btnPrimaryText: object;
}

export function makeStyles(theme: ThemeColors): LoginStyles {
  return {
    container: { flex: 1 },
    scrollLogin: { flexGrow: 1, padding: 24, justifyContent: 'center' },
    headerCenter: { alignItems: 'center', marginBottom: 32 },
    title: { fontSize: 36, fontWeight: '700' as const, marginBottom: 8 },
    label: { fontSize: 13, fontWeight: '600' as const, marginBottom: 6, marginTop: 12, textTransform: 'uppercase' as const },
    input: (t: ThemeColors) => ({
      backgroundColor: t.bgInput,
      borderRadius: 8,
      padding: 14,
      fontSize: 15,
      color: t.text,
      borderWidth: 1,
      borderColor: t.border,
    }),
    btnPrimary: { height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    btnPrimaryText: { fontSize: 16, fontWeight: '600' as const },
  };
}
