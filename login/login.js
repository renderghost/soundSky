import { BskyAgent } from 'https://esm.sh/@atproto/api';

const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const pdsInput = document.getElementById('pds-server');

async function sha256Hex(str) {
    const data = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    loginError.style.display = 'none';
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in…';

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const pds = pdsInput.value.trim() || 'https://bsky.social';

    // Banlist check
    try {
        const resp = await fetch('/login/banlist.txt');
        if (resp.ok) {
            const lines = (await resp.text()).split(/\r?\n/).map(u => u.trim().toLowerCase()).filter(Boolean);
            const userH = await sha256Hex(username.toLowerCase());
            const pdsH = await sha256Hex(pds.toLowerCase());

            if (lines.includes(userH)) {
                loginError.textContent = 'Account is banned 🛑';
                usernameInput.setAttribute('aria-invalid', 'true');
                throw new Error('banned');
            }
            if (lines.includes(pdsH)) {
                loginError.textContent = 'PDS is banned 🛑';
                pdsInput.setAttribute('aria-invalid', 'true');
                throw new Error('banned');
            }
        }
    } catch { }

    // Attempt login
    try {
        localStorage.setItem('bskyPds', pds);
        const agent = new BskyAgent({ service: pds });
        await agent.login({ identifier: username, password });
        localStorage.setItem('bskySession', JSON.stringify(agent.session));
        window.location.href = '/';
    } catch (err) {
        if (err.message !== 'banned') {
            loginError.textContent = '🛑 ' + (err.message || err);
            usernameInput.setAttribute('aria-invalid', 'true');
            passwordInput.setAttribute('aria-invalid', 'true');
        }
        loginError.style.display = 'block';
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
    }
});

// Clear error on user input
loginForm.addEventListener('input', e => {
    if (e.target.matches('input')) {
        e.target.removeAttribute('aria-invalid');
    }
});
