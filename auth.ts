import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getPrisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const prisma = getPrisma();

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login"
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mode: { label: "Mode", type: "text" }
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        const mode = String(credentials?.mode ?? "login");

        if (!email || !password) {
          throw new Error("Email and password are required.");
        }

        const existing = await prisma.user.findUnique({ where: { email } });

        if (mode === "signup") {
          if (existing) {
            throw new Error("An account already exists for this email.");
          }

          const user = await prisma.user.create({
            data: {
              email,
              passwordHash: hashPassword(password)
            }
          });

          return { id: user.id, email: user.email, role: user.role };
        }

        if (!existing || !verifyPassword(password, existing.passwordHash)) {
          throw new Error("Invalid email or password.");
        }

        return { id: existing.id, email: existing.email, role: existing.role };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub ?? "");
        session.user.role = String(token.role ?? "user");
      }
      return session;
    }
  }
});
