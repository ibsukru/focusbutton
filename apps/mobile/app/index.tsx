import { StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { FocusButton } from '@/components/FocusButton';

export default function App() {
  return (
    <ThemedView style={styles.container}>
      <FocusButton />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
