let prismaInstance: any;

function createMissingProxy() {
  return new Proxy(
    {},
    {
      get() {
        throw new Error("@prisma/client is required. Run npm install and prisma generate before deployment.");
      }
    }
  );
}

export function getPrisma() {
  if (prismaInstance) return prismaInstance;

  try {
    const PrismaClientCtor = eval("require")("@prisma/client").PrismaClient;
    prismaInstance = new PrismaClientCtor();
  } catch {
    prismaInstance = createMissingProxy();
  }

  return prismaInstance;
}
