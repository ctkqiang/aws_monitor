import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet } from 'react-native';

export default function ECSServicesScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('screens.ecsServices.noClusters')}</Text>
        <Text style={styles.hintText}>{t('screens.ecsServices.selectCluster')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 16, color: '#666680', marginBottom: 8 },
  hintText: { fontSize: 13, color: '#555566' },
});
