"use client";

import dynamic from "next/dynamic";
import type { Place } from "@/data/placeTypes";

const MapWithNoSSR = dynamic(() => import("./MapClient"), {
  ssr: false,
});

export default function Map({ places }: { places: Place[] }) {
  return (
    <MapWithNoSSR places={places || []} />
  );
}
