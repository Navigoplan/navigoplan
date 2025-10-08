import RouteMapClient from "./RouteMapClient";
import { resolveWaypoints } from "./resolveWaypoints";
import type { Point } from "./resolveWaypoints";

export default async function Page() {
  // παράδειγμα: ο χρήστης ή το auto-mode δίνει ονόματα
  const namesOrPoints = [
    "Alimos Marina",
    "Aegina Port",
    "Poros Town",
    "Ermioni",
    "Hydra Port",
    "Spetses – Dapia"
  ] as (string | Point)[];

  const points = await resolveWaypoints(namesOrPoints);

  return <RouteMapClient points={points} />;
}
