"use client";

import React, { useEffect, useRef } from "react";

// ---------- OpenLayers ----------
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import XYZ from "ol/source/XYZ";
import { fromLonLat } from "ol/proj";
import { Stroke, Style, Circle as CircleStyle, Fill, Text } from "ol/style";
import { Feature } from "ol";
import LineString from "ol/geom/LineString";
import Point from "ol/geom/Point";
import * as extent from "ol/extent";

// ---------- Turf ----------
import booleanIntersects from "@turf/boolean-intersects";
import buffer from "@turf/buffer";
import { lineString as turfLineString } from "@turf/helpers";

// ---------- GeoJSON Types ----------
import type {
  Feature as GeoFeature,
  FeatureCollection,
  LineString as GeoLineString,
  MultiLineString,
  Polygon,
  MultiPolygon,
  Position,
  Geometry,
} from "geojson";

// ---------- Types ----------
export type SeaMapPoint = {
  lon: number;
  lat: number;
  name?: string;
};

type Props = {
  route: SeaMapPoint[];
  height?: number | string;
  showLabels?: boolean;
};

// ---------- Helper functions ----------
const nmBetween = (a: SeaMapPoint, b: SeaMapPoint) => {
  const Rkm = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const km = 2 * Rkm * Math.asin(Math.min(1, Math.sqrt(h)));
  return km * 0.539957; // km -> nm
};

// ---------- Hybrid land intersection check ----------
async function checkLandIntersection(route: SeaMapPoint[]): Promise<boolean> {
  try {
    const line = turfLineString(
      route.map((p) => [p.lon, p.lat]) as Position[]
    );

    const coast = (await (
      await fetch("/data/coastlines-gr.geojson")
    ).json()) as FeatureCollection<
      GeoLineString | MultiLineString | Polygon | MultiPolygon
    >;

    const features = coast.features ?? [];

    for (const f of features as GeoFeature<
      GeoLineString | MultiLineString | Polygon | MultiPolygon,
      any
    >[]) {
      const gType = f.geometry?.type;
      if (gType === "LineString" || gType === "MultiLineString") {
        const coastBand = buffer(f as any, 0.05, { units: "kilometers" }); // ~50m buffer
        if (booleanIntersects(line as any, coastBand as any)) return true;
      } else if (gType === "Polygon" || gType === "MultiPolygon") {
        if (booleanIntersects(line as any, f as any)) return true;
      }
    }
    return false;
  } catch (e) {
    console.warn("Land check failed:", e);
    return false;
  }
}

// ---------- Main component ----------
export default function SeaMap({
  route,
  height = 260,
  showLabels = true,
}: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!divRef.current || !route?.length) return;

    // Sources
    const routeSource = new VectorSource();
    const pointsSource = new VectorSource();

    // Styles
    const routeLayer = new VectorLayer({
      source: routeSource,
      style: new Style({
        stroke: new Stroke({
          color: "#00b2e3",
          width: 3,
          lineCap: "round",
          lineJoin: "round",
        }),
      }),
    });

    const pointStyle = (name?: string) =>
      new Style({
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({ color: "#13d6b3" }),
          stroke: new Stroke({ color: "#083b55", width: 2 }),
        }),
        text:
          showLabels && name
            ? new Text({
                text: name,
                offsetY: -14,
                font: "12px Inter, system-ui, sans-serif",
                fill: new Fill({ color: "#0b1220" }),
                stroke: new Stroke({ color: "rgba(255,255,255,.9)", width: 3 }),
              })
            : undefined,
      });

    const pointsLayer = new VectorLayer({
      source: pointsSource,
      style: (f) => pointStyle(f.get("name")),
    });

    // Base layer
    const tile = new TileLayer({
      source: new XYZ({
        url: "https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attributions:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }),
    });

    // Init map
    const map = new Map({
      target: divRef.current,
      layers: [tile, routeLayer, pointsLayer],
      view: new View({
        center: fromLonLat([23.72, 37.98]),
        zoom: 6,
      }),
      controls: [],
    });
    mapRef.current = map;

    // Add route + points
    const coords3857 = route.map((p) => fromLonLat([p.lon, p.lat]));
    const line = new LineString(coords3857);
    const lineF = new Feature({ geometry: line });
    routeSource.addFeature(lineF);

    for (const p of route) {
      const pf = new Feature({
        geometry: new Point(fromLonLat([p.lon, p.lat])),
        name: p.name ?? "",
      });
      pointsSource.addFeature(pf);
    }

    // Fit view
    const ext = extent.createEmpty();
    extent.extend(ext, routeSource.getExtent());
    extent.extend(ext, pointsSource.getExtent());
    if (!extent.isEmpty(ext)) {
      map.getView().fit(ext, { padding: [20, 20, 20, 20], maxZoom: 12 });
    }

    // Animation
    let animId = 0;
    try {
      const total = coords3857.length;
      if (total > 2) {
        const animLine = new LineString([coords3857[0]]);
        const animFeat = new Feature({ geometry: animLine });
        routeSource.clear();
        routeSource.addFeature(animFeat);

        let i = 1;
        const step = () => {
          if (i < total) {
            animLine.setCoordinates(coords3857.slice(0, i + 1));
            i += 1;
            animId = requestAnimationFrame(step);
          } else {
            routeSource.clear();
            routeSource.addFeature(lineF);
          }
        };
        animId = requestAnimationFrame(step);
      }
    } catch {}

    // Distance calc
    try {
      let nm = 0;
      for (let i = 1; i < route.length; i++) {
        nm += nmBetween(route[i - 1], route[i]);
      }
      // console.log(`Route distance: ${nm.toFixed(1)} nm`);
    } catch {}

    // Land check
    checkLandIntersection(route).then((touchesLand) => {
      if (touchesLand) {
        routeLayer.setStyle(
          new Style({
            stroke: new Stroke({
              color: "#ff7a00",
              width: 3,
              lineCap: "round",
              lineJoin: "round",
            }),
          })
        );
      }
    });

    return () => {
      if (animId) cancelAnimationFrame(animId);
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, [route, height, showLabels]);

  return (
    <div
      ref={divRef}
      style={{
        width: "100%",
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 1px 6px rgba(0,0,0,.08)",
      }}
    />
  );
}
