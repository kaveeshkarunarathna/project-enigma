import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';

export default function TonightScreen() {
  return (
    <Screen title="Tonight" caption="A few quiet pages are enough.">
      <EmptyState
        heading="Your sky is still dark"
        body="Choose a first book and light your first star. It can be a short one."
      />
    </Screen>
  );
}
