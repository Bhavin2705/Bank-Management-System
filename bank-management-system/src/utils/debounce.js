// Minimal debounce utility used across the app
export default function debounce(fn, wait = 300) {
    let timer = null;
    return function (...args) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            try {
                fn.apply(this, args);
            } catch (e) {
                console.error('Debounced function error:', e);
            }
            timer = null;
        }, wait);
    };
}
