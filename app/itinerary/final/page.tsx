import { Suspense } from "react";

// Αποφεύγουμε prerender/SSG για αυτή τη σελίδα
export const dynamic = "force-dynamic";

import FinalClient from "./FinalClient";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <FinalClient />
    </Suspense>
  );
}
