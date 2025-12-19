// types.ts
// types.ts
import type { ReactNode } from "react";

export interface StatProps {
  title: string;
  value: string | number;
  color: "blue" | "green" | "orange";
  icon: ReactNode;
}

export interface KitchenProps {
  name: string;
  code: string;
  head: string;
  location: string;
  status: "Aktif" | "Non-Aktif";
}