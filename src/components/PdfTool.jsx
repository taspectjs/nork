import { useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { compress } from '@quicktoolsone/pdf-compress'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import './PdfTool.css'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const PRESETS = [
  { label: 'Lossless', preset: 'lossless', desc: 'Text & structure only' },
  { label: 'Balanced', preset: 'balanced', desc: 'Smart auto-strategy' },
  { label: 'Max', preset: 'max', desc: 'Smallest file' },
]

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

export default function PdfTool() {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [preset, setPreset] = useState(1)
  const [mode, setMode] = useState('compress')
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState(null)
  const [dragging, setDragging] = useState(false)

  async function loadFile(f) {
    if (!f?.name.toLowerCase().endsWith('.pdf')) return
    const buf = await f.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise
    setFile({ file: f, size: f.size })
    setPageCount(pdf.numPages)
    setResult(null)
    setProgress(null)
  }

  async function handleCompress() {
    if (!file) return
    setProgress({ pct: 0, message: 'Starting…' })
    try {
      const buf = await file.file.arrayBuffer()
      const res = await compress(buf, {
        preset: PRESETS[preset].preset,
        onProgress: (e) => setProgress({ pct: e.progress, message: e.message || '' }),
      })
      const blob = new Blob([res.pdf], { type: 'application/pdf' })
      const name = file.file.name.replace(/\.pdf$/i, '_compressed.pdf')
      const larger = res.stats.compressedSize >= res.stats.originalSize
      setResult({ url: URL.createObjectURL(blob), name, size: res.stats.compressedSize, originalSize: res.stats.originalSize, larger })
    } catch (e) {
      setResult({ error: e.message || 'Compression failed' })
    }
    setProgress(null)
  }

  async function handleExportImages() {
    if (!file) return
    const pdf = await pdfjsLib.getDocument({ data: await file.file.arrayBuffer() }).promise
    setProgress({ pct: 0, message: 'Rendering pages…' })
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    const baseName = file.file.name.replace(/\.pdf$/i, '')
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = document.createElement('canvas')
      canvas.width = viewport.width
      canvas.height = viewport.height
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
      const blob = await new Promise(r => canvas.toBlob(r, 'image/png'))
      zip.file(`${baseName}_page${String(i).padStart(3, '0')}.png`, await blob.arrayBuffer())
      setProgress({ pct: Math.round((i / pdf.numPages) * 100), message: `Page ${i} / ${pdf.numPages}` })
    }
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
    const name = `${baseName}_pages.zip`
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

          {mode === 'compress' && (
            <div className="preset-group">
              {PRESETS.map((p, i) => (
                <button key={i} className={preset === i ? 'preset-btn active' : 'preset-btn'} onClick={() => setPreset(i)} disabled={busy}>
                  <span>{p.label}</span>
                  <span className="preset-desc">{p.desc}</span>
                </button>
              ))}
            </div>
          )}

          <button className="run-btn" onClick={mode === 'compress' ? handleCompress : handleExportImages} disabled={busy}>
            {busy ? progress.message || 'Processing…' : mode === 'compress' ? 'Compress' : 'Export Pages as PNG'}
          </button>

          {busy && (
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progress.pct}%` }} />
            </div>
          )}
        </div>
      )}

      {result?.error && (
        <div className="result-box result-warn">
          <span className="result-label warn">Error</span>
          <span className="result-hint">{result.error}</span>
        </div>
      )}

      {result && !result.error && (
        <div className={`result-box ${result.larger ? 'result-warn' : ''}`}>
          <div className="result-info">
            {!result.isZip && !result.larger && (
              <>
                <span className="result-label">Done</span>
                <span>{formatBytes(result.originalSize)} → <strong>{formatBytes(result.size)}</strong></span>
                <span className="result-savings">−{Math.round((1 - result.size / result.originalSize) * 100)}%</span>
              </>
            )}
            {!result.isZip && result.larger && (
              <>
                <span className="result-label warn">Already optimal</span>
                <span>{formatBytes(result.originalSize)} → <strong>{formatBytes(result.size)}</strong></span>
                <span className="result-hint">PDF is already well-compressed</span>
              </>
            )}
            {result.isZip && <><span className="result-label">Done</span><span>{result.name}</span></>}
          </div>
          <a className="download-btn" href={result.url} download={result.name}>Download</a>
        </div>
      )}
    </div>
  )
}
