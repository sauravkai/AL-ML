import test from 'node:test';
import assert from 'node:assert/strict';

const makeWindowMock = () => {
  const store = new Map();

  const localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };

  const win = {
    localStorage,
    dispatchEvent: () => {},
  };

  globalThis.window = win;
  globalThis.localStorage = localStorage;
  return win;
};

const resetWindow = () => {
  delete globalThis.window;
  delete globalThis.localStorage;
};

test('live-room notification is added to the bell list for the target user', async () => {
  makeWindowMock();

  const { addLiveRoomNotification, getNotificationsForUser } = await import('./notifications.js');

  addLiveRoomNotification('room-123', {
    title: 'Live room invite sent',
    message: 'Join your live interview room',
    recipientEmail: 'Candidate@Example.com',
    candidateEmail: 'candidate@example.com',
    actionUrl: '/live-room/room-123',
  });

  const notifications = getNotificationsForUser('candidate@example.com');
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, 'live-room-invite');
  assert.equal(notifications[0].actionUrl, '/live-room/room-123');

  resetWindow();
});
