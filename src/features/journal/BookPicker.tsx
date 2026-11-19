import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '@/components/Chip';
import { listBooks } from '@/data/books';
import { useDb } from '@/data/DataProvider';
import { useLiveQuery } from '@/data/live';
import { space } from '@/theme/tokens';

/** A row of books to link an entry to. Reading books come first. */
export function BookPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const db = useDb();
  const { data: books } = useLiveQuery(() => listBooks(db, ['reading', 'finished', 'paused']), ['books']);
  if (!books?.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="radiogroup">
      <Chip label="No book" selected={value === null} onPress={() => onChange(null)} />
      {books.map((b) => (
        <Chip key={b.id} label={b.title} selected={value === b.id} onPress={() => onChange(b.id)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ row: { gap: space.sm, paddingVertical: space.xs } });
