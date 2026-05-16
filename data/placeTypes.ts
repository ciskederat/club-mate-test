export type OpeningInterval = {
  open: string;
  close: string;
};

export type MateReportStatus = "present" | "absent";

export type Place = {
  id?: string;
  name: string;
  position: [number, number];
  info: string;
  type: "cafe" | "coffee_bar" | "restaurant" | "lunchbar" | "shop" | "other";
  address?: string;
  hours?: OpeningInterval[][];
  presentCount?: number;
  absentCount?: number;
  consecutiveAbsentCount?: number;
  lastReportStatus?: MateReportStatus;
  lastReportedAt?: string;
};
