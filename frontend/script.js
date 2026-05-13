const btn = document.getElementById('translateBtn');
const source = document.getElementById('source');
const target = document.getElementById('target');
const result = document.getElementById('result');
const historyList = document.getElementById('history');

btn.addEventListener('click', async () => {
    const text = source.value.trim();
    if (!text) return;
    result.textContent = 'Translating...';
    try {
        const res = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, target: target.value })
        });
        const data = await res.json();
        result.textContent = data.translatedText;
        loadHistory();
    } catch (err) {
        result.textContent = 'Error: ' + err.message;
    }
});

async function loadHistory() {
    const res = await fetch('/api/history');
    const data = await res.json();
    historyList.innerHTML = data.map(t => '<li>' + t.source_text + ' -> ' + t.translated_text + '</li>').join('');
}

loadHistory();