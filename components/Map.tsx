"use client";

import dynamic from "next/dynamic";

const MapWithNoSSR = dynamic(() => import("./MapClient"), {
  ssr: false,
});

export default function Map({ places }: any) {
  return (
    <MapWithNoSSR places={places || []} />
  );
}