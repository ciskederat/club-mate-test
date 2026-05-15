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
  type: "cafe" | "shop" | "unknown";
  address?: string;
  hours?: OpeningInterval[][];
  presentCount?: number;
  absentCount?: number;
  lastReportStatus?: MateReportStatus;
  lastReportedAt?: string;
};
