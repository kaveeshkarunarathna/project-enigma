import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

export default function JournalScreen() {
  return (
    <Screen title="Journal" caption="What the book made you think.">
      <EmptyState
        heading="Nothing written yet"
        body="After a reading session you can leave a thought here. It stays on your phone."
      />
    </Screen>
  );
}
