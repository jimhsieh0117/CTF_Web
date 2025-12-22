// ==========================================
// Shared Dialog & Story Utils
// Used by index.html and submit.html
// ==========================================

// --- Modal UI ---
function openStoryModal(title, bodyText, options = {}) {
    const overlay = document.getElementById('ctf-modal-overlay');
    const t = document.getElementById('modal-title');
    const b = document.getElementById('modal-body');
    const footer = document.getElementById('modal-footer');

    if (t) t.textContent = title;
    if (b) {
        // Use custom lightweight markdown renderer
        b.innerHTML = renderMarkdown(bodyText);
    }

    // 處理下載按鈕
    if (footer) {
        if (options.downloadUrl && options.downloadLabel) {
            footer.innerHTML = `<a href="${options.downloadUrl}" download class="btn btn-secondary" style="font-size:0.9rem;">${options.downloadLabel}</a>`;
            footer.style.display = 'block';
        } else {
            footer.innerHTML = '';
            footer.style.display = 'none';
        }
    }

    if (overlay) overlay.classList.add('open');
}

// Simple Markdown Renderer
function renderMarkdown(text) {
    if (!text) return '';
    return text
        .split('\n')
        .map(line => {
            let processed = line.trim();
            if(!processed) return '<br>'; // Preserve empty lines as spacing

            // Blockquotes
            if (processed.startsWith('> ')) {
                return `<blockquote>${applyInlineStyles(processed.slice(2))}</blockquote>`;
            }

            // Standard paragraphs
            return `<p>${applyInlineStyles(processed)}</p>`;
        })
        .join('');
}

function applyInlineStyles(text) {
    // Bold: **text**
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

function closeStoryModal() {
    const overlay = document.getElementById('ctf-modal-overlay');
    if (overlay) overlay.classList.remove('open');
}

// Bind Global Events for Modal
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('ctf-modal-overlay');
    const closeBtn = document.querySelector('.ctf-modal-close');
    
    // Close on overlay click
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeStoryModal();
        });
    }
    
    // Close on X button click
    if (closeBtn) {
        closeBtn.addEventListener('click', closeStoryModal);
    }

    // Close on Esc key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeStoryModal();
    });
});


// --- Story Parsing Utils ---

function cleanStoryBodyLines(lines) {
    return lines
        .filter((line) => {
            const t = String(line || '').trim();
            if (!t) return true;
            if (t.includes('（對應') || t.includes('（可以移除）')) return false;
            return true;
        })
        .join('\n')
        .trim();
}

function parseStoryMarkdown(md) {
    const lines = String(md || '').replaceAll('\r\n', '\n').split('\n');
    const headings = [];
    
    // 1. Identify all Chapter headings
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/^##\s+(.*)\s*$/);
        if (m) headings.push({ idx: i, title: m[1] });
    }

    // 2. Helper to extract content between headings
    function extractByKeyword(keyword) {
        const start = headings.find((h) => h.title.includes(keyword));
        if (!start) return null;
        
        const startLine = start.idx + 1;
        const next = headings.find((h) => h.idx > start.idx);
        const endLine = next ? next.idx - 1 : lines.length - 1;
        
        const body = cleanStoryBodyLines(lines.slice(startLine, endLine + 1));
        return { title: start.title, body };
    }

    return {
        ch1: extractByKeyword('第一章'), // Added for Index page
        ch2: extractByKeyword('第二章'),
        ch3: extractByKeyword('第三章'),
        ep: extractByKeyword('尾聲'),
    };
}
