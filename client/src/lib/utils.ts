import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type FirestoreTimestamp = {
  _seconds: number;
  _nanoseconds: number;
};

export const formatTimeAgo = (timestamp: FirestoreTimestamp) => {
  const date = new Date(timestamp._seconds * 1000); // Convert to JavaScript Date
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);
  console.log('timestamp:', timestamp);
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return `${diffDays}d ago`;
  }
};