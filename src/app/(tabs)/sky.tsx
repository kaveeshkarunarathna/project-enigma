import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

export default function SkyScreen() {
  return (
    <Screen title="Your sky" caption="Every night you read adds a star. Nothing here ever goes dark.">
      <EmptyState
        heading="The first star is waiting"
        body="Read for a few minutes tonight and it will appear."
      />
    </Screen>
  );
}
