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
      header.classList.toggle('glass-nav-scrolled', window.scrollY > 40)
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
  const sectionIds = ['hero', 'products', 'services', 'testimonials', 'footer']
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
function initPyramid() {
  const btns = document.querySelectorAll('[data-pyramid]')
  const stagePanels = document.querySelectorAll('[data-stage-for]')
  const servicePanels = document.querySelectorAll('[data-service-for]')
  if (!btns.length) return

  const setActive = (level) => {
    const lv = parseInt(level, 10)

    btns.forEach((b) => {
      b.classList.toggle('active', parseInt(b.dataset.pyramid, 10) === lv)
      b.classList.toggle('opacity-80', parseInt(b.dataset.pyramid, 10) !== lv)
    })

    stagePanels.forEach((p) => {
      const stage = parseInt(p.dataset.stageFor, 10)
      let active = false
      if (lv === 0) active = stage === 0
      else if (lv === 1) active = stage <= 1
      else if (lv === 2) active = stage <= 2
      else if (lv === 3) active = stage === 3
      p.classList.toggle('panel-active', active)
      p.classList.toggle('panel-dim', !active)
    })

    servicePanels.forEach((p) => {
      const key = p.dataset.serviceFor
      const serviceLevelMap = { accounting: [0, 1], tax: [2, 3], agency: [0] }
      const active = serviceLevelMap[key]?.includes(lv)
      p.classList.toggle('panel-active', active)
      p.classList.toggle('panel-dim', !active)
    })
  }

  btns.forEach((btn) => {
    btn.addEventListener('click', () => setActive(btn.dataset.pyramid))
    btn.addEventListener('mouseenter', () => setActive(btn.dataset.pyramid))
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
  if (!form || !success) return

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    form.classList.add('hidden')
    success.classList.remove('hidden')
  })
}
