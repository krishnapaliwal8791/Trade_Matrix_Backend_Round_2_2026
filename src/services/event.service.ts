import { eventRepository } from '../repositories/event.repository';
import { AppError } from '../utils/AppError';

const getEvent = async () => {
  const event = await eventRepository.getEvent();
  if (!event) {
    throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  }

  return {
    status: event.status,
    activeNewsBundleId: event.activeNewsBundleId,
    leaderboardVisible: event.leaderboardVisible,
  };
};

const startEvent = async () => {
  const result = await eventRepository.updateEventStatus('DATA_IMPORTED', 'LIVE', {
    activeNewsBundleId: null,
    leaderboardVisible: false,
  });

  if (result.count === 0) {
    throw new AppError('Event must be in DATA_IMPORTED state to start', 409, 'INVALID_EVENT_STATE');
  }
};

export const eventService = {
  getEvent,
  startEvent,
};
