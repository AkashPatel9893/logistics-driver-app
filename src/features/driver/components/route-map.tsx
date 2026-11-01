import { useState } from 'react';

import {
  AppMapCamera,
  AppMapMarker,
  AppMapPolyline,
  AppMapView,
  AppText,
  AppView,
} from '@/components/ui';
import type { GeoPoint } from '@/lib/api/models';
import { useRoadRoute } from '@/hooks/use-road-route';
import {
  computeBounds,
  distanceKm,
  pathDistanceKm,
  remainingPath,
  type GeoBounds,
} from '@/lib/geo';

import { DropMarker, PickupMarker, SelfMarker } from './map-markers';

export interface RouteMapProps {
  pickup: GeoPoint | null;
  drop: GeoPoint | null;
  /** Stops between pickup and the final drop, so the preview follows the real order. */
  via?: GeoPoint[];
  /** The driver's live position, when known. */
  driver?: GeoPoint | null;
  /** Leg to highlight; the other stop is still shown. */
  focus?: 'pickup' | 'drop' | 'route';
  padding?: { top: number; right: number; bottom: number; left: number };
  className?: string;
}

const ROUTE_COLOR = '#FF5A1F';
/** Closer than this to the stop counts as arrived. */
const ARRIVED_KM = 0.05;

/** Map of a trip: stops, the active leg as a line, and the driver dot. */
export function RouteMap({
  pickup,
  drop,
  via = [],
  driver,
  focus = 'route',
  padding = { top: 40, right: 40, bottom: 40, left: 40 },
  className = 'flex-1',
}: RouteMapProps) {
  const target = focus === 'pickup' ? pickup : focus === 'drop' ? drop : null;
  // A single-stop leg is drawn from the driver only: with no fix yet there is nothing to draw,
  // and once they reach the stop there is no road left to show.
  const leg = focus === 'route' ? [pickup, drop] : [driver, target];
  const arrived = focus !== 'route' && driver && target && distanceKm(driver, target) < ARRIVED_KM;
  const ends = arrived ? [] : leg.filter((p): p is GeoPoint => p != null);
  // One road route per leg, fetched from where the driver was when the leg began.
  const road = useRoadRoute(
    `${focus}:${ends.at(-1)?.latitude},${ends.at(-1)?.longitude}`,
    ends.length >= 2 ? ends[0] : null,
    ends.length >= 2 ? ends[ends.length - 1] : null,
  );
  // Drop the part already driven: the line starts at the driver, then the road ahead.
  const line = road.data && ends.length >= 2 ? remainingPath(road.data, ends[0]).path : ends;
  // While heading to pickup, the road on to the drop is previewed (dashed), like Uber's next-leg line.
  const preview = useRoadRoute(
    `preview:${pickup?.latitude},${pickup?.longitude}:${via.map((p) => `${p.latitude},${p.longitude}`).join('|')}:${drop?.latitude},${drop?.longitude}`,
    focus === 'pickup' ? pickup : null,
    focus === 'pickup' ? drop : null,
    via,
  );
  const fit = [...line, ...(focus === 'route' ? [] : [pickup, drop])].filter(
    (p): p is GeoPoint => p != null,
  );

  // The map re-fits whenever its bounds change, so live bounds would move the camera on every GPS
  // fix. Keep them until the leg changes or the distance left has shrunk by a third.
  const remainingBucket = Math.floor(Math.log(Math.max(pathDistanceKm(line), 0.1)) / Math.log(1.5));
  const fitKey = `${focus}:${ends.at(-1)?.latitude},${ends.at(-1)?.longitude}:${remainingBucket}`;
  const liveBounds = fit.length > 0 ? computeBounds(fit, 0.004) : undefined;
  const [fitted, setFitted] = useState<{ key: string; bounds: GeoBounds | undefined }>({
    key: fitKey,
    bounds: liveBounds,
  });
  if (fitted.key !== fitKey) setFitted({ key: fitKey, bounds: liveBounds });

  return (
    <AppView className={className}>
      <AppMapView style={{ flex: 1 }}>
        {fitted.bounds ? <AppMapCamera bounds={fitted.bounds} padding={padding} /> : null}
        {focus === 'pickup' && preview.data && preview.data.length >= 2 ? (
          <AppMapPolyline
            coordinates={preview.data}
            strokeColor={ROUTE_COLOR}
            strokeWidth={3}
            dashed
          />
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
        {via.map((point, i) => (
          <AppMapMarker key={`via-${i}`} coordinate={point} title={`Stop ${i + 1}`}>
            <AppView className="size-6 items-center justify-center rounded-full border-2 border-white bg-neutral-700">
              <AppText className="text-[11px] font-bold text-white">{i + 1}</AppText>
            </AppView>
          </AppMapMarker>
        ))}
        {driver && !arrived ? (
          <AppMapMarker coordinate={driver} title="You">
            <SelfMarker />
          </AppMapMarker>
        ) : null}
      </AppMapView>
    </AppView>
  );
}
