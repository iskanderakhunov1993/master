/**
 * Database layer - Prisma ORM
 *
 * This module exports the Prisma client and utility functions for database operations.
 * All database queries should go through here to maintain consistent error handling,
 * logging, and performance monitoring.
 */

export { getPrisma } from "./prisma";

// Re-export Prisma types
export type {
  User,
  UserProfile,
  UserAddress,
  Order,
  OrderPhoto,
  OrderStatusHistory,
  MasterProfile,
  MasterPhoto,
  Review,
  ReviewPhoto,
  SessionToken,
  CalendarEvent,
  KanbanTask,
  TaskPhoto,
  MasterOffer,
  MasterSubscription,
} from "@prisma/client";

/**
 * Utility: Convert Prisma DateTime to Unix timestamp (milliseconds)
 * Used for compatibility with existing API that uses millisecond timestamps
 */
export function dateToTimestamp(date: Date | null): number | null {
  return date ? date.getTime() : null;
}

/**
 * Utility: Convert Unix timestamp to Prisma DateTime
 */
export function timestampToDate(timestamp: number | null): Date | null {
  return timestamp ? new Date(timestamp) : null;
}
