import BookmarkNotificationHooks from './hooks/BookmarkNotificationHooks';
import ChatHooks from './hooks/ChatHooks';
import ChatNotificationHooks from './hooks/ChatNotificationHooks';
import DiscordHooks from './hooks/DiscordHooks';
import HooksRegistry from './hooks/HooksRegistry';
import TagCleanupHooks from './hooks/TagCleanupHooks';

// Instantiate the application-global hookset list.
const GlobalHooks = new HooksRegistry();
// Add all hooksets.
GlobalHooks.addHookSet(DiscordHooks);
GlobalHooks.addHookSet(ChatNotificationHooks);
GlobalHooks.addHookSet(TagCleanupHooks);
GlobalHooks.addHookSet(ChatHooks);
GlobalHooks.addHookSet(BookmarkNotificationHooks);

export default GlobalHooks;
