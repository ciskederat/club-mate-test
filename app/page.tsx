import Map from "@/components/Map";
import { places } from "@/data/places";

export default function Home() {
  return (
    <main className="w-screen h-screen">
      <Map places={places} />
    </main>
  );
}