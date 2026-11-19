import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

export default function PathsScreen() {
  return (
    <Screen title="Paths" caption="Books that lead into each other, like stars in a constellation.">
      <EmptyState
        heading="Reading paths arrive soon"
        body="Curated journeys through philosophy, classics, fantasy and science fiction, and paths you build yourself."
      />
    </Screen>
  );
}
