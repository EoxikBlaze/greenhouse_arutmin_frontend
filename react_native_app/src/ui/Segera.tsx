import { EmptyState } from './EmptyState';
import { Screen } from './Screen';
import { SectionTitle } from './SectionTitle';

// Penampung untuk layar yang dibangun di irisan berikutnya.
export function Segera({ title }: { title: string }) {
  return (
    <Screen>
      <SectionTitle title={title} />
      <EmptyState title="Segera hadir" body="Layar ini dibangun pada irisan berikutnya." />
    </Screen>
  );
}
