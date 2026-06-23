import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

// Augment the session user with our id + role.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}
