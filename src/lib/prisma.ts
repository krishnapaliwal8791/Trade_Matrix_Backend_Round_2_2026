import { PrismaClient, Prisma } from '@prisma/client';
import { env } from '../config/env';
import { logger } from './logger';

const prismaClientSingleton = () => {
  const logLevels: Prisma.LogLevel[] = ['error'];
  if (env.LOG_DB_QUERIES) {
    logLevels.push('query', 'info', 'warn');
  }

  return new PrismaClient({ log: logLevels });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const disconnectPrisma = async () => {
  try {
    await prisma.$disconnect();
    logger.info('Prisma disconnected successfully.');
  } catch (error) {
    logger.error({ err: error }, 'Error disconnecting Prisma.');
  }
};
