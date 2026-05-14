type OpeningInterval = {
  open: string;
  close: string;
};

type Place = {
  name: string;
  position: [number, number];
  info: string;
  type: "cafe" | "shop";
  address: string;
  hours: OpeningInterval[][];
};

export const places: Place[] = [
  {
    name: "Korsakov",
    position: [51.229, 4.414],
    info: "Club Mate verkrijgbaar",
    type: "cafe",
    address: "Sint-Jorispoort 1, 2000 Antwerpen",
    hours: [
      [{ open: "12:00", close: "02:00" }],
      [{ open: "12:00", close: "02:00" }],
      [{ open: "12:00", close: "03:00" }],
      [{ open: "12:00", close: "03:00" }],
      [{ open: "12:00", close: "03:00" }],
      [{ open: "12:00", close: "04:00" }],
      [{ open: "12:00", close: "04:00" }],
    ],
  },
  {
    name: "Ampere",
    position: [51.221, 4.4],
    info: "Vaak Club Mate Zero",
    type: "cafe",
    address: "Simonsstraat 21, 2018 Antwerpen",
    hours: [
      [],
      [],
      [],
      [],
      [],
      [{ open: "23:00", close: "07:00" }],
      [{ open: "23:00", close: "07:00" }],
    ],
  },
  {
    name: "Carrefour",
    position: [51.217, 4.421],
    info: "Supermarkt met Club Mate",
    type: "shop",
    address: "Beddenstraat 2, 2000 Antwerpen",
    hours: [
      [],
      [{ open: "08:00", close: "20:00" }],
      [{ open: "08:00", close: "20:00" }],
      [{ open: "08:00", close: "20:00" }],
      [{ open: "08:00", close: "20:00" }],
      [{ open: "08:00", close: "21:00" }],
      [{ open: "08:00", close: "20:00" }],
    ],
  },
];
