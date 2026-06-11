import type { UserId } from "./ids.ts";

export type HelloInput = {
  userId: UserId;
  name: string;
};

export type HelloResult = {
  greeting: string;
  greetedAt: string;
};

// activity contracts — workflows depend on these; activities implement them
export type HelloActivities = {
  sayHello: (input: HelloInput) => Promise<HelloResult>;
};
