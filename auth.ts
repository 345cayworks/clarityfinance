import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const authSecret = process.env.AUTH_SECRET ?? (process.env.NODE_ENV === "development" ? "dev-secret-change-me" : undefined);
if (!authSecret) throw new Error("Missing AUTH_SECRET");

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  trustHost: process.env.AUTH_TRUST_HOST === "true" || Boolean(process.env.NETLIFY),
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
        mode: { label: "Mode", type: "text" }
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        const mode = String(credentials?.mode ?? "login");
        const name = String(credentials?.name ?? "").trim();

        if (!email || !password) throw new Error("Email and password are required");

        const existing = await prisma.user.findUnique({ where: { email } });

        if (mode === "signup") {
          if (existing) throw new Error("Account already exists");
          const created = await prisma.user.create({
            data: { email, name: name || null, passwordHash: hashPassword(password), role: "user" }
          });
          return { id: created.id, email: created.email, name: created.name, role: created.role };
        }

        if (!existing || !verifyPassword(password, existing.passwordHash)) {
          throw new Error("Invalid credentials");
        }

        return { id: existing.id, email: existing.email, name: existing.name, role: existing.role };
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role ?? "user";
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub ?? "");
        session.user.role = String(token.role ?? "user") as "user" | "advisor" | "admin";
      }
      return session;
    }
  }
});
