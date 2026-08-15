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

export const eventRepository = {
  getEvent,
  updateEventStatus,
};
