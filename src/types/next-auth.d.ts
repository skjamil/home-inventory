import type { DefaultSession } from 'next-auth';

// The jwt/session callbacks in src/lib/auth.ts propagate the user id onto
// both the token and the exposed session — these declarations just make
// the types reflect that.
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
  }
}
