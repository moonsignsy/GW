// 企税康首页交互脚本

document.addEventListener('DOMContentLoaded', () => {
  initStickyNav()
  initNavActive()
  initMobileMenu()
  initCounters()
  initPyramid()
  initTabs()
  initLeadForm()
})

/* ── 导航吸顶：滚过首屏切换白色导航 ── */
function initStickyNav() {
  const header = document.getElementById('main-header')
  const hero = document.getElementById('hero')
  if (!header || !hero) return

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
  const sectionIds = ['hero', 'products', 'testimonials', 'footer']
  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean)
  const links = document.querySelectorAll('.header-nav-link, .header-mobile-link')
  if (!sections.length || !links.length) return

  const setActive = (id) => {
    links.forEach((link) => {
      const match = link.getAttribute('href') === `#${id}`
      link.classList.toggle('active', match)
      if (match) link.setAttribute('aria-current', 'page')
      else link.removeAttribute('aria-current')
    })
  }

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
      const id = link.getAttribute('href')?.slice(1)
      if (id) setActive(id)
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
    scale: '团队 3-5 人',
    service: '常规代账 + 工商代办服务',
    budget: '1w 元以内 / 年',
  },
  1: {
    stage: '成长期',
    badgeClass: 'badge-growth',
    scale: '年营收 300w 以上',
    service: '合规代账（5年以上经验中级会计主理）',
    budget: '1w - 5w 元 / 年',
  },
  2: {
    stage: '发展期',
    badgeClass: 'badge-develop',
    scale: '有专职会计，年营收 2000w 以上',
    service: '常年财税顾问（注册会计师/税务师把关）',
    budget: '5w - 30w 元 / 年',
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
      if (els.scale) els.scale.textContent = data.scale
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
function initLeadForm() {
  const form = document.getElementById('lead-form-el')
  const success = document.getElementById('lead-success')
  const errorEl = document.getElementById('lead-form-error')
  const phoneInput = form?.querySelector('input[name="phone"]')
  if (!form || !success) return

  const isValidPhone = (value) => /^1\d{10}$/.test(value.trim())

  phoneInput?.addEventListener('input', () => {
    phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 11)
    if (errorEl && isValidPhone(phoneInput.value)) {
      errorEl.classList.add('hidden')
      phoneInput.classList.remove('border-red-400')
    }
  })

  form.addEventListener('submit', (e) => {
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
    form.classList.add('hidden')
    success.classList.remove('hidden')
  })
}
