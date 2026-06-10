import { useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import './PdfTool.css'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const QUALITY_PRESETS = [
  { label: 'High (light)', quality: 0.85, scale: 1.5, desc: '~40% smaller' },
  { label: 'Medium', quality: 0.65, scale: 1.2, desc: '~65% smaller' },
  { label: 'Low (max)', quality: 0.45, scale: 1.0, desc: '~80% smaller' },
]

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

async function renderPageToJpeg(page, scale, quality) {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
  return new Promise(resolve => canvas.toBlob(blob => blob.arrayBuffer().then(resolve), 'image/jpeg', quality))
}

export default function PdfTool() {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [preset, setPreset] = useState(0)
  const [mode, setMode] = useState('compress') // 'compress' | 'images'
  const [progress, setProgress] = useState(null) // null | { current, total }
  const [result, setResult] = useState(null) // { url, name, size, originalSize }
  const [dragging, setDragging] = useState(false)

  async function loadFile(f) {
    if (!f?.name.toLowerCase().endsWith('.pdf')) return
    const buf = await f.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise  // buf gets transferred to worker
    setFile({ file: f, size: f.size })  // store File only; buf is detached after transfer
    setPageCount(pdf.numPages)
    setResult(null)
    setProgress(null)
  }

  async function handleCompress() {
    if (!file) return
    const { quality, scale } = QUALITY_PRESETS[preset]
    const pdf = await pdfjsLib.getDocument({ data: await file.file.arrayBuffer() }).promise
    const outDoc = await PDFDocument.create()
    setProgress({ current: 0, total: pdf.numPages })

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const vp = page.getViewport({ scale })
      const jpegBuf = await renderPageToJpeg(page, scale, quality)
      const img = await outDoc.embedJpg(jpegBuf)
      const p = outDoc.addPage([vp.width, vp.height])
      p.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height })
      setProgress({ current: i, total: pdf.numPages })
    }

    const bytes = await outDoc.save()
    const blob = new Blob([bytes], { type: 'application/pdf' })
    const name = file.file.name.replace('.pdf', '_compressed.pdf')
    setResult({ url: URL.createObjectURL(blob), name, size: bytes.byteLength, originalSize: file.size })
    setProgress(null)
  }

  async function handleExportImages() {
    if (!file) return
    const pdf = await pdfjsLib.getDocument({ data: await file.file.arrayBuffer() }).promise
    const { scale } = QUALITY_PRESETS[preset]
    setProgress({ current: 0, total: pdf.numPages })

    // Use JSZip-free approach: export as individual downloads or single zip via streaming
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    const baseName = file.file.name.replace('.pdf', '')

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'))
      const buf = await blob.arrayBuffer()
      zip.file(`${baseName}_page${String(i).padStart(3, '0')}.png`, buf)
      setProgress({ current: i, total: pdf.numPages })
    }

    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
    const name = `${file.file.name.replace('.pdf', '')}_pages.zip`
    setResult({ url: URL.createObjectURL(zipBlob), name, size: zipBlob.size, originalSize: file.size, isZip: true })
    setProgress(null)
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) loadFile(f)
  }

  const busy = progress !== null

  return (
    <div className="pdf-wrapper">
      <div className="pdf-header">
        <h2>PDF Tools</h2>
        <p className="pdf-sub">Runs entirely in your browser — no upload, no server.</p>
      </div>

      <div
        className={`drop-zone ${dragging ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
        onClick={() => !file && inputRef.current.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {file ? (
          <div className="file-info">
            <span className="file-icon">PDF</span>
            <div>
              <p className="file-name">{file.file.name}</p>
              <p className="file-meta">{pageCount} pages · {formatBytes(file.size)}</p>
            </div>
            <button className="clear-btn" onClick={e => { e.stopPropagation(); setFile(null); setResult(null); setPageCount(0) }}>✕</button>
          </div>
        ) : (
          <div className="drop-hint">
            <span className="drop-icon">⬆</span>
            <p>Drop PDF here or click to select</p>
          </div>
        )}
        <input ref={inputRef} type="file" accept=".pdf" hidden onChange={e => loadFile(e.target.files[0])} />
      </div>

      {file && (
        <div className="pdf-controls">
          <div className="mode-tabs">
            <button className={mode === 'compress' ? 'mode-btn active' : 'mode-btn'} onClick={() => { setMode('compress'); setResult(null) }}>Compress PDF</button>
            <button className={mode === 'images' ? 'mode-btn active' : 'mode-btn'} onClick={() => { setMode('images'); setResult(null) }}>Export as Images</button>
          </div>

          <div className="preset-group">
            {QUALITY_PRESETS.map((p, i) => (
              <button key={i} className={preset === i ? 'preset-btn active' : 'preset-btn'} onClick={() => setPreset(i)} disabled={busy}>
                <span>{p.label}</span>
                <span className="preset-desc">{p.desc}</span>
              </button>
            ))}
          </div>

          <button
            className="run-btn"
            onClick={mode === 'compress' ? handleCompress : handleExportImages}
            disabled={busy}
          >
            {busy
              ? `Processing page ${progress.current} / ${progress.total}…`
              : mode === 'compress' ? 'Compress' : 'Export Pages as PNG'}
          </button>

          {busy && (
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="result-box">
          <div className="result-info">
            <span className="result-label">Done</span>
            {!result.isZip && (
              <>
                <span>{formatBytes(result.originalSize)} → <strong>{formatBytes(result.size)}</strong></span>
                <span className="result-savings" style={{ color: '#22c55e' }}>
                  −{Math.round((1 - result.size / result.originalSize) * 100)}%
                </span>
              </>
            )}
            {result.isZip && <span>{result.name}</span>}
          </div>
          <a className="download-btn" href={result.url} download={result.name}>Download</a>
        </div>
      )}
    </div>
  )
}
