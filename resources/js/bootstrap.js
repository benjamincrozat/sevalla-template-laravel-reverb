import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.axios = axios;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

window.Pusher = Pusher;

const appKey = import.meta.env.VITE_REVERB_APP_KEY;
const host = import.meta.env.VITE_REVERB_HOST;
const scheme = import.meta.env.VITE_REVERB_SCHEME || 'https';
const wsPort = scheme === 'https' ? 443 : 80;

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: appKey,
    wsHost: host,
    wsPort: wsPort,
    wssPort: 443,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
});
