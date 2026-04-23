import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getPrisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const prisma = getPrisma();

const authSecret = process.env.AUTH_SECRET ?? (process.env.NODE_ENV === "development" ? "dev-only-auth-secret-change-me" : undefined);
if (!authSecret) {
  throw new Error("Missing AUTH_SECRET. Set AUTH_SECRET in Netlify environment variables.");
}

const trustHost = process.env.AUTH_TRUST_HOST === "true" || Boolean(process.env.NETLIFY);

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  trustHost,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mode: { label: "Mode", type: "text" }
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        const mode = String(credentials?.mode ?? "login");

        if (!email || !password) throw new Error("Email and password are required.");

        const user = await prisma.user.findFirst({ where: { email } });

        if (mode === "signup") {
          if (user) throw new Error("An account already exists for this email.");
          const created = await prisma.user.create({
            data: {
              externalId: `acct:${crypto.randomUUID()}`,
              email,
              passwordHash: hashPassword(password)
            }
          });

          return { id: created.id, email: created.email ?? email };
        }

        if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
          throw new Error("Invalid email or password.");
        }

        return { id: user.id, email: user.email ?? email };
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub ?? "");
      }
      return session;
    }
  }
});
