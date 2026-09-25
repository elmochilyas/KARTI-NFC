"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import { Button } from "@/components/ui/Button";
import { normalizePickedPoint, type MapPoint } from "@/features/profiles/mapPin";

const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = "© OpenStreetMap contributors";

/**
 * Interactive manual map-pin picker (Phase 34.7). OpenStreetMap tiles via
 * Leaflet (no keys, no billing); Leaflet is imported dynamically inside
 * the effect so server rendering (and unit tests) only ever see the
 * dialog shell. The operator pans/zooms, taps to place a draggable pin,
 * then confirms — the parent commits the point to its draft.
 */
export function MapPinPicker({
  initialCenter,
  initialPoint,
  onConfirm,
  onCancel,
}: {
  initialCenter: { latitude: number; longitude: number; zoom: number };
  initialPoint: MapPoint | null;
  onConfirm: (point: MapPoint) => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mapElRef = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<MapPoint | null>(initialPoint);
  const [mapReady, setMapReady] = useState(false);
  // Latest callbacks for Leaflet event handlers (registered once).
  const callbacksRef = useRef({ onConfirm, onCancel });
  useEffect(() => {
    callbacksRef.current = { onConfirm, onCancel };
  });

  // Native top-layer dialog + Esc-to-cancel (ImageCropEditor pattern).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      try {
        dialog.showModal();
      } catch {
        // showModal unsupported — the dialog still renders inline.
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let map: Leaflet.Map | null = null;
    let marker: Leaflet.Marker | null = null;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !mapElRef.current) return;
      const created = L.map(mapElRef.current, {
        center: [initialCenter.latitude, initialCenter.longitude],
        zoom: initialCenter.zoom,
        zoomControl: true,
      });
      map = created;
      L.tileLayer(OSM_TILES, { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(created);
      const pinIcon = L.divIcon({
        className: "karti-pin",
        html: '<span aria-hidden="true" class="karti-pin-dot"></span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const placeMarker = (latitude: number, longitude: number) => {
        const point = normalizePickedPoint(latitude, longitude);
        if (!point) return;
        setPicked(point);
        if (marker) {
          marker.setLatLng({ lat: point.latitude, lng: point.longitude });
        } else {
          const createdMarker = L.marker([point.latitude, point.longitude], {
            icon: pinIcon,
            draggable: true,
            autoPan: true,
          });
          createdMarker.on("dragend", () => {
            const pos = createdMarker.getLatLng();
            const next = normalizePickedPoint(pos.lat, pos.lng);
            if (next) setPicked(next);
          });
          createdMarker.addTo(created);
          marker = createdMarker;
        }
      };
      if (initialPoint) placeMarker(initialPoint.latitude, initialPoint.longitude);
      created.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        placeMarker(e.latlng.lat, e.latlng.lng);
      });
      // The dialog animates in with zero size — re-measure afterwards.
      requestAnimationFrame(() => {
        if (!cancelled) created.invalidateSize();
      });
      setMapReady(true);
    })().catch(() => {
      // Leaflet failed to load (offline CDN edge is impossible here —
      // bundled — but stay fail-safe): the dialog still offers Cancel.
    });

    return () => {
      cancelled = true;
      try {
        map?.remove();
      } catch {
        // Teardown best-effort.
      }
      map = null;
      marker = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function closeAnd(fn: () => void) {
    try {
      dialogRef.current?.close();
    } catch {
      // Already closed.
    }
    fn();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="map-pin-title"
      onCancel={(e) => {
        e.preventDefault();
        closeAnd(() => callbacksRef.current.onCancel());
      }}
      className="m-auto w-[min(560px,calc(100vw-2rem))] rounded-2xl border border-border bg-white p-0 shadow-xl backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-3 p-4">
        <h2 id="map-pin-title" className="text-base font-bold text-text">
          Choose exact location
        </h2>
        <p className="text-sm text-muted">
          {mapReady ? "Tap the map to place the pin. Drag it to fine-tune." : "Loading the map…"}
        </p>
        <div
          ref={mapElRef}
          role="application"
          aria-label="Interactive map. Tap to place the location pin."
          className="h-72 w-full overflow-hidden rounded-xl border border-black/10 bg-surface-muted sm:h-80"
        />
        <p aria-live="polite" className="min-h-5 text-sm font-medium text-text">
          {picked
            ? `Pin placed at ${picked.latitude.toFixed(5)}, ${picked.longitude.toFixed(5)}.`
            : "No pin placed yet."}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => closeAnd(() => callbacksRef.current.onCancel())}
            className="min-h-11 flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!picked}
            onClick={() => {
              if (picked) closeAnd(() => callbacksRef.current.onConfirm(picked));
            }}
            className="min-h-11 flex-1"
            aria-label={picked ? "Use this location" : "Place a pin first, then use this location"}
          >
            Use this location
          </Button>
        </div>
        <p className="text-right text-[11px] text-muted">
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            © OpenStreetMap contributors
          </a>
        </p>
      </div>
      <style>{`.karti-pin-dot{display:block;width:28px;height:28px;border-radius:9999px;background:var(--color-accent,#0e7c5b);border:3px solid #fff;box-shadow:0 1px 6px rgb(0 0 0/.4);}.karti-pin{background:none;border:none;}`}</style>
    </dialog>
  );
}
