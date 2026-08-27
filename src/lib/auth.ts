import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

class EmailNotVerifiedError extends CredentialsSignin {
  code = 'EMAIL_NOT_VERIFIED';
}

// Auth.js v5, Credentials provider — see "Auth" in docs/ARCHITECTURE.md.
//
// Session strategy is JWT, not database: Auth.js's Credentials provider
// only supports JWT sessions (a hard library constraint — database
// sessions require the OAuth-style account-linking flow that Credentials
// bypasses entirely; confirmed via UnsupportedStrategy at runtime). This
// means a password reset can no longer force-revoke existing sessions the
// way docs/ARCHITECTURE.md originally described — a signed JWT stays valid
// until it expires. Restoring that property would need a token-versioning
// scheme (a passwordChangedAt/tokenVersion field checked in the session
// callback); deferred as a follow-up rather than built here.
//
// The Prisma adapter is kept wired up for the Account/Session/
// VerificationToken schema (useful if an OAuth provider is added later) —
// it isn't invoked by the Credentials flow itself.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      authorize: async (credentials) => {
        const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        if (!user.emailVerified) throw new EmailNotVerifiedError();

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
});
