import { prisma } from '../lib/prisma';

export const findByClerkId = async (clerkId: string) => {
  return prisma.user.findUnique({
    where: { clerkId },
  });
};

export const findById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
  });
};

export const userRepository = {
  findByClerkId,
  findById,
};
