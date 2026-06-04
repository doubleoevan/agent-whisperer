/**
 * The single hardcoded v1 user. When we add real auth in v2, this constant
 * goes away and userId comes from the session — but every table and every
 * query already reads it from a variable, so that change won't ripple.
 */
export const V1_USER_ID = "00000000-0000-0000-0000-000000000001";
