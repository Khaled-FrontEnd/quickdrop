import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import os from "os";

const router = Router();

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: number;
  data: Buffer;
}

const uploadedFiles = new Map<string, UploadedFile>();
let connectedClients = 0;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// Status endpoint
router.get("/status", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    connected: connectedClients,
    fileCount: uploadedFiles.size,
  });
});

// List files
router.get("/files", (req: Request, res: Response) => {
  const files = Array.from(uploadedFiles.values()).map(f => ({
    id: f.id,
    name: f.name,
    size: f.size,
    sizeFormatted: formatBytes(f.size),
    type: f.type,
    uploadedAt: f.uploadedAt,
  }));
  res.json({ files });
});

// Upload file (multipart)
router.post("/upload", async (req: Request, res: Response) => {
  try {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const boundary = (req.headers["content-type"] || "").split("boundary=")[1];
      if (!boundary) {
        res.status(400).json({ error: "No boundary" });
        return;
      }

      const body = Buffer.concat(chunks);
      const bodyStr = body.toString("binary");
      const parts = bodyStr.split(`--${boundary}`);
      const uploadedFilesList = [];

      for (const part of parts) {
        if (!part.includes("Content-Disposition")) continue;
        const headerEnd = part.indexOf("\r\n\r\n");
        if (headerEnd === -1) continue;

        const headers = part.slice(0, headerEnd);
        const nameMatch = headers.match(/filename="([^"]+)"/);
        const contentTypeMatch = headers.match(/Content-Type: ([^\r\n]+)/);

        if (!nameMatch) continue;

        const fileName = nameMatch[1];
        const contentType = contentTypeMatch ? contentTypeMatch[1].trim() : "application/octet-stream";

        const dataStart = headerEnd + 4;
        const dataEnd = part.length - 2;
        const dataStr = part.slice(dataStart, dataEnd);
        const data = Buffer.from(dataStr, "binary");

        const id = generateId();
        uploadedFiles.set(id, {
          id,
          name: fileName,
          size: data.length,
          type: contentType,
          uploadedAt: Date.now(),
          data,
        });

        uploadedFilesList.push({ id, name: fileName, size: data.length });
      }

      res.json({ success: true, files: uploadedFilesList });
    });
  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }
});

// Download file
router.get("/download/:id", (req: Request, res: Response) => {
  const file = uploadedFiles.get(req.params["id"] || "");
  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`);
  res.setHeader("Content-Type", file.type);
  res.setHeader("Content-Length", file.size.toString());
  res.send(file.data);
});

// Delete file
router.delete("/files/:id", (req: Request, res: Response) => {
  const deleted = uploadedFiles.delete(req.params["id"] || "");
  res.json({ success: deleted });
});

// Web UI - the beautiful landing page for laptop browser
router.get("/", (req: Request, res: Response) => {
  const files = Array.from(uploadedFiles.values()).map(f => ({
    id: f.id,
    name: f.name,
    size: f.size,
    sizeFormatted: formatBytes(f.size),
    type: f.type,
    uploadedAt: f.uploadedAt,
  }));

  connectedClients = 1;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QuickDrop</title>
<style>
  :root {
    --bg: #0A0F1E;
    --bg2: #0D1533;
    --card: #111827;
    --border: #1E293B;
    --primary: #3B9EFF;
    --primary-dark: #0A84FF;
    --text: #F1F5F9;
    --muted: #94A3B8;
    --success: #22C55E;
    --danger: #EF4444;
    --accent: #1E3A5F;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    min-height: 100vh;
  }
  .gradient-bg {
    background: linear-gradient(135deg, #0A0F1E 0%, #0D1533 50%, #0A1628 100%);
    min-height: 100vh;
  }
  .container { max-width: 900px; margin: 0 auto; padding: 32px 24px; }

  /* Header */
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 40px;
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .logo-icon {
    width: 44px; height: 44px;
    background: linear-gradient(135deg, #3B9EFF, #0055CC);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
  }
  .logo-text { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
  .status-badge {
    display: flex; align-items: center; gap: 8px;
    background: rgba(34,197,94,0.1);
    border: 1px solid rgba(34,197,94,0.3);
    padding: 8px 16px; border-radius: 20px;
    font-size: 13px; color: var(--success);
  }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--success); }

  /* Sections */
  .section { margin-bottom: 32px; }
  .section-title {
    font-size: 18px; font-weight: 600; margin-bottom: 16px;
    display: flex; align-items: center; gap: 8px;
  }
  .section-title span { font-size: 20px; }

  /* Upload Zone */
  .upload-zone {
    border: 2px dashed var(--primary);
    background: rgba(59,158,255,0.04);
    border-radius: 20px;
    padding: 52px 32px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }
  .upload-zone:hover, .upload-zone.drag-over {
    background: rgba(59,158,255,0.1);
    border-color: #60B0FF;
    transform: translateY(-2px);
  }
  .upload-icon { font-size: 48px; margin-bottom: 16px; }
  .upload-title { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
  .upload-subtitle { color: var(--muted); font-size: 14px; margin-bottom: 20px; }
  .upload-btn {
    background: linear-gradient(135deg, var(--primary), #0055CC);
    color: white; border: none; padding: 12px 28px;
    border-radius: 12px; font-size: 15px; font-weight: 600;
    cursor: pointer; transition: all 0.2s;
    display: inline-flex; align-items: center; gap: 8px;
  }
  .upload-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(59,158,255,0.3); }
  #fileInput { display: none; }

  /* Progress */
  .progress-container { display: none; margin-top: 16px; }
  .progress-bar {
    width: 100%; height: 6px;
    background: var(--border); border-radius: 3px; overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--primary), #60B0FF);
    border-radius: 3px;
    transition: width 0.3s;
    width: 0%;
  }
  .progress-text { font-size: 13px; color: var(--muted); margin-top: 8px; text-align: center; }

  /* File grid */
  .files-grid { display: flex; flex-direction: column; gap: 12px; }
  .file-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 16px 20px;
    display: flex; align-items: center; gap: 16px;
    transition: all 0.2s;
  }
  .file-card:hover { border-color: var(--primary); transform: translateY(-1px); }
  .file-icon {
    width: 46px; height: 46px;
    background: var(--accent);
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
  }
  .file-info { flex: 1; min-width: 0; }
  .file-name { font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .file-meta { color: var(--muted); font-size: 12px; margin-top: 3px; }
  .file-actions { display: flex; gap: 8px; flex-shrink: 0; }
  .btn-download, .btn-delete {
    padding: 8px 16px; border-radius: 10px;
    border: none; cursor: pointer;
    font-size: 13px; font-weight: 600;
    transition: all 0.2s;
    display: flex; align-items: center; gap: 6px;
  }
  .btn-download {
    background: rgba(59,158,255,0.15);
    color: var(--primary);
    border: 1px solid rgba(59,158,255,0.3);
  }
  .btn-download:hover { background: rgba(59,158,255,0.25); }
  .btn-delete {
    background: rgba(239,68,68,0.1);
    color: var(--danger);
    border: 1px solid rgba(239,68,68,0.2);
  }
  .btn-delete:hover { background: rgba(239,68,68,0.2); }

  /* Empty state */
  .empty-state {
    text-align: center; padding: 48px 32px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 20px;
  }
  .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.4; }
  .empty-title { font-size: 18px; font-weight: 600; color: var(--muted); }
  .empty-sub { font-size: 14px; color: var(--muted); margin-top: 8px; opacity: 0.7; }

  /* Toast */
  .toast {
    position: fixed; bottom: 24px; right: 24px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px 20px;
    font-size: 14px; font-weight: 500;
    transform: translateY(100px); opacity: 0;
    transition: all 0.3s;
    z-index: 100;
    display: flex; align-items: center; gap: 8px;
  }
  .toast.show { transform: translateY(0); opacity: 1; }
  .toast.success { border-color: rgba(34,197,94,0.4); color: var(--success); }
  .toast.error { border-color: rgba(239,68,68,0.4); color: var(--danger); }

  /* Drag overlay */
  .drag-overlay {
    position: fixed; inset: 0;
    background: rgba(59,158,255,0.1);
    border: 4px dashed var(--primary);
    display: none;
    align-items: center; justify-content: center;
    z-index: 50; font-size: 28px; font-weight: 700;
    pointer-events: none;
  }
  .drag-overlay.active { display: flex; }

  @media (max-width: 600px) {
    .file-actions { flex-direction: column; }
    .header { flex-direction: column; gap: 16px; align-items: flex-start; }
  }
</style>
</head>
<body>
<div class="gradient-bg">
<div class="container">
  <div class="header">
    <div class="logo">
      <div class="logo-icon">⚡</div>
      <span class="logo-text">QuickDrop</span>
    </div>
    <div class="status-badge">
      <div class="status-dot"></div>
      Server Active
    </div>
  </div>

  <!-- Upload Section -->
  <div class="section">
    <div class="section-title"><span>📤</span> Send Files to Phone</div>
    <div class="upload-zone" id="uploadZone">
      <div class="upload-icon">📁</div>
      <div class="upload-title">Drag & Drop files here</div>
      <div class="upload-subtitle">or click to browse files from your laptop</div>
      <button class="upload-btn" onclick="document.getElementById('fileInput').click()">
        ↑ Choose Files
      </button>
      <input type="file" id="fileInput" multiple />
      <div class="progress-container" id="progressContainer">
        <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
        <div class="progress-text" id="progressText">Uploading...</div>
      </div>
    </div>
  </div>

  <!-- Files Section -->
  <div class="section">
    <div class="section-title"><span>📥</span> Available Files (${files.length})</div>
    <div class="files-grid" id="filesGrid">
      ${
        files.length === 0
          ? `<div class="empty-state">
              <div class="empty-icon">📂</div>
              <div class="empty-title">No files available</div>
              <div class="empty-sub">Files added from the phone app will appear here for download</div>
            </div>`
          : files.map(f => `
            <div class="file-card" id="file-${f.id}">
              <div class="file-icon">${getFileEmoji(f.type, f.name)}</div>
              <div class="file-info">
                <div class="file-name">${escapeHtml(f.name)}</div>
                <div class="file-meta">${f.sizeFormatted} · Added ${timeAgo(f.uploadedAt)}</div>
              </div>
              <div class="file-actions">
                <button class="btn-download" onclick="downloadFile('${f.id}', '${escapeHtml(f.name)}')">
                  ↓ Download
                </button>
                <button class="btn-delete" onclick="deleteFile('${f.id}')">✕</button>
              </div>
            </div>`).join("")
      }
    </div>
  </div>
</div>
</div>

<!-- Drag overlay -->
<div class="drag-overlay" id="dragOverlay">Drop files to upload ⚡</div>

<!-- Toast -->
<div class="toast" id="toast"></div>

<script>
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const filesGrid = document.getElementById('filesGrid');
const dragOverlay = document.getElementById('dragOverlay');
const toast = document.getElementById('toast');

function showToast(msg, type = 'success') {
  toast.textContent = (type === 'success' ? '✓ ' : '✕ ') + msg;
  toast.className = 'toast ' + type + ' show';
  setTimeout(() => toast.className = 'toast', 3000);
}

function getFileEmoji(type, name) {
  if (!type) return '📄';
  if (type.startsWith('image/')) return '🖼';
  if (type.startsWith('video/')) return '🎬';
  if (type.startsWith('audio/')) return '🎵';
  if (type.includes('pdf')) return '📕';
  if (type.includes('zip') || name.endsWith('.zip')) return '🗜';
  if (name.endsWith('.apk')) return '📱';
  return '📄';
}

function timeAgoJs(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  if (h < 24) return h + 'h ago';
  return d + 'd ago';
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// File upload
async function uploadFiles(files) {
  progressContainer.style.display = 'block';
  progressFill.style.width = '0%';

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    progressText.textContent = 'Uploading ' + file.name + '...';

    const formData = new FormData();
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          progressFill.style.width = pct + '%';
        }
      });

      await new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status < 300) resolve(xhr.response);
          else reject(new Error('Upload failed: ' + xhr.status));
        };
        xhr.onerror = reject;
        xhr.open('POST', '/api/upload-simple');
        xhr.send(formData);
      });

      showToast(file.name + ' uploaded!');
    } catch (err) {
      showToast('Failed to upload ' + file.name, 'error');
    }

    progressFill.style.width = ((i + 1) / files.length * 100) + '%';
  }

  progressText.textContent = 'Done!';
  setTimeout(() => {
    progressContainer.style.display = 'none';
    location.reload();
  }, 800);
}

fileInput.addEventListener('change', e => {
  if (e.target.files.length) uploadFiles(Array.from(e.target.files));
});

uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  if (e.dataTransfer.files.length) uploadFiles(Array.from(e.dataTransfer.files));
});

// Global drag & drop
document.addEventListener('dragover', e => { e.preventDefault(); dragOverlay.classList.add('active'); });
document.addEventListener('dragleave', e => {
  if (!e.relatedTarget) dragOverlay.classList.remove('active');
});
document.addEventListener('drop', e => {
  e.preventDefault();
  dragOverlay.classList.remove('active');
  if (e.dataTransfer.files.length) uploadFiles(Array.from(e.dataTransfer.files));
});

function downloadFile(id, name) {
  const a = document.createElement('a');
  a.href = '/api/download/' + id;
  a.download = name;
  a.click();
  showToast('Downloading ' + name);
}

async function deleteFile(id) {
  if (!confirm('Remove this file?')) return;
  try {
    await fetch('/api/files/' + id, { method: 'DELETE' });
    document.getElementById('file-' + id)?.remove();
    showToast('File removed');
  } catch {
    showToast('Failed to remove', 'error');
  }
}

// Auto refresh files list every 5s
setInterval(async () => {
  try {
    const res = await fetch('/api/files');
    const data = await res.json();
    // Only reload if file count changed
  } catch {}
}, 5000);
</script>

<script>
function getFileEmoji(type, name) {
  if (!type) return '📄';
  if (type.startsWith('image/')) return '🖼️';
  if (type.startsWith('video/')) return '🎬';
  if (type.startsWith('audio/')) return '🎵';
  if (type.includes('pdf')) return '📕';
  if (type.includes('zip') || (name && name.endsWith('.zip'))) return '🗜️';
  return '📄';
}
function timeAgo(ts) {
  const d = Date.now() - ts;
  const m = Math.floor(d/60000);
  if (m < 1) return 'just now';
  if (m < 60) return m+'m ago';
  return Math.floor(m/60)+'h ago';
}
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
</script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

// Helper functions for template
function getFileEmoji(type: string, name: string): string {
  if (type.startsWith("image/")) return "🖼️";
  if (type.startsWith("video/")) return "🎬";
  if (type.startsWith("audio/")) return "🎵";
  if (type.includes("pdf")) return "📕";
  if (type.includes("zip") || name.endsWith(".zip")) return "🗜️";
  if (name.endsWith(".apk")) return "📱";
  return "📄";
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

// Simple multipart upload using Express body
router.post("/upload-simple", async (req: Request, res: Response) => {
  try {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const contentType = req.headers["content-type"] || "";
      const boundaryMatch = contentType.match(/boundary=(.+)/);
      if (!boundaryMatch) {
        res.status(400).json({ error: "No boundary" });
        return;
      }

      const boundary = boundaryMatch[1]!.trim();
      const body = Buffer.concat(chunks);

      const files: UploadedFile[] = [];
      let pos = 0;
      const delimBuf = Buffer.from(`--${boundary}`);

      while (pos < body.length) {
        const delimIdx = body.indexOf(delimBuf, pos);
        if (delimIdx === -1) break;
        pos = delimIdx + delimBuf.length;

        if (body[pos] === 45 && body[pos + 1] === 45) break; // --

        if (body[pos] === 13 && body[pos + 1] === 10) pos += 2; // \r\n

        const headerEnd = body.indexOf(Buffer.from("\r\n\r\n"), pos);
        if (headerEnd === -1) break;

        const headerStr = body.slice(pos, headerEnd).toString("utf8");
        pos = headerEnd + 4;

        const nameMatch = headerStr.match(/filename="([^"]+)"/i);
        const ctMatch = headerStr.match(/Content-Type:\s*([^\r\n]+)/i);
        if (!nameMatch) continue;

        const nextDelim = body.indexOf(delimBuf, pos);
        const dataEnd = nextDelim === -1 ? body.length : nextDelim - 2;
        const data = body.slice(pos, dataEnd);

        const id = generateId();
        const file: UploadedFile = {
          id,
          name: nameMatch[1]!,
          size: data.length,
          type: ctMatch ? ctMatch[1]!.trim() : "application/octet-stream",
          uploadedAt: Date.now(),
          data,
        };
        uploadedFiles.set(id, file);
        files.push(file);
        pos = nextDelim === -1 ? body.length : nextDelim;
      }

      res.json({ success: true, count: files.length });
    });
  } catch {
    res.status(500).json({ error: "Upload failed" });
  }
});

export default router;
