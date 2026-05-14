"use client";

import dynamic from "next/dynamic";

type OpeningInterval = {
  open: string;
  close: string;
};

type Place = {
  name: string;
  position: [number, number];
  info: string;
  type: "cafe" | "shop";
  address?: string;
  hours?: OpeningInterval[][];
};

const MapWithNoSSR = dynamic(() => import("./MapClient"), {
  ssr: false,
});

export default function Map({ places }: { places: Place[] }) {
  return (
    <MapWithNoSSR places={places || []} />
  );
}
