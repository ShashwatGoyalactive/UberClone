import { z } from "zod";

/** Shared by the browser forms and the Server Actions. */

export const demoRoleSchema = z.enum(["rider", "pilot"]);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "That email is too long.")
  .pipe(z.email("Enter a valid email address."));

export const emailCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code from the email.");
