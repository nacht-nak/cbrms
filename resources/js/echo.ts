import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

declare global {
    interface Window {
        Pusher: typeof Pusher;
        Echo: Echo<'pusher'>;
    }
}

window.Pusher = Pusher;

window.Echo = new Echo<'pusher'>({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY as string,
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER as string,
    forceTLS: true,
});

export default window.Echo;
