import { auth } from "@/lib/auth";

export type User = typeof auth.$Infer.Session.user;
export type Session = typeof auth.$Infer.Session.session;

export type Env = {
  Variables: {
    user: User | null;
    session: Session | null;
  };
};
