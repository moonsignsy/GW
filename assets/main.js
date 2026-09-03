// 企税康首页交互脚本

document.addEventListener('DOMContentLoaded', () => {
  initStickyNav()
  initNavActive()
  initMobileMenu()
  initCounters()
  initPyramid()
  initTabs()
  initLeadForm()
  initCopyPhone()
})

/* ── 导航吸顶：滚过首屏切换白色导航 ── */
function initStickyNav() {
  const header = document.getElementById('main-header')
  const hero = document.getElementById('hero')
  if (!header) return
  if (!hero) {
    header.classList.add('header-light')
    return
  }

  const onScroll = () => {
    const pastHero = window.scrollY >= hero.offsetHeight - 72
    header.classList.toggle('header-light', pastHero)
    if (!pastHero) {
      header.classList.toggle('glass-nav-scrolled', window.scrollY > 10)
    } else {
      header.classList.remove('glass-nav-scrolled')
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  onScroll()
}

/* ── 导航选中高亮（滚动联动 + 点击） ── */
function initNavActive() {
  const links = document.querySelectorAll('.header-nav-link, .header-mobile-link')
  if (!links.length) return

  const page = document.body.dataset.page
  const isArticlesSection = page === 'articles' || page === 'article'
  const isShowcasePage = page === 'showcase'

  const setActive = (id) => {
    links.forEach((link) => {
      const href = link.getAttribute('href') || ''
      const match = isArticlesSection
        ? href.includes('articles.html')
        : isShowcasePage
          ? href.includes('showcase.html')
          : href === `#${id}` || (id === 'articles' && href.includes('articles.html'))
      link.classList.toggle('active', match)
      if (match) link.setAttribute('aria-current', 'page')
      else link.removeAttribute('aria-current')
    })
  }

  if (isArticlesSection) {
    setActive('articles')
    return
  }

  if (isShowcasePage) {
    setActive('showcase')
    return
  }

  const sectionIds = ['hero', 'products', 'testimonials', 'articles', 'footer']
  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean)
  if (!sections.length) return

  const update = () => {
    const offset = window.scrollY + 160
    let current = sectionIds[0]
    sections.forEach((section) => {
      if (section.offsetTop <= offset) current = section.id
    })
    setActive(current)
  }

  window.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', update, { passive: true })
  links.forEach((link) => {
    link.addEventListener('click', () => {
      const href = link.getAttribute('href') || ''
      if (href.startsWith('#')) setActive(href.slice(1))
    })
  })
  update()
}

/* ── 移动端菜单 ── */
function initMobileMenu() {
  const btn = document.getElementById('menu-toggle')
  const menu = document.getElementById('mobile-menu')
  const iconOpen = document.getElementById('icon-menu')
  const iconClose = document.getElementById('icon-close')
  if (!btn || !menu) return

  btn.addEventListener('click', () => {
    const isHidden = menu.classList.contains('hidden')
    if (isHidden) {
      menu.classList.remove('hidden')
      iconOpen.classList.add('hidden')
      iconClose.classList.remove('hidden')
      btn.setAttribute('aria-expanded', 'true')
    } else {
      menu.classList.add('hidden')
      iconOpen.classList.remove('hidden')
      iconClose.classList.add('hidden')
      btn.setAttribute('aria-expanded', 'false')
    }
  })

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menu.classList.add('hidden')
      iconOpen.classList.remove('hidden')
      iconClose.classList.add('hidden')
      btn.setAttribute('aria-expanded', 'false')
    })
  })
}

/* ── 数字滚动 ── */
function initCounters() {
  const els = document.querySelectorAll('[data-counter]')
  if (!els.length) return

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const animate = (el) => {
    const end = parseInt(el.dataset.counter, 10)
    const suffix = el.dataset.suffix || ''
    if (prefersReduced) {
      el.textContent = end + suffix
      return
    }
    let current = 0
    const step = Math.ceil(end / 120)
    const timer = setInterval(() => {
      current += step
      if (current >= end) {
        el.textContent = end + suffix
        clearInterval(timer)
      } else {
        el.textContent = current + suffix
      }
    }, 16)
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target)
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.3 }
  )
  els.forEach((el) => observer.observe(el))
}

/* ── 产品金字塔联动 ── */
const PYRAMID_DATA = {
  0: {
    stage: '初创期',
    badgeClass: 'badge-startup',
    scale: '中小微初创企业',
    service: '常规代账 + 工商代办服务',
    budget: '1W 元以内 / 年',
  },
  1: {
    stage: '成长期',
    badgeClass: 'badge-growth',
    scale: '年营收 500W 以上',
    service: '合规代账（5年以上经验，中级会计职称）',
    budget: '1W - 5W 元 / 年',
  },
  2: {
    stage: '发展期',
    badgeClass: 'badge-develop',
    scale: '有专职会计，年营收 2000W 以上',
    service: '常年财税顾问（注册会计师/税务师把关）',
    budget: '5W - 30W 元 / 年',
    scaleCompact: true,
  },
  3: {
    stage: '成熟期',
    badgeClass: 'badge-mature',
    scale: '集团化连锁公司',
    service: '集团化税务外包（一事一议定制方案）',
    budget: '一事一议',
  },
}

function initPyramid() {
  const btns = document.querySelectorAll('[data-pyramid]')
  const budgetBoxes = document.querySelectorAll('[data-budget-for]')
  const detail = document.getElementById('pyramid-detail')
  const badge = document.getElementById('pyramid-detail-badge')
  const scale = document.getElementById('pyramid-detail-scale')
  const service = document.getElementById('pyramid-detail-service')
  const budget = document.getElementById('pyramid-detail-budget')
  const detailMobile = document.getElementById('pyramid-detail-mobile')
  const badgeMobile = document.getElementById('pyramid-detail-mobile-badge')
  const scaleMobile = document.getElementById('pyramid-detail-mobile-scale')
  const serviceMobile = document.getElementById('pyramid-detail-mobile-service')
  const budgetMobile = document.getElementById('pyramid-detail-mobile-budget')
  if (!btns.length) return

  const updatePanel = (panel, els, data) => {
    if (!panel || !els.badge) return
    panel.classList.add('is-switching')
    setTimeout(() => {
      els.badge.textContent = data.stage
      els.badge.className = `pyramid-stage-badge ${data.badgeClass}`
      if (els.scale) {
        els.scale.textContent = data.scale
        els.scale.classList.toggle('pyramid-detail-scale--compact', !!data.scaleCompact)
      }
      if (els.service) els.service.textContent = data.service
      if (els.budget) els.budget.textContent = data.budget
      panel.classList.remove('is-switching')
    }, 150)
  }

  const setActive = (level) => {
    const lv = parseInt(level, 10)
    const data = PYRAMID_DATA[lv]
    if (!data) return

    btns.forEach((b) => {
      b.classList.toggle('active', parseInt(b.dataset.pyramid, 10) === lv)
    })

    budgetBoxes.forEach((box) => {
      box.classList.toggle('active', parseInt(box.dataset.budgetFor, 10) === lv)
    })

    document.querySelectorAll('.pyramid-lifecycle-panel').forEach((panel) => {
      panel.classList.add('pyramid-lifecycle-panel--active')
    })
    document.querySelectorAll('.pyramid-hero-card').forEach((card) => {
      card.classList.add('pyramid-hero-card--focused')
    })

    updatePanel(detail, { badge, scale, service, budget }, data)
    updatePanel(detailMobile, { badge: badgeMobile, scale: scaleMobile, service: serviceMobile, budget: budgetMobile }, data)
  }

  btns.forEach((btn) => {
    btn.addEventListener('mouseenter', () => setActive(btn.dataset.pyramid))
    btn.addEventListener('focus', () => setActive(btn.dataset.pyramid))
    btn.addEventListener('click', () => setActive(btn.dataset.pyramid))
  })

  setActive('1')
}

/* ── 服务 Tab ── */
function initTabs() {
  const btns = document.querySelectorAll('[data-tab]')
  const panels = document.querySelectorAll('[data-tab-panel]')
  if (!btns.length) return

  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.tab
      btns.forEach((b) => {
        b.classList.toggle('active', b.dataset.tab === id)
        b.classList.toggle('bg-white', b.dataset.tab !== id)
        b.classList.toggle('text-slate-600', b.dataset.tab !== id)
        b.classList.toggle('border', b.dataset.tab !== id)
        b.classList.toggle('border-slate-200', b.dataset.tab !== id)
      })
      panels.forEach((p) => p.classList.toggle('active', p.dataset.tabPanel === id))
    })
  })
}

/* ── 线索表单 ── */
const CONSULT_API = 'http://localhost:8080/api/business/consultRecord/add'

function parseApiResponse(rawText) {
  if (!rawText) return null
  try {
    return JSON.parse(rawText)
  } catch {
    return null
  }
}

function sanitizeErrorMessage(message) {
  if (!message) return ''
  if (/5666|WinError|后端服务未启动|目标计算机积极拒绝|由于目标计算机积极拒绝/i.test(message)) {
    return ''
  }
  return message
}

function getBackendErrorMessage(data, rawText) {
  if (typeof data === 'string' && data.trim()) return sanitizeErrorMessage(data.trim())

  if (data && typeof data === 'object') {
    const fields = [
      data.msg,
      data.message,
      data.errorMsg,
      data.errMsg,
      data.error,
      data.detail,
      data.data?.msg,
      data.data?.message,
    ]
    for (const field of fields) {
      if (typeof field === 'string' && field.trim()) {
        const sanitized = sanitizeErrorMessage(field.trim())
        if (sanitized) return sanitized
      }
    }

    if (Array.isArray(data.errors)) {
      const messages = data.errors
        .map((item) => {
          if (typeof item === 'string') return item
          return item?.message || item?.msg || item?.defaultMessage || ''
        })
        .filter(Boolean)
      if (messages.length) return messages.join('；')
    }
  }

  const trimmed = rawText?.trim()
  if (trimmed && trimmed.length <= 500 && !trimmed.startsWith('<')) {
    return sanitizeErrorMessage(trimmed)
  }
  return ''
}

function isConsultSubmitSuccess(res, data) {
  if (!res.ok) return false
  if (!data || typeof data !== 'object') return true
  if (typeof data.success === 'boolean') return data.success
  if (typeof data.code === 'undefined') return true
  const code = Number(data.code)
  return code === 200 || code === 0
}

function initLeadForm() {
  const form = document.getElementById('lead-form-el')
  const success = document.getElementById('lead-success')
  const errorEl = document.getElementById('lead-form-error')
  const submitBtn = form?.querySelector('button[type="submit"]')
  const contactInput = form?.querySelector('input[name="contact"]')
  const phoneInput = form?.querySelector('input[name="phone"]')
  const industryInput = form?.querySelector('input[name="industry"]')
  if (!form || !success) return

  const isValidPhone = (value) => /^1\d{10}$/.test(value.trim())

  phoneInput?.addEventListener('input', () => {
    phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 11)
    if (errorEl && isValidPhone(phoneInput.value)) {
      errorEl.classList.add('hidden')
      phoneInput.classList.remove('border-red-400')
    }
  })

  const setSubmitting = (submitting) => {
    if (!submitBtn) return
    submitBtn.disabled = submitting
    submitBtn.classList.toggle('opacity-70', submitting)
    submitBtn.classList.toggle('pointer-events-none', submitting)
    if (!submitBtn.dataset.defaultHtml) {
      submitBtn.dataset.defaultHtml = submitBtn.innerHTML
    }
    submitBtn.innerHTML = submitting
      ? '提交中…'
      : submitBtn.dataset.defaultHtml
    if (!submitting && window.lucide) lucide.createIcons()
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const phone = phoneInput?.value.trim() || ''

    if (!isValidPhone(phone)) {
      if (errorEl) {
        errorEl.textContent = '请输入正确的11位手机号码'
        errorEl.classList.remove('hidden')
      }
      phoneInput?.classList.add('border-red-400')
      phoneInput?.focus()
      return
    }

    if (errorEl) errorEl.classList.add('hidden')
    phoneInput?.classList.remove('border-red-400')

    const payload = {
      contactName: contactInput?.value.trim() || '',
      content: '',
      mainBusiness: industryInput?.value.trim() || '',
      phone,
    }

    setSubmitting(true)
    try {
      const res = await fetch(CONSULT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const rawText = await res.text()
      const data = parseApiResponse(rawText)

      if (!isConsultSubmitSuccess(res, data)) {
        const backendMsg = getBackendErrorMessage(data, rawText)
        throw new Error(backendMsg || `提交失败（HTTP ${res.status}）`)
      }

      form.classList.add('hidden')
      success.classList.remove('hidden')
    } catch (err) {
      if (errorEl) {
        const msg = err instanceof Error ? err.message : ''
        const isNetworkError = err instanceof TypeError
          || /failed to fetch|networkerror|network error|load failed/i.test(msg)
        errorEl.textContent = isNetworkError
          ? '提交失败，请稍后重试'
          : msg || '提交失败，请稍后重试'
        errorEl.classList.remove('hidden')
      }
    } finally {
      setSubmitting(false)
    }
  })
}

/* ── 复制客服电话 ── */
function initCopyPhone() {
  const toast = document.getElementById('copy-toast')
  const triggers = document.querySelectorAll('[data-copy-phone]')
  if (!triggers.length) return

  let timer

  const showToast = () => {
    if (!toast) return
    toast.classList.add('copy-toast--visible')
    clearTimeout(timer)
    timer = setTimeout(() => toast.classList.remove('copy-toast--visible'), 2000)
  }

  const copyText = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }

  triggers.forEach((el) => {
    el.addEventListener('click', async () => {
      const phone = el.dataset.copyPhone
      if (!phone) return
      try {
        await copyText(phone)
        showToast()
      } catch {
        showToast()
      }
    })
  })
}
