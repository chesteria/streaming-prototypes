import type { z } from "zod";
import type { CitySchema, LocationStateSchema } from "../schemas/location";

export type City = z.infer<typeof CitySchema>;
export type LocationState = z.infer<typeof LocationStateSchema>;
