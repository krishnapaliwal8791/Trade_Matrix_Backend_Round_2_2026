import { prisma } from '../lib/prisma';
import { EventStatus } from '@prisma/client';

const getEvent = async () => {
  return prisma.event.findUnique({
    where: { isSingleton: true },
  });
};

const updateEventStatus = async (
  currentStatus: EventStatus,
  newStatus: EventStatus,
  updates: any
) => {
  return prisma.event.updateMany({
    where: {
      isSingleton: true,
      status: currentStatus,
    },
    data: {
      status: newStatus,
      ...updates,
    },
  });
};

const getActiveNewsBundle = async () => {
  const event = await prisma.event.findUnique({
    where: { isSingleton: true },
    select: {
      ActiveNewsBundle: {
        select: {
          id: true,
          title: true,
          releasedAt: true,
        },
      },
    },
  });

  return event?.ActiveNewsBundle || null;
};

export const eventRepository = {
  getEvent,
  updateEventStatus,
  getActiveNewsBundle,
};
