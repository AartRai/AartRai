document.addEventListener('DOMContentLoaded', () => {
  initHeatmap();
  initCounters();
  initSkillsFilter();
  initCopyActions();
  initContactModal();
  fetchLiveGitHubStats();
});

/* ==========================================================================
   1. Real GitHub Contribution Heatmap Loader (with Fallback)
   ========================================================================== */
async function initHeatmap() {
  const grid = document.getElementById('heatmapGrid');
  const tooltip = document.getElementById('heatmapTooltip');
  if (!grid || !tooltip) return;

  try {
    // Fetch Aarti Rai's real GitHub contribution chart SVG
    const res = await fetch('https://ghchart.rshah.org/38bdf8/AartRai');
    if (!res.ok) throw new Error('Real SVG fetch failed');
    let svgText = await res.text();

    if (svgText && svgText.includes('<svg')) {
      // Replace light background squares with our dark mode cell color
      svgText = svgText.replaceAll('#EEEEEE', '#121d2f')
                       .replaceAll('#eeeeee', '#121d2f');

      grid.innerHTML = svgText;
      grid.classList.add('has-real-svg');

      // Hide custom month/day labels if SVG provides its own, or enhance SVG
      const rects = grid.querySelectorAll('rect[data-date]');
      rects.forEach(rect => {
        const date = rect.getAttribute('data-date');
        const score = rect.getAttribute('data-score') || '0';
        rect.style.cursor = 'pointer';

        rect.addEventListener('mouseenter', (e) => {
          const text = score === '0' 
            ? `No contributions on ${date}` 
            : `${score} contribution${score > '1' ? 's' : ''} on ${date}`;
          tooltip.textContent = text;
          tooltip.classList.add('visible');
          positionTooltip(e, tooltip);
        });

        rect.addEventListener('mousemove', (e) => {
          positionTooltip(e, tooltip);
        });

        rect.addEventListener('mouseleave', () => {
          tooltip.classList.remove('visible');
        });
      });
      return;
    }
  } catch (err) {
    console.log('Using local rendered contribution grid:', err);
  }

  // Fallback if SVG API is unreachable
  renderFallbackHeatmap(grid, tooltip);
}

function renderFallbackHeatmap(grid, tooltip) {
  const weeks = 36;
  const daysPerWeek = 7;
  const totalDays = weeks * daysPerWeek;
  const today = new Date(2026, 9, 26);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  grid.innerHTML = '';
  grid.classList.remove('has-real-svg');

  for (let w = 0; w < weeks; w++) {
    for (let d = 0; d < daysPerWeek; d++) {
      const dayOffset = totalDays - (w * daysPerWeek + d);
      const cellDate = new Date(today);
      cellDate.setDate(cellDate.getDate() - dayOffset);
      const dayOfWeek = cellDate.getDay();
      
      let level = 0;
      let count = 0;
      const seed = Math.sin(w * 0.45 + d * 0.8) * 10 + (w > 20 ? 4 : 0);
      
      if (seed > 11) { level = 4; count = 8; }
      else if (seed > 8) { level = 3; count = 5; }
      else if (seed > 5) { level = 2; count = 2; }
      else if (seed > 2) { level = 1; count = 1; }

      if ((dayOfWeek === 0 || dayOfWeek === 6) && Math.random() > 0.45) {
        level = Math.max(0, level - 1);
        count = level === 0 ? 0 : 1;
      }

      const cell = document.createElement('div');
      cell.className = `heat-cell lvl-${level}`;
      cell.dataset.date = `${months[cellDate.getMonth()]} ${cellDate.getDate()}, ${cellDate.getFullYear()}`;
      cell.dataset.count = count;

      cell.addEventListener('mouseenter', (e) => {
        const text = count === 0 
          ? `No contributions on ${cell.dataset.date}` 
          : `${count} contribution${count > 1 ? 's' : ''} on ${cell.dataset.date}`;
        tooltip.textContent = text;
        tooltip.classList.add('visible');
        positionTooltip(e, tooltip);
      });
      cell.addEventListener('mousemove', (e) => positionTooltip(e, tooltip));
      cell.addEventListener('mouseleave', () => tooltip.classList.remove('visible'));

      grid.appendChild(cell);
    }
  }
}

async function fetchLiveGitHubStats() {
  try {
    const res = await fetch('https://api.github.com/users/AartRai');
    if (!res.ok) return;
    const data = await res.json();
    
    if (data.public_repos !== undefined) {
      const repoElem = document.getElementById('statRepos');
      if (repoElem) {
        repoElem.setAttribute('data-target', data.public_repos);
        repoElem.textContent = data.public_repos;
      }
    }
    if (data.followers !== undefined) {
      const followersElem = document.getElementById('statFollowers');
      if (followersElem) {
        followersElem.setAttribute('data-target', data.followers);
        followersElem.textContent = data.followers;
      }
    }
  } catch (e) {
    // Fallback numbers already embedded in HTML
  }
}

/* ==========================================================================
   2. Animated Metrics Counter
   ========================================================================== */
function initCounters() {
  const metricNumbers = document.querySelectorAll('.metric-number');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target.getAttribute('data-target');
        animateValue(entry.target, target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  metricNumbers.forEach(num => observer.observe(num));
}

function animateValue(element, targetStr) {
  if (targetStr.includes('k')) {
    // For values like 1.2k
    const numericPart = parseFloat(targetStr);
    let start = 0;
    const duration = 1200;
    const startTime = performance.now();

    function update(time) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = (progress * numericPart).toFixed(1);
      element.textContent = `${current}k`;
      if (progress < 1) requestAnimationFrame(update);
      else element.textContent = targetStr;
    }
    requestAnimationFrame(update);
  } else {
    // For integer values
    const target = parseInt(targetStr, 10);
    let start = 0;
    const duration = 1200;
    const startTime = performance.now();

    function update(time) {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(easeOut * target);
      element.textContent = current;
      if (progress < 1) requestAnimationFrame(update);
      else element.textContent = target;
    }
    requestAnimationFrame(update);
  }
}

/* ==========================================================================
   3. Interactive Skills Filter Tabs
   ========================================================================== */
function initSkillsFilter() {
  const filterBtns = document.querySelectorAll('.skills-filter .filter-btn');
  const categoryGroups = document.querySelectorAll('.skill-category-group');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      categoryGroups.forEach(group => {
        const cat = group.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          group.style.display = 'block';
          group.style.opacity = '1';
          group.style.transform = 'scale(1)';
        } else {
          group.style.display = 'none';
        }
      });
    });
  });
}

/* ==========================================================================
   4. Copy Actions & Toast Feedback
   ========================================================================== */
function initCopyActions() {
  const copyCodeBtn = document.getElementById('copyCodeBtn');
  const copyReadmeBtn = document.getElementById('copyReadmeBtn');
  const copyEmailBtn = document.getElementById('copyEmailBtn');

  // Copy Code Snippet
  if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', () => {
      const code = `const aarti = {
  code: "with purpose",
  learn: "everyday",
  build: "for impact",
  focus: "bigger things"
};`;
      navigator.clipboard.writeText(code).then(() => {
        showToast('Code snippet copied to clipboard! ✨');
      });
    });
  }

  // Copy Email Address
  if (copyEmailBtn) {
    copyEmailBtn.addEventListener('click', () => {
      const emailInput = document.getElementById('emailAddressInput');
      if (emailInput) {
        navigator.clipboard.writeText(emailInput.value).then(() => {
          showToast('Email address copied to clipboard! 📬');
        });
      }
    });
  }

  // Copy Markdown for GitHub README
  if (copyReadmeBtn) {
    copyReadmeBtn.addEventListener('click', () => {
      const readmeMarkdown = generateReadmeMarkdown();
      navigator.clipboard.writeText(readmeMarkdown).then(() => {
        showToast('GitHub Profile README copied! Ready to paste into GitHub. 🚀');
      });
    });
  }
}

function showToast(message) {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

/* ==========================================================================
   5. Interactive Email Modal
   ========================================================================== */
function initContactModal() {
  const modal = document.getElementById('emailModal');
  const openBtn = document.getElementById('emailModalBtn');
  const closeBtn = document.getElementById('closeModalBtn');
  const form = document.getElementById('contactForm');

  if (!modal || !openBtn || !closeBtn) return;

  openBtn.addEventListener('click', () => {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  });

  closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      closeModal();
      showToast('Thank you! Your message has been sent to Aarti. 💌');
      form.reset();
    });
  }

  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  }
}

/* ==========================================================================
   6. Generate Complete GitHub Profile README Markdown
   ========================================================================== */
function generateReadmeMarkdown() {
  return `<div align="center">

# ✨ Aarti Rai ✨
### Full-Stack Developer | AI Enthusiast | Problem Solver

**BUILD • LEARN • GROW • REPEAT**

*"Good Code, Brighter Tomorrows ♡"*

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/aarti--rai/)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AartRai)
[![Email](https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:aartirai.dev@gmail.com)

</div>

---

### 👩‍💻 About Me

I'm a Computer Science student who enjoys building full-stack projects, solving problems, and exploring the intersection of technology and real-world impact. From AI-powered tools to recruitment platforms, I love creating products that make a difference.

- 🎓 **Education:** B.Tech in CSE at Lovely Professional University
- 📍 **Location:** India
- 💖 **Status:** Open to SDE opportunities — *Excited to build and grow!*

\`\`\`javascript
const aarti = {
  code: "with purpose",
  learn: "everyday",
  build: "for impact",
  focus: "bigger things"
};
\`\`\`

---

### 🛠️ Skills & Technologies

| Category | Technologies |
| :--- | :--- |
| **Languages** | JavaScript (ES6+), TypeScript, Python, Java, C++, SQL, HTML5/CSS3 |
| **Frontend** | React.js, Next.js, Redux Toolkit, Tailwind CSS, Responsive Web Design |
| **Backend** | Node.js, Express.js, Django, Spring Boot, RESTful APIs, WebSockets |
| **Databases & Cloud** | PostgreSQL, MySQL, MongoDB, Firebase, Supabase |
| **Tools & AI** | OpenAI API, Git, GitHub, Docker, Postman, System Design, DSA |

---

### 🚀 Featured Projects

#### 1. [Autonomous Talent Career Architecture Platform](https://github.com/AartRai/Autonomous-Talent-Career-Architecture-Platform)
> An intelligent talent mapping and career progression system designed to autonomously assess skill competencies, match engineering talent, and blueprint structured career growth trajectories.  
> **Tech Stack:** \`JavaScript\` • \`Node.js\` • \`AI/TalentTech\` • \`Full-Stack\`

#### 2. [Smart-Desk-Booking](https://github.com/AartRai/Smart-Desk-Booking)
> A reliable workspace management platform enabling real-time desk reservations, floor plan occupancy tracking, and automated capacity scheduling for hybrid corporate environments.  
> **Tech Stack:** \`Java\` • \`Spring Boot\` • \`MySQL\` • \`REST APIs\`

#### 3. [LocaLift](https://github.com/AartRai/localift)
> A community-driven local ride-sharing and carpooling platform connecting verified commuters along daily routes to optimize travel costs, ease traffic, and foster sustainable transit.  
> **Tech Stack:** \`React\` • \`Node.js\` • \`Socket.io\` • \`Maps API\`

---

<div align="center">

### 📊 GitHub Stats & Activity

<img src="https://ghchart.rshah.org/38bdf8/AartRai" alt="Aarti Rai's Real GitHub Activity" />

<br/><br/>

![Aarti's GitHub Stats](https://github-readme-stats.vercel.app/api?username=AartRai&show_icons=true&theme=tokyonight&hide_border=true&bg_color=0c1626)
![Top Langs](https://github-readme-stats.vercel.app/api/top-langs/?username=AartRai&layout=compact&theme=tokyonight&hide_border=true&bg_color=0c1626)

---

*"Let's build something amazing together! ♡"*

</div>`;
}
