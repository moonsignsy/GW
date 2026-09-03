// 企业风采：视频列表 + 预览播放。

const VIDEO_API_BASE = 'https://shturl.qishuikang.com/prod-api'
const VIDEO_LIST_API = `${VIDEO_API_BASE}/business/websiteVideo/list`
const VIDEO_FILE_PREVIEW_API = `${VIDEO_API_BASE}/business/websiteVideo/file/preview`

document.addEventListener('DOMContentLoaded', () => {
  initShowcase()
})

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

function extractVideoArray(payload) {
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

function normalizeVideo(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = pickField(raw, ['id', 'videoId'])
  const videoName = String(pickField(raw, ['videoName', 'fileName', 'originalName']))
  const title = String(pickField(raw, ['title', 'name', 'headline'])) || videoName
  if (!id || !title) return null
  return {
    id: String(id),
    title,
    videoName,
    desc: String(pickField(raw, ['summary', 'desc', 'description', 'intro', 'brief'])),
    kind: String(pickField(raw, ['category', 'kind', 'type'])) || '未分类',
    duration: '',
    seconds: 0,
    src: `${VIDEO_FILE_PREVIEW_API}/${encodeURIComponent(id)}`,
  }
}

async function fetchApiJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  const rawText = await res.text()
  let payload = null
  try {
    payload = rawText ? JSON.parse(rawText) : null
  } catch {
    payload = null
  }
  if (!isApiSuccess(res, payload)) throw new Error('接口请求失败')
  return payload
}

async function fetchVideoList() {
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
    const payload = await fetchApiJson(`${VIDEO_LIST_API}?${params}`)
    if (pageNum === 1 && payload && typeof payload.total !== 'undefined') {
      total = Number(payload.total) || 0
    }
    const batch = extractVideoArray(payload)
      .filter(isPublished)
      .map(normalizeVideo)
      .filter(Boolean)
    collected.push(...batch)
    if (!batch.length || collected.length >= total || batch.length < pageSize) break
    pageNum += 1
  }
  return collected
}

function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function firstFrameTime(video) {
  return Number.isFinite(video.duration) && video.duration > 0.05
    ? Math.min(0.12, video.duration * 0.02)
    : 0.001
}

function coverSrc(src) {
  return src.includes('#') ? src : `${src}#t=0.1`
}

function bindCoverFrame(video, onReady) {
  if (!video || video.dataset.coverBound === '1') return
  video.dataset.coverBound = '1'
  video.muted = true
  video.defaultMuted = true
  video.playsInline = true

  const showFrame = () => {
    onReady?.(video.duration)
    const target = firstFrameTime(video)
    const settle = () => video.pause()
    if (video.readyState >= 2) {
      try {
        video.currentTime = target
      } catch {
        settle()
      }
    }
    video.addEventListener('seeked', settle, { once: true })
    try {
      video.currentTime = target
    } catch {
      settle()
    }
  }

  if (video.readyState >= 1) showFrame()
  else {
    video.addEventListener('loadedmetadata', showFrame, { once: true })
    video.addEventListener('loadeddata', showFrame, { once: true })
  }
}

function captureVideoPoster(src) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.muted = true
    video.defaultMuted = true
    video.playsInline = true
    video.preload = 'auto'
    video.crossOrigin = 'anonymous'

    let settled = false
    let timer = 0

    const finish = (poster, seconds) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      video.pause()
      video.removeAttribute('src')
      video.load()
      resolve({
        poster: poster || '',
        seconds: Number.isFinite(seconds) && seconds > 0 ? seconds : 0,
      })
    }

    const snap = () => {
      const width = video.videoWidth
      const height = video.videoHeight
      const seconds = video.duration
      if (!width || !height) {
        finish('', seconds)
        return
      }
      const scale = Math.min(1, 480 / Math.max(width, height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(width * scale))
      canvas.height = Math.max(1, Math.round(height * scale))
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        finish('', seconds)
        return
      }
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          if (!blob) {
            finish('', seconds)
            return
          }
          finish(URL.createObjectURL(blob), seconds)
        }, 'image/jpeg', 0.82)
      } catch {
        finish('', seconds)
      }
    }

    video.addEventListener('loadedmetadata', () => {
      video.addEventListener('seeked', snap, { once: true })
      try {
        video.currentTime = firstFrameTime(video)
      } catch {
        snap()
      }
    }, { once: true })
    video.addEventListener('error', () => finish('', 0), { once: true })
    timer = window.setTimeout(() => finish('', video.duration || 0), 12000)
    video.src = src
  })
}

function setStatus(page, message) {
  const statusEl = page.querySelector('[data-status]')
  const layoutEl = page.querySelector('[data-layout]')
  if (message) {
    if (statusEl) {
      statusEl.textContent = message
      statusEl.classList.remove('is-hidden')
    }
    layoutEl?.classList.add('is-hidden')
    return
  }
  statusEl?.classList.add('is-hidden')
  layoutEl?.classList.remove('is-hidden')
}

async function initShowcase() {
  const page = document.getElementById('showcase-page')
  if (!page) return

  try {
    const films = await fetchVideoList()
    if (!films.length) {
      setStatus(page, '暂无企业风采视频')
      return
    }
    setStatus(page, '')
    mountShowcase(page, films)
  } catch {
    setStatus(page, '暂时无法加载影像，请稍后重试')
  }
}

function mountShowcase(page, films) {
  const kinds = [...new Set(films.map((item) => item.kind).filter(Boolean))]
  const playerEl = page.querySelector('[data-player]')
  const catsEl = page.querySelector('[data-cats]')
  const listEl = page.querySelector('[data-list]')
  const countEl = page.querySelector('[data-list-count]')
  const titleEl = page.querySelector('[data-now-title]')
  const descEl = page.querySelector('[data-now-desc]')
  const kindEl = page.querySelector('[data-now-kind]')

  let currentId = films[0].id
  let activeKind = '全部'

  const byId = (id) => films.find((item) => item.id === id) || films[0]
  const filtered = () => (activeKind === '全部' ? films : films.filter((item) => item.kind === activeKind))
  const kindCount = (kind) => (kind === '全部' ? films.length : films.filter((item) => item.kind === kind).length)

  function renderPlayerShell(film) {
    playerEl.className = 'showcase-player showcase-stage__player'
    playerEl.dataset.src = film.src
    playerEl.dataset.seconds = String(film.seconds)
    playerEl.dataset.id = film.id
    playerEl.innerHTML = `
      <video class="showcase-player__video" playsinline preload="metadata" muted></video>
      <div class="showcase-player__poster"></div>
      <button type="button" class="showcase-player__big" data-big-play aria-label="播放 ${esc(film.title)}">
        <span class="showcase-player__big-icon"><i data-lucide="play" class="w-7 h-7"></i></span>
      </button>
      <div class="showcase-player__bar">
        <button type="button" class="showcase-player__ctrl" data-play-toggle aria-label="播放">
          <i data-lucide="play" data-icon-play class="w-4 h-4"></i>
          <i data-lucide="pause" data-icon-pause class="w-4 h-4 hidden"></i>
        </button>
        <span class="showcase-player__time" data-time>00:00</span>
        <input class="showcase-player__seek" data-seek type="range" min="0" max="0" value="0" step="0.1" aria-label="进度" />
        <span class="showcase-player__time" data-duration>${film.duration || '00:00'}</span>
        <button type="button" class="showcase-player__ctrl" data-mute aria-label="静音">
          <i data-lucide="volume-2" data-icon-vol class="w-4 h-4"></i>
          <i data-lucide="volume-x" data-icon-mute class="w-4 h-4 hidden"></i>
        </button>
      </div>
    `
    bindPlayer(playerEl)
  }

  function rememberDuration(id, seconds) {
    const film = films.find((item) => item.id === id)
    if (!film || !Number.isFinite(seconds) || seconds <= 0) return
    film.seconds = seconds
    film.duration = formatTime(seconds)
    if (film.id === currentId) renderNow(film)
    const thumb = listEl.querySelector(`[data-film="${CSS.escape(id)}"] .showcase-item__thumb`)
    if (!thumb) return
    let badge = thumb.querySelector('.showcase-item__dur')
    if (!badge) {
      badge = document.createElement('span')
      badge.className = 'showcase-item__dur'
      thumb.appendChild(badge)
    }
    badge.textContent = film.duration
  }

  function bindPlayer(el) {
    const video = el.querySelector('video')
    const poster = el.querySelector('.showcase-player__poster')
    const big = el.querySelector('[data-big-play]')
    const toggleBtn = el.querySelector('[data-play-toggle]')
    const seek = el.querySelector('[data-seek]')
    const timeEl = el.querySelector('[data-time]')
    const durEl = el.querySelector('[data-duration]')
    const muteBtn = el.querySelector('[data-mute]')
    const playIcon = el.querySelector('[data-icon-play]')
    const pauseIcon = el.querySelector('[data-icon-pause]')
    const volIcon = el.querySelector('[data-icon-vol]')
    const muteIcon = el.querySelector('[data-icon-mute]')

    const duration = () => (Number.isFinite(video.duration) && video.duration > 0 ? video.duration : Number(el.dataset.seconds) || 0)

    const syncIcons = () => {
      const playing = el.hasAttribute('data-playing')
      playIcon?.classList.toggle('hidden', playing)
      pauseIcon?.classList.toggle('hidden', !playing)
      toggleBtn?.setAttribute('aria-label', playing ? '暂停' : '播放')
      big?.classList.toggle('is-hidden', playing)
    }

    const syncMute = () => {
      const muted = video.muted || el.hasAttribute('data-muted')
      volIcon?.classList.toggle('hidden', muted)
      muteIcon?.classList.toggle('hidden', !muted)
      muteBtn?.setAttribute('aria-label', muted ? '取消静音' : '静音')
    }

    const paint = () => {
      const d = duration()
      const t = video.currentTime || 0
      if (timeEl) timeEl.textContent = formatTime(t)
      if (durEl) durEl.textContent = formatTime(d)
      if (seek) {
        seek.max = String(d || 0)
        seek.value = String(t || 0)
      }
    }

    const pause = () => {
      video.pause()
      el.removeAttribute('data-playing')
      syncIcons()
    }

    const play = async () => {
      if (!video.getAttribute('src')) video.src = el.dataset.src
      el.setAttribute('data-playing', '')
      syncIcons()
      try {
        video.muted = el.hasAttribute('data-muted')
        await video.play()
        poster?.classList.add('is-hidden')
      } catch {
        el.removeAttribute('data-playing')
        syncIcons()
      }
    }

    const toggle = () => {
      if (el.hasAttribute('data-playing')) pause()
      else play()
    }

    const loadFilm = (film, autoplay) => {
      pause()
      el.dataset.id = film.id
      el.dataset.src = film.src
      el.dataset.seconds = String(film.seconds)
      poster?.classList.remove('is-hidden')
      if (film.poster) {
        poster.style.backgroundImage = `url("${film.poster}")`
        poster.classList.add('has-frame')
        video.poster = film.poster
      } else {
        poster.style.backgroundImage = ''
        poster.classList.remove('has-frame')
        video.removeAttribute('poster')
      }
      video.preload = 'metadata'
      video.src = film.src
      video.load()
      const label = el.querySelector('[data-big-play]')
      if (label) label.setAttribute('aria-label', `播放 ${film.title}`)
      paint()
      if (autoplay) play()
    }

    video.addEventListener('timeupdate', paint)
    video.addEventListener('loadedmetadata', () => {
      rememberDuration(el.dataset.id, video.duration)
      paint()
      if (el.hasAttribute('data-playing')) return
      if (poster?.classList.contains('has-frame')) return
      poster?.classList.add('is-hidden')
      const target = firstFrameTime(video)
      const reveal = () => {
        if (!el.hasAttribute('data-playing')) video.pause()
      }
      video.addEventListener('seeked', reveal, { once: true })
      try {
        video.currentTime = target
      } catch {
        reveal()
      }
    })
    video.addEventListener('loadeddata', () => {
      if (el.hasAttribute('data-playing') || poster?.classList.contains('has-frame')) return
      poster?.classList.add('is-hidden')
    })
    video.addEventListener('ended', pause)
    video.addEventListener('error', pause)
    big?.addEventListener('click', toggle)
    toggleBtn?.addEventListener('click', toggle)
    video.addEventListener('click', toggle)
    poster?.addEventListener('click', toggle)
    seek?.addEventListener('input', () => {
      if (video.getAttribute('src')) video.currentTime = Number(seek.value)
      paint()
    })
    muteBtn?.addEventListener('click', () => {
      const next = !video.muted
      video.muted = next
      el.toggleAttribute('data-muted', next)
      syncMute()
    })

    el._load = loadFilm
    paint()
    syncIcons()
    syncMute()
  }

  function renderNow(film) {
    if (titleEl) titleEl.textContent = film.title
    if (descEl) descEl.textContent = film.desc
    if (kindEl) kindEl.textContent = film.duration ? `${film.kind} · ${film.duration}` : film.kind
  }

  function renderCats() {
    const cards = ['全部', ...kinds]
    catsEl.innerHTML = cards.map((kind) => `
      <button type="button" class="showcase-cat${kind === activeKind ? ' is-active' : ''}" data-kind="${esc(kind)}" aria-pressed="${kind === activeKind}">
        <span class="showcase-cat__name">${esc(kind)}</span>
        <span class="showcase-cat__count">${kindCount(kind)} 部</span>
      </button>
    `).join('')
  }

  function renderList() {
    const items = filtered()
    if (countEl) countEl.textContent = `播放列表 · ${items.length} 部`
    if (!items.length) {
      listEl.innerHTML = '<p class="showcase-list__empty">该分类暂无影像</p>'
      return
    }
    listEl.innerHTML = items.map((film) => `
      <div class="showcase-item${film.id === currentId ? ' is-active' : ''}" role="button" tabindex="0" data-film="${esc(film.id)}">
        <span class="showcase-item__thumb">
          <video class="showcase-item__cover" muted playsinline preload="metadata" src="${esc(coverSrc(film.src))}"></video>
          <img class="showcase-item__poster" alt="" ${film.poster ? `src="${esc(film.poster)}"` : 'hidden'} />
          <i data-lucide="play" class="w-4 h-4"></i>
          ${film.duration ? `<span class="showcase-item__dur">${film.duration}</span>` : ''}
        </span>
        <span class="showcase-item__copy">
          <span class="showcase-item__kind">${esc(film.kind)}</span>
          <span class="showcase-item__title">${esc(film.title)}</span>
        </span>
      </div>
    `).join('')
    listEl.querySelectorAll('.showcase-item__cover').forEach((cover) => {
      const id = cover.closest('[data-film]')?.dataset.film
      const film = films.find((item) => item.id === id)
      if (film?.poster) {
        cover.removeAttribute('src')
        cover.load()
        return
      }
      bindCoverFrame(cover, (seconds) => rememberDuration(id, seconds))
    })
    if (window.lucide) lucide.createIcons()
  }

  function applyListPoster(film) {
    const item = listEl.querySelector(`[data-film="${CSS.escape(film.id)}"]`)
    if (!item || !film.poster) return
    const img = item.querySelector('.showcase-item__poster')
    const cover = item.querySelector('.showcase-item__cover')
    if (img) {
      img.src = film.poster
      img.removeAttribute('hidden')
    }
    if (cover) {
      cover.removeAttribute('src')
      cover.load()
    }
  }

  async function fillCovers() {
    const ordered = [byId(currentId), ...films.filter((item) => item.id !== currentId)]
    for (const film of ordered) {
      const { poster, seconds } = await captureVideoPoster(film.src)
      if (seconds) {
        film.seconds = seconds
        film.duration = formatTime(seconds)
        rememberDuration(film.id, seconds)
      }
      if (!poster) continue
      film.poster = poster
      applyListPoster(film)
      if (film.id === playerEl.dataset.id) {
        const posterEl = playerEl.querySelector('.showcase-player__poster')
        const videoEl = playerEl.querySelector('video')
        if (posterEl) {
          posterEl.style.backgroundImage = `url("${poster}")`
          posterEl.classList.add('has-frame')
          if (!playerEl.hasAttribute('data-playing')) posterEl.classList.remove('is-hidden')
        }
        if (videoEl && !playerEl.hasAttribute('data-playing')) videoEl.poster = poster
      }
    }
  }

  function selectFilm(id, autoplay) {
    const film = byId(id)
    currentId = film.id
    renderNow(film)
    listEl.querySelectorAll('[data-film]').forEach((item) => {
      item.classList.toggle('is-active', item.dataset.film === currentId)
    })
    playerEl._load?.(film, autoplay)
  }

  catsEl.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-kind]')
    if (!btn) return
    activeKind = btn.dataset.kind
    renderCats()
    renderList()
  })

  listEl.addEventListener('click', (event) => {
    const item = event.target.closest('[data-film]')
    if (!item) return
    selectFilm(item.dataset.film, true)
  })

  listEl.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    const item = event.target.closest('[data-film]')
    if (!item) return
    event.preventDefault()
    selectFilm(item.dataset.film, true)
  })

  renderPlayerShell(films[0])
  playerEl._load?.(films[0], false)
  renderNow(films[0])
  renderCats()
  renderList()
  if (window.lucide) lucide.createIcons()
  fillCovers()
}
