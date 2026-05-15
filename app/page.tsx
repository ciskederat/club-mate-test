import Map from "@/components/Map";
import { getPlaces } from "@/lib/placesDatabase";

export default async function Home() {
  const places = await getPlaces();

  return (
    <main className="h-svh w-screen">
      <Map places={places} />
    </main>
  );
}
