function simpleMarkdown(text) {
    if (!text) return '';

    let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');

    const tableRegex = /\|(.+)\|[\s\S]*?(\n\|[-:| ]+\|)?([\s\S]*?)\n\n/g;
    html = html.replace(tableRegex, (match) => {
        const lines = match.trim().split('\n').filter(l => l.trim() && !/^\|[-:| ]+\|$/.test(l));
        if (lines.length === 0) return match;

        const headers = lines[0].split('|').map(c => c.trim()).filter(c => c);
        if (headers.length === 0) return match;

        let table = '<table ><thead><tr>';
        headers.forEach(h => table += `<th>${h}</th>`);
        table += '</tr></thead><tbody>';

        for (let i = 1; i < lines.length; i++) {
            const cells = lines[i].split('|').map(c => c.trim()).filter(c => c);
            table += '<tr>';
            cells.forEach(c => table += `<td>${c}</td>`);
            table += '</tr>';
        }
        table += '</tbody></table>';
        return table + '\n';
    });

    return html.split('\n').join('<br>');
}

function addAIMessage(html) {
    const chatMessages = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message ai';
    msgDiv.innerHTML = `<div class="message-bubble markdown">${html}</div>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addUserMessage(text) {
    const chatMessages = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message user';
    msgDiv.innerHTML = `<div class="message-bubble">${text.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
    const chatMessages = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message ai';
    msgDiv.id = 'typing-indicator';
    msgDiv.innerHTML = `<div class="message-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTyping() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
}

function sendChatQuestion(question) {
    if (!question.trim()) return;

    addUserMessage(question);
    document.getElementById('chat-input').value = '';
    showTyping();

    fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
    })
        .then(res => res.json())
        .then(data => {
            removeTyping();
            if (data.error) {
                addAIMessage(`Sorry, I couldn't process that: ${data.error}`);
            } else {
                addAIMessage(simpleMarkdown(data.response));
            }
        })
        .catch(err => {
            removeTyping();
            addAIMessage("I'm having trouble connecting to the analytics engine. Please try again.");
            console.error('AI chat error:', err);
        });
}

document.addEventListener('DOMContentLoaded', function () {
    const sendBtn = document.getElementById('chat-send');
    const input = document.getElementById('chat-input');

    function handleSend() {
        sendChatQuestion(input.value);
    }

    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') handleSend();
    });

    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('suggest-btn')) {
            sendChatQuestion(e.target.dataset.question);
        }
    });
});