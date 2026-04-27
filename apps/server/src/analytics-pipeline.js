const GA4_SERVER_MAPPING = {
  video_room_joined: 'room.joined',
  game_panel_opened: 'ui.game_panel.opened',
  game_created: 'game.created',
  game_started: 'game.started',
  round_started: 'round.started',
  guess_submitted: 'round.guess.submitted',
  round_completed: 'round.completed',
  game_completed: 'game.finished',
  vocab_mastered: 'learning.vocab.mastered',
  vocab_missed: 'learning.vocab.missed'
};

export function createAnalyticsPipeline(repositories) {
  let running = false;

  async function processQueue() {
    if (running) return;
    running = true;

    try {
      const pending = repositories.analytics.pullPending(100);
      for (const item of pending) {
        try {
          repositories.analytics.markDone(item.queueId);
        } catch {
          repositories.analytics.markRetry(item.queueId);
        }
      }
    } finally {
      running = false;
    }
  }

  function enqueueEvents(events) {
    for (const event of events) {
      repositories.analytics.enqueue(event);
    }
    setTimeout(() => {
      processQueue();
    }, 0);
  }

  function getDashboardSummary(roomId) {
    return repositories.analytics.summaryByRoom(roomId);
  }

  function verifyGa4Mapping() {
    return {
      mappingTable: GA4_SERVER_MAPPING,
      ...repositories.analytics.mappingCheck(GA4_SERVER_MAPPING)
    };
  }

  return {
    enqueueEvents,
    processQueue,
    getDashboardSummary,
    verifyGa4Mapping
  };
}
