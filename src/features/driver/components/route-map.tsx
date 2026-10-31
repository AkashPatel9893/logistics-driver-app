import { AppMapCamera, AppMapMarker, AppMapPolyline, AppMapView, AppView } from '@/components/ui';
import type { GeoPoint } from '@/lib/api/models';
import { useRoadRoute } from '@/hooks/use-road-route';
import { computeBounds, distanceKm } from '@/lib/geo';

import { DropMarker, PickupMarker, SelfMarker } from './map-markers';

export interface RouteMapProps {
  pickup: GeoPoint | null;
  drop: GeoPoint | null;
  /** The driver's live position, when known. */
  driver?: GeoPoint | null;
  /** Leg to highlight; the other stop is still shown. */
  focus?: 'pickup' | 'drop' | 'route';
  padding?: { top: number; right: number; bottom: number; left: number };
  className?: string;
}

const ROUTE_COLOR = '#FF5A1F';

/** Map of a trip: stops, the active leg as a line, and the driver dot. */
export function RouteMap({
  pickup,
  drop,
  driver,
  focus = 'route',
  padding = { top: 40, right: 40, bottom: 40, left: 40 },
  className = 'flex-1',
}: RouteMapProps) {
  const target = focus === 'pickup' ? pickup : focus === 'drop' ? drop : null;
  const leg =
    focus === 'route' ? [pickup, drop] : [driver ?? (focus === 'drop' ? pickup : null), target];
  const ends = leg.filter((p): p is GeoPoint => p != null);
  // One road route per leg, fetched from where the driver was when the leg began.
  const road = useRoadRoute(
    `${focus}:${ends.at(-1)?.latitude},${ends.at(-1)?.longitude}`,
    ends.length >= 2 ? ends[0] : null,
    ends.length >= 2 ? ends[ends.length - 1] : null,
  );
  // Drop the part already driven: start the line at the driver, then the road ahead.
  let line = ends;
  if (road.data && ends.length >= 2) {
    const from = ends[0];
    let nearest = 0;
    road.data.forEach((point, index) => {
      if (distanceKm(point, from) < distanceKm(road.data[nearest], from)) nearest = index;
    });
    line = [from, ...road.data.slice(Math.min(nearest + 1, road.data.length - 1))];
  }
  const fit = [...line, ...(focus === 'route' ? [] : [pickup, drop])].filter(
    (p): p is GeoPoint => p != null,
  );

  return (
    <AppView className={className}>
      <AppMapView style={{ flex: 1 }}>
        {fit.length > 0 ? (
          <AppMapCamera bounds={computeBounds(fit, 0.004)} padding={padding} />
        ) : null}
        {line.length >= 2 ? (
          <AppMapPolyline coordinates={line} strokeColor={ROUTE_COLOR} strokeWidth={4} />
        ) : null}
        {pickup ? (
          <AppMapMarker coordinate={pickup} title="Pickup">
            <PickupMarker />
          </AppMapMarker>
        ) : null}
        {drop ? (
          <AppMapMarker coordinate={drop} title="Drop">
            <DropMarker />
          </AppMapMarker>
        ) : null}
        {driver ? (
          <AppMapMarker coordinate={driver} title="You">
            <SelfMarker />
          </AppMapMarker>
        ) : null}
      </AppMapView>
    </AppView>
  );
}
