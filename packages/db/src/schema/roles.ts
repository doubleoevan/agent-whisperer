import { pgRole } from "drizzle-orm/pg-core";

// declare the existing app role to drizzle; the docker init script owns lifecycle
export const appRole = pgRole("app").existing();
