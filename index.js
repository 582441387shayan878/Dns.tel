const BOT_TOKEN = '8348647078:AAHDYSmvFl6-coP2lWrrnhw40T4p36pI8o0';
const WG_DNS = '37.32.123.23, 37.32.123.30';
const WG_ENDPOINT = 'ns2.arbital.ru:8443';
const WG_MTU = '1300';
const WG_PERSISTENT_KEEPALIVE = '11';

const COUNTRIES = [
    "United States", "Canada", "United Kingdom", "Germany", "France",
    "Italy", "Spain", "Netherlands", "Sweden", "Switzerland",
    "Norway", "Denmark", "Finland", "Belgium", "Austria",
    "Ireland", "Portugal", "Poland", "Russia", "Ukraine",
    "Turkey", "Greece", "Romania", "Hungary", "Czech Republic",
    "Japan", "South Korea", "China", "Singapore", "Hong Kong",
    "Taiwan", "Australia", "New Zealand", "India", "Brazil",
    "Mexico", "Argentina", "Chile", "South Africa", "Egypt",
    "Israel", "Saudi Arabia", "UAE", "Qatar", "Malaysia",
    "Thailand", "Vietnam", "Indonesia", "Philippines", "Pakistan"
];

async function handleRequest(request) {
    if (request.method === 'POST') {
        try {
            const update = await request.json();
            await handleUpdate(update);
            return new Response('OK', { status: 200 });
        } catch (error) {
            return new Response('Error', { status: 500 });
        }
    }
    return new Response('Method not allowed', { status: 405 });
}

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

function generateWireguardKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 42; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result + "c=";
}

function generateRandomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function generateRandomPort() {
    return Math.floor(Math.random() * 65535);
}

function generateWireguardConfig() {
    const privateKey = generateWireguardKey();
    const publicKey = generateWireguardKey();
    const preSharedKey = generateWireguardKey();
    
    const address = `${generateRandomIP()}/32`;
    const listenPort = generateRandomPort();
    
    const allowedIPs = [];
    for (let i = 0; i < 4; i++) {
        allowedIPs.push(`${generateRandomIP()}/32`);
    }
    
    return `[Interface]
Address = ${address}
DNS = ${WG_DNS}
ListenPort = ${listenPort}
MTU = ${WG_MTU}
PrivateKey = ${privateKey}

[Peer]
AllowedIPs = ${allowedIPs.join(', ')}
Endpoint = ${WG_ENDPOINT}
PersistentKeepalive = ${WG_PERSISTENT_KEEPALIVE}
PreSharedKey = ${preSharedKey}
PublicKey = ${publicKey}`;
}

async function sendTelegramMessage(chatId, text, replyMarkup = null) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const body = {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
    };
    
    if (replyMarkup) {
        body.reply_markup = replyMarkup;
    }
    
    await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
}

function createCountriesKeyboard(page = 0, perPage = 10, type = 'dns') {
    const start = page * perPage;
    const end = start + perPage;
    const countries = COUNTRIES.slice(start, end);
    
    const buttons = countries.map(country => ({
        text: `🌏 ${country}`,
        callback_data: `${type}_${country}`
    }));
    
    const keyboard = [];
    
    for (let i = 0; i < buttons.length; i += 2) {
        const row = [buttons[i]];
        if (i + 1 < buttons.length) {
            row.push(buttons[i + 1]);
        }
        keyboard.push(row);
    }
    
    const paginationButtons = [];
    if (page > 0) {
        paginationButtons.push({
            text: '⬅️ قبلی',
            callback_data: `${type}_page_${page - 1}`
        });
    }
    
    if (end < COUNTRIES.length) {
        paginationButtons.push({
            text: '➡️ بعدی',
            callback_data: `${type}_page_${page + 1}`
        });
    }
    
    if (paginationButtons.length > 0) {
        keyboard.push(paginationButtons);
    }
    
    keyboard.push([{
        text: '🔙 برگشت به منو',
        callback_data: 'back_to_menu'
    }]);
    
    return {
        inline_keyboard: keyboard
    };
}

async function showMainMenu(chatId) {
    const keyboard = {
        inline_keyboard: [
            [{ text: 'ساخت DNS', callback_data: 'create_dns' }],
            [{ text: 'ساخت Wireguard', callback_data: 'create_wireguard' }]
        ]
    };
    
    await sendTelegramMessage(chatId, '🔰 به ربات ساخت DNS و Wireguard خوش آمدید! لطفاً یکی از گزینه‌ها را انتخاب کنید:', keyboard);
}

async function handleUpdate(update) {
    if (!update) return;
    
    if (update.callback_query) {
        const data = update.callback_query.data;
        const chatId = update.callback_query.message.chat.id;
        
        if (data === 'back_to_menu') {
            return await showMainMenu(chatId);
        }
        
        if (data.startsWith('dns_')) {
            const country = data.replace('dns_', '');
            const dns = generateRandomIP();
            const message = `🌍 کشور: ${country}\n\n🔢 DNS: <code>${dns}</code>\n\nمی‌توانید این DNS را کپی کنید.`;
            
            await sendTelegramMessage(chatId, message, {
                inline_keyboard: [
                    [{ text: '🔙 برگشت به منو', callback_data: 'back_to_menu' }]
                ]
            });
            return;
        }
        
        if (data.startsWith('wireguard_')) {
            const country = data.replace('wireguard_', '');
            const config = generateWireguardConfig();
            const message = `🌍 کشور: ${country}\n\n<code>${config}</code>\n\nمی‌توانید این کانفیگ را کپی کنید.`;
            
            await sendTelegramMessage(chatId, message, {
                inline_keyboard: [
                    [{ text: '🔙 برگشت به منو', callback_data: 'back_to_menu' }]
                ]
            });
            return;
        }
        
        if (data.startsWith('dns_page_') || data.startsWith('wireguard_page_')) {
            const parts = data.split('_');
            const type = parts[0];
            const page = parseInt(parts[2]);
            
            return await sendTelegramMessage(chatId, `🌏 لطفاً کشور مورد نظر را انتخاب کنید:`, 
                createCountriesKeyboard(page, 10, type));
        }
        
        if (data === 'create_dns') {
            return await sendTelegramMessage(chatId, `🌏 لطفاً کشور مورد نظر را انتخاب کنید:`, 
                createCountriesKeyboard(0, 10, 'dns'));
        }
        
        if (data === 'create_wireguard') {
            return await sendTelegramMessage(chatId, `🌏 لطفاً کشور مورد نظر را انتخاب کنید:`, 
                createCountriesKeyboard(0, 10, 'wireguard'));
        }
    }
    
    if (update.message?.text === '/start') {
        const userId = update.message.from.id;
        return await showMainMenu(userId);
    }
}