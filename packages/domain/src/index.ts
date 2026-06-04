// pure types; the only package workflows/ is allowed to import
export type HelloInput = {
  userId: string;
  name: string;
};

export type HelloResult = {
  greeting: string;
  greetedAt: string;
};
