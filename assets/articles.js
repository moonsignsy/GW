// 内容中心：列表 + 阅读量上报。详情接口需登录，正文用列表字段与附件预览。

const ARTICLE_API_BASE = 'https://shturl.qishuikang.com/prod-api'
const ARTICLE_LIST_API = `${ARTICLE_API_BASE}/business/websiteContent/list`
const ARTICLE_READ_COUNT_API = `${ARTICLE_API_BASE}/business/websiteContent/readCount`
const ARTICLE_FILE_PREVIEW_API = `${ARTICLE_API_BASE}/business/websiteContent/file/preview`
const PDFJS_WORKER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'

if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC
}

document.addEventListener('DOMContentLoaded', () => {
  initArticlesPreview()
  initArticlesList()
  initArticleDetail()
})

let articleListPromise = null

function loadArticleList() {
  if (!articleListPromise) {
    articleListPromise = fetchArticleList().catch((err) => {
      articleListPromise = null
      throw err
    })
  }
  return articleListPromise
}

function pickField(obj, keys) {
  for (const key of keys) {
    const value = obj?.[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return ''
}

function unwrapApiData(payload) {
  if (payload == null) return payload
  if (Array.isArray(payload)) return payload
  if (typeof payload !== 'object') return payload
  if (payload.data !== undefined) return unwrapApiData(payload.data)
  if (payload.result !== undefined) return unwrapApiData(payload.result)
  return payload
}

function extractArticleArray(payload) {
  const data = unwrapApiData(payload)
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  const nested = data.records || data.list || data.rows || data.items || data.content
  return Array.isArray(nested) ? nested : []
}

function isApiSuccess(res, payload) {
  if (!res.ok) return false
  if (!payload || typeof payload !== 'object') return true
  if (typeof payload.success === 'boolean') return payload.success
  if (typeof payload.code === 'undefined') return true
  const code = Number(payload.code)
  return code === 200 || code === 0
}

function isPublished(raw) {
  const status = String(raw?.status || '').toLowerCase()
  return !status || status === 'published'
}

function normalizeArticle(raw, fallbackId) {
  if (!raw || typeof raw !== 'object') return null
  const title = String(pickField(raw, ['title', 'articleTitle', 'name', 'headline']))
  if (!title) return null
  const id = pickField(raw, ['id', 'articleId', 'contentId'])
  const viewsRaw = pickField(raw, ['readCount', 'views', 'readNum', 'viewCount', 'hits', 'pv', 'readingCount'])
  const fileUrl = String(pickField(raw, ['fileUrl', 'ossUrl', 'url']))
  const fileName = String(pickField(raw, ['fileName', 'originalName', 'name']))
  return {
    id: id !== '' ? String(id) : String(fallbackId || ''),
    title,
    excerpt: String(pickField(raw, ['summary', 'excerpt', 'abstract', 'digest', 'intro', 'description', 'brief'])),
    date: pickField(raw, ['publishTime', 'publishDate', 'date', 'createTime', 'createdAt', 'gmtCreate', 'releaseDate']),
    views: Number(viewsRaw) || 0,
    fileUrl,
    fileName,
    fileSize: Number(pickField(raw, ['fileSize', 'size'])) || 0,
    previewUrl: id !== '' ? `${ARTICLE_FILE_PREVIEW_API}/${encodeURIComponent(id)}` : '',
  }
}

function formatDate(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'number' || /^\d{10,13}$/.test(String(value).trim())) {
    const num = Number(value)
    const date = new Date(num < 1e12 ? num * 1000 : num)
    if (!Number.isNaN(date.getTime())) {
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
    }
  }
  const text = String(value).trim()
  const match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (match) return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`
  return text
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function fetchApiJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { Accept: 'application/json', ...(options.headers || {}) },
  })
  const rawText = await res.text()
  let payload = null
  try {
    payload = rawText ? JSON.parse(rawText) : null
  } catch {
    payload = null
  }
  if (!isApiSuccess(res, payload)) {
    throw new Error('接口请求失败')
  }
  return payload
}

async function fetchArticleList() {
  const pageSize = 100
  const collected = []
  let pageNum = 1
  let total = Infinity

  while (pageNum <= 50) {
    const params = new URLSearchParams({
      pageNum: String(pageNum),
      pageSize: String(pageSize),
      status: 'published',
    })
    const payload = await fetchApiJson(`${ARTICLE_LIST_API}?${params}`)
    if (pageNum === 1 && payload && typeof payload.total !== 'undefined') {
      total = Number(payload.total) || 0
    }
    const batch = extractArticleArray(payload)
      .filter(isPublished)
      .map((item, index) => normalizeArticle(item, collected.length + index + 1))
      .filter(Boolean)
    collected.push(...batch)
    if (!batch.length || collected.length >= total || batch.length < pageSize) break
    pageNum += 1
  }
  return collected
}

async function incrementReadCount(id) {
  if (!id) return false
  try {
    await fetchApiJson(`${ARTICLE_READ_COUNT_API}/${encodeURIComponent(id)}`, { method: 'POST' })
    return true
  } catch {
    return false
  }
}

async function fetchArticleDetail(id) {
  const list = await loadArticleList()
  const article = list.find((item) => String(item.id) === String(id)) || null
  if (!article) return null
  const counted = await incrementReadCount(id)
  if (counted) article.views += 1
  return article
}

function renderArticleCard(article) {
  if (!article?.id) {
    return `
      <article class="article-card">
        <h3 class="article-card__title">${escapeHtml(article.title)}</h3>
        <p class="article-card__excerpt">${escapeHtml(article.excerpt)}</p>
        <div class="article-card__meta">
          <span>${escapeHtml(formatDate(article.date))}</span>
          <span>阅读 ${article.views}</span>
        </div>
      </article>
    `
  }
  return `
    <a href="article.html?id=${encodeURIComponent(article.id)}" class="article-card cursor-pointer">
      <h3 class="article-card__title">${escapeHtml(article.title)}</h3>
      <p class="article-card__excerpt">${escapeHtml(article.excerpt)}</p>
      <div class="article-card__meta">
        <span>${escapeHtml(formatDate(article.date))}</span>
        <span>阅读 ${article.views}</span>
        <span class="article-card__more">阅读全文</span>
      </div>
    </a>
  `
}

function setEmptyState(emptyEl, message) {
  if (!emptyEl) return
  const textEl = emptyEl.querySelector('[data-empty-text]') || emptyEl.querySelector('p')
  if (textEl) textEl.textContent = message
  emptyEl.classList.remove('hidden')
}

function renderDetailBody(article) {
  const parts = []
  if (article.excerpt && article.excerpt !== article.title) {
    parts.push(`<p>${escapeHtml(article.excerpt)}</p>`)
  }
  if (article.previewUrl && article.fileUrl) {
    parts.push(`<div class="article-file" data-pdf-src="${escapeHtml(article.previewUrl)}" data-pdf-title="${escapeHtml(article.title)}"></div>`)
  }
  return parts.join('')
}

async function renderPdfPages(container) {
  const url = container?.dataset?.pdfSrc
  const title = container?.dataset?.pdfTitle || '文章正文'
  if (!url) return

  container.innerHTML = '<p class="article-file__status">正在加载正文…</p>'
  if (!window.pdfjsLib) {
    container.innerHTML = '<p class="article-file__status">暂时无法展示正文，请稍后重试</p>'
    return
  }

  try {
    const res = await fetch(url, { credentials: 'omit', cache: 'no-store' })
    if (!res.ok) throw new Error('pdf fetch failed')
    const data = await res.arrayBuffer()
    if (!data.byteLength) throw new Error('empty pdf')
    const pdf = await window.pdfjsLib.getDocument({ data }).promise
    container.innerHTML = ''
    const wrapWidth = container.clientWidth || 800
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum)
      const unscaled = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: wrapWidth / unscaled.width })
      const outputScale = window.devicePixelRatio || 1
      const canvas = document.createElement('canvas')
      canvas.className = 'article-file__page'
      canvas.width = Math.floor(viewport.width * outputScale)
      canvas.height = Math.floor(viewport.height * outputScale)
      canvas.setAttribute('role', 'img')
      canvas.setAttribute('aria-label', `${title} 第 ${pageNum} 页`)
      const ctx = canvas.getContext('2d')
      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null
      await page.render({ canvasContext: ctx, viewport, transform }).promise
      container.appendChild(canvas)
    }
  } catch {
    container.innerHTML = '<p class="article-file__status">暂时无法展示正文，请稍后重试</p>'
  }
}

function setMoreVisible(el, visible) {
  if (!el) return
  el.classList.toggle('is-hidden', !visible)
}

async function initArticlesPreview() {
  const root = document.getElementById('articles-preview')
  if (!root) return
  const moreEl = document.getElementById('articles-more')
  const previewLimit = 9
  try {
    const items = await loadArticleList()
    const preview = items.slice(0, previewLimit)
    if (!preview.length) {
      setMoreVisible(moreEl, false)
      root.innerHTML = '<p class="col-span-full text-center text-secondary text-sm">暂无相关文章</p>'
      return
    }
    root.innerHTML = preview.map(renderArticleCard).join('')
    setMoreVisible(moreEl, items.length > previewLimit)
    if (window.lucide) lucide.createIcons()
  } catch {
    setMoreVisible(moreEl, false)
    root.innerHTML = '<p class="col-span-full text-center text-secondary text-sm">暂时无法加载文章，请稍后重试</p>'
  }
}

async function initArticlesList() {
  const listEl = document.getElementById('articles-list')
  const emptyEl = document.getElementById('articles-empty')
  if (!listEl) return

  try {
    const items = await loadArticleList()
    if (!items.length) {
      listEl.innerHTML = ''
      setEmptyState(emptyEl, '暂无相关文章')
      return
    }
    emptyEl?.classList.add('hidden')
    listEl.innerHTML = items.map(renderArticleCard).join('')
    if (window.lucide) lucide.createIcons()
  } catch {
    listEl.innerHTML = ''
    setEmptyState(emptyEl, '暂时无法加载文章，请稍后重试')
  }
}

async function initArticleDetail() {
  const articleEl = document.getElementById('article-detail')
  if (!articleEl) return

  const params = new URLSearchParams(window.location.search)
  const id = params.get('id')
  const notFound = document.getElementById('article-not-found')
  const relatedWrap = document.getElementById('article-related-wrap')

  const showMissing = (message) => {
    articleEl.classList.add('hidden')
    relatedWrap?.classList.add('hidden')
    setEmptyState(notFound, message || '未找到该文章')
    document.title = '文章未找到 — 企税康内容中心'
  }

  if (!id) {
    showMissing('未找到该文章')
    return
  }

  try {
    const article = await fetchArticleDetail(id)
    if (!article) {
      showMissing('未找到该文章')
      return
    }

    notFound?.classList.add('hidden')
    articleEl.classList.remove('hidden')
    document.title = `${article.title} — 企税康内容中心`
    const desc = document.querySelector('meta[name="description"]')
    if (desc) desc.setAttribute('content', article.excerpt || article.title)

    articleEl.innerHTML = `
      <nav class="article-breadcrumb" aria-label="面包屑">
        <a href="index.html">首页</a>
        <span>/</span>
        <a href="articles.html">内容中心</a>
      </nav>
      <h1 class="font-heading text-2xl md:text-4xl font-bold text-primary mb-4 leading-snug">${escapeHtml(article.title)}</h1>
      <div class="article-detail__meta">
        <span>${escapeHtml(formatDate(article.date))}</span>
        <span>阅读 ${article.views}</span>
      </div>
      <div class="article-detail__body">
        ${renderDetailBody(article)}
      </div>
    `

    const pdfHost = articleEl.querySelector('[data-pdf-src]')
    if (pdfHost) await renderPdfPages(pdfHost)

    const relatedRoot = document.getElementById('article-related')
    if (relatedRoot) {
      const list = await loadArticleList().catch(() => [])
      const related = list.filter((item) => String(item.id) !== String(article.id)).slice(0, 3)
      relatedRoot.innerHTML = related.map(renderArticleCard).join('')
      relatedWrap?.classList.toggle('hidden', !related.length)
    }

    if (window.lucide) lucide.createIcons()
  } catch {
    showMissing('暂时无法加载文章，请稍后重试')
  }
}
