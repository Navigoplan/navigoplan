import { Suspense } from "react";
export const dynamic = "force-dynamic";
import FinalClient from "./FinalClient";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <FinalClient />
    </Suspense>
  );
}
