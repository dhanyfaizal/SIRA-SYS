/**
 * SIRA-SYS — WebSlide HTML Generator
 * Helper untuk menyusun berkas HTML WebSlide interaktif secara dinamis
 * berdasarkan data materi pertemuan hasil generate AI.
 */

const PRODI_THEMES = {
  si: {
    accent: '#ef4444',
    dark: '#7f1d1d',
    rgbaLight: 'rgba(239, 68, 68, 0.1)',
    rgbaDark: 'rgba(239, 68, 68, 0.16)'
  },
  ka: {
    accent: '#10b981',
    dark: '#064e3b',
    rgbaLight: 'rgba(16, 185, 129, 0.1)',
    rgbaDark: 'rgba(16, 185, 129, 0.16)'
  },
  ti: {
    accent: '#f97316',
    dark: '#9a3412',
    rgbaLight: 'rgba(249, 115, 22, 0.1)',
    rgbaDark: 'rgba(249, 115, 22, 0.16)'
  },
  dkv: {
    accent: '#8b5cf6',
    dark: '#581c87',
    rgbaLight: 'rgba(139, 92, 246, 0.1)',
    rgbaDark: 'rgba(139, 92, 246, 0.16)'
  },
  default: {
    accent: '#3b82f6',
    dark: '#1e3a8a',
    rgbaLight: 'rgba(59, 130, 246, 0.1)',
    rgbaDark: 'rgba(59, 130, 246, 0.16)'
  }
};

function getThemeByProdi(prodiName) {
  const name = prodiName?.toLowerCase() || '';
  if (name.includes('sistem informasi')) return PRODI_THEMES.si;
  if (name.includes('komputerisasi akuntansi')) return PRODI_THEMES.ka;
  if (name.includes('teknik informatika')) return PRODI_THEMES.ti;
  if (name.includes('desain komunikasi visual')) return PRODI_THEMES.dkv;
  return PRODI_THEMES.default;
}

export function generateWebSlideHtml(courseName, prodiName, meetingNo, slideData) {
  const theme = getThemeByProdi(prodiName);
  const title = slideData?.title || `Materi Pertemuan ${meetingNo}`;
  const slides = slideData?.slides || [];

  // Bangun option slide untuk menu dropdown
  const dropdownOptions = slides.map((slide, idx) => {
    return `<option value="${idx}">Slide ${idx + 1}: ${slide.title || 'Materi'}</option>`;
  }).join('\n            ');

  // Render konten slide secara dinamis berdasarkan jumlah poin data
  function renderSlideBody(slide, slideIndex) {
    const points = slide.content || [];
    if (points.length === 0) return '';

    // Slide 1 adalah Cover, tidak perlu list lagi (sudah digambar khusus)
    if (slideIndex === 0) {
      return `
        <div class="cover-content">
          <h2 class="animate-item animate-delay-1" style="color: var(--accent-cyan); text-transform: uppercase; letter-spacing: 2.5px; font-weight: 700; margin-bottom: 12px; font-size: calc(18px * var(--fs-mult));">
            Pertemuan ${meetingNo}
          </h2>
          <h1 class="animate-item animate-delay-1" style="line-height: 1.15; margin-bottom: 24px; font-weight: 800; font-size: calc(48px * var(--fs-mult)); color: #FFFFFF; text-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            ${courseName.toUpperCase()}<br>
            <span style="color: var(--accent-cyan);">${title.toUpperCase()}</span>
          </h1>
          <p class="animate-item animate-delay-2" style="max-width: 850px; font-weight: 500; font-size: calc(20px * var(--fs-mult)); color: #D8E7FF; line-height: 1.6; margin-bottom: 24px;">
            ${points[0] || 'Outline presentasi terstruktur pendukung perkuliahan berbasis Outcome-Based Education.'}
          </p>
          <div class="animate-item animate-delay-3" style="display: flex; gap: 12px; margin-top: 30px; flex-wrap: wrap;">
            <span class="badge-tag">Rencana Pembelajaran Semester</span>
            <span class="badge-tag">Pertemuan ${meetingNo}</span>
            <span class="badge-tag" style="background: rgba(255,255,255,0.15); color: #fff;">${prodiName}</span>
          </div>
        </div>
      `;
    }

    // Pilihan tata letak dinamis
    if (points.length === 2) {
      return `
        <div class="grid-2-col">
          ${points.map((pt, idx) => `
            <div class="content-card animate-item animate-delay-${idx + 1}">
              <div class="card-icon"><i class="fa-solid fa-arrow-right"></i></div>
              <div class="card-text">${pt}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (points.length === 3) {
      return `
        <div class="grid-3-col">
          ${points.map((pt, idx) => `
            <div class="content-card animate-item animate-delay-${idx + 1}">
              <div class="card-icon"><i class="fa-solid fa-bolt"></i></div>
              <div class="card-text">${pt}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (points.length === 4) {
      return `
        <div class="grid-2x2">
          ${points.map((pt, idx) => `
            <div class="content-card animate-item animate-delay-${idx + 1}">
              <div class="card-icon"><i class="fa-solid fa-circle-dot"></i></div>
              <div class="card-text">${pt}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      // List vertikal untuk item yang lebih banyak
      const isCompact = points.length > 5;
      return `
        <div class="content-list ${isCompact ? 'compact' : ''}">
          ${points.map((pt, idx) => `
            <div class="content-item animate-item animate-delay-${idx + 1}">
              <div class="item-icon"><i class="fa-solid fa-square-check"></i></div>
              <div class="item-text">${pt}</div>
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  // Bangun elemen HTML slide
  const slidesHtml = slides.map((slide, idx) => {
    const isDark = idx === 0 ? 'dark active' : '';
    const slideTitle = idx === 0 
      ? '' 
      : `<h2 class="slide-title"><span>${slide.title || `Slide ${idx + 1}`}</span></h2>`;

    return `
    <!-- Slide ${idx + 1} -->
    <div class="slide ${isDark}" id="slide${idx + 1}">
        ${slideTitle}
        <div class="content-area">
            ${renderSlideBody(slide, idx)}
        </div>
    </div>`;
  }).join('\n');

  // Kerangka HTML Utama WebSlide
  return `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebSlide - ${courseName} - Pertemuan ${meetingNo}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;600;800&family=Plus+Jakarta+Sans:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        :root {
            --bg-dark: #F3F4F6;
            --bg-card: #FFFFFF;
            --bg-card-hover: #F9FAFB;
            --accent-cyan: ${theme.accent};
            --accent-dark: ${theme.dark};
            --text-main: #1F2937;
            --text-dim: #4B5563;
            --slide-width: 1280px;
            --slide-height: 720px;
            --fs-mult: 1.05;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            background-color: var(--bg-dark); color: var(--text-main);
            font-family: 'Plus Jakarta Sans', sans-serif;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            min-height: 100vh; overflow: hidden;
        }
        #slider-wrapper {
            width: var(--slide-width); height: var(--slide-height); position: relative;
            background-color: var(--bg-dark); border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.08);
            overflow: hidden; border: 1px solid rgba(209,213,219,1); transition: all 0.3s ease;
        }
        #slider-wrapper:fullscreen { width: 100vw !important; height: 100vh !important; border-radius: 0 !important; display: flex; flex-direction: column; justify-content: center; align-items: center; background-color: var(--bg-dark); }
        #slider-wrapper:fullscreen .slide { padding: 120px 80px 80px 80px; }
        .top-header {
            position: absolute; top: 20px; left: 40px; right: 40px; height: 60px;
            display: flex; justify-content: space-between; align-items: center; z-index: 20;
            background: rgba(255,255,255,0.85); padding: 10px 20px; border-radius: 12px;
            border: 1px solid rgba(209,213,219,0.8); backdrop-filter: blur(12px);
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        #slider-wrapper:fullscreen .top-header { top: 30px; left: 50px; right: 50px; }
        .brand-logo { display: flex; align-items: center; gap: 12px; font-family: 'Urbanist', sans-serif; font-weight: 800; font-size: 20px; letter-spacing: -0.5px; transition: opacity .25s ease; }
        .header-controls { display: flex; align-items: center; gap: 12px; margin-left: auto; }
        .font-control-group { display: flex; background: #FFFFFF; border: 1px solid rgba(209,213,219,1); border-radius: 8px; overflow: hidden; }
        .font-btn, .action-btn { background: transparent; border: none; color: var(--text-main); padding: 8px 12px; cursor: pointer; font-size: 14px; font-weight: 600; transition: all 0.2s ease; display: flex; align-items: center; gap: 6px; }
        .font-btn:hover, .action-btn:hover { background: ${theme.rgbaLight}; color: var(--accent-cyan); }
        .font-btn:not(:last-child) { border-right: 1px solid rgba(209,213,219,1); }
        .action-btn { background: #FFFFFF; border: 1px solid rgba(209,213,219,1); border-radius: 8px; padding: 8px 14px; }
        .slide-select-nav {
            background: #FFFFFF; color: var(--text-main); border: 1px solid rgba(209,213,219,1);
            padding: 8px 14px; border-radius: 8px; font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 14px; font-weight: 600; cursor: pointer; outline: none; transition: all 0.3s ease; max-width: 260px;
        }
        .slide-select-nav:hover, .slide-select-nav:focus { border-color: var(--accent-cyan); box-shadow: 0 0 10px rgba(0,0,0,0.05); }
        #progress-container { position: absolute; top: 0; left: 0; width: 100%; height: 6px; background: rgba(229,231,235,1); z-index: 10; }
        #progress-bar { height: 100%; width: 0%; background: linear-gradient(90deg, #9CA3AF, var(--accent-cyan)); transition: width 0.4s cubic-bezier(0.22,1,0.36,1); }
        
        .slide {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%; padding: 100px 60px 60px 60px;
            opacity: 0; visibility: hidden; transform: translateX(50px); transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.22,1,0.36,1), visibility 0.5s;
            display: flex; flex-direction: column; z-index: 1;
            background-image: radial-gradient(circle at 100% 0%, ${theme.rgbaLight} 0%, transparent 50%), linear-gradient(rgba(243,244,246,0.96), rgba(243,244,246,0.99)), url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgwLDAsMCwwLjA0KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+');
            background-size: cover, cover, auto; background-position: center;
        }
        .slide.dark { background: radial-gradient(circle at 100% 0%, ${theme.rgbaDark} 0%, transparent 45%), linear-gradient(135deg, ${theme.dark}, #111827 75%); }
        .slide.active { opacity: 1; visibility: visible; transform: translateX(0); z-index: 2; }
        .slide.prev-slide { transform: translateX(-50px); }
        .content-area { position: relative; z-index: 2; flex-grow: 1; display: flex; flex-direction: column; justify-content: center; width: 100%; min-height: 0; }
        
        .slide-title { font-size: calc(36px * var(--fs-mult)); font-weight: 800; margin-bottom: 22px; text-transform: uppercase; border-left: 6px solid var(--accent-cyan); padding-left: 20px; line-height: 1.1; transition: font-size 0.2s ease; font-family: 'Urbanist', sans-serif; letter-spacing: -1px; }
        .slide-title span { color: var(--accent-cyan); }
        .dark .slide-title { color: #FFFFFF; }
        
        /* Layout - 2 Columns */
        .grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
        
        /* Layout - 3 Columns */
        .grid-3-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
        
        /* Layout - 2x2 Grid */
        .grid-2x2 { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; gap: 20px; }
        
        /* Cards styling for grids */
        .content-card {
            background: var(--bg-card); border: 1px solid rgba(229,231,235,1);
            padding: 28px 24px; border-radius: 16px; transition: all 0.3s ease;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03); display: flex; flex-direction: column;
            gap: 14px; min-height: 140px; justify-content: flex-start;
        }
        .content-card:hover { transform: translateY(-4px); border-color: var(--accent-cyan); box-shadow: 0 12px 20px -8px ${theme.rgbaLight}; }
        .card-icon { font-size: 28px; color: var(--accent-cyan); }
        .card-text { font-size: calc(15px * var(--fs-mult)); color: var(--text-dim); line-height: 1.6; font-weight: 500; }
        
        /* Layout - List Vertikal */
        .content-list { display: flex; flex-direction: column; gap: 16px; }
        .content-item {
            background: var(--bg-card); border: 1px solid rgba(229,231,235,1);
            padding: 20px 24px; border-radius: 12px; display: flex; align-items: flex-start;
            gap: 16px; transition: all 0.3s ease; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
        }
        .content-item:hover { transform: translateY(-2px); border-color: var(--accent-cyan); box-shadow: 0 8px 15px -3px rgba(0,0,0,0.05); }
        .item-icon { color: var(--accent-cyan); font-size: 20px; margin-top: 2px; flex-shrink: 0; }
        .item-text { font-size: calc(15.5px * var(--fs-mult)); color: var(--text-dim); line-height: 1.55; font-weight: 500; }
        
        /* Compact Vertical List */
        .content-list.compact { gap: 10px; }
        .content-list.compact .content-item { padding: 12px 20px; gap: 12px; }
        .content-list.compact .item-text { font-size: calc(14.5px * var(--fs-mult)); }
        
        .badge-tag {
            background: rgba(255,255,255,0.08); color: var(--accent-cyan);
            padding: 6px 14px; border-radius: 8px; font-size: calc(12px * var(--fs-mult));
            font-weight: 700; border: 1px solid rgba(255,255,255,0.15); display: inline-block;
        }
        .controls { position: absolute; bottom: 30px; right: 40px; display: flex; gap: 15px; z-index: 10; }
        .nav-btn-bottom {
            background: #FFFFFF; border: 1px solid rgba(209,213,219,1); color: var(--text-main);
            width: 48px; height: 48px; border-radius: 50%; cursor: pointer; display: flex;
            align-items: center; justify-content: center; font-size: 18px; transition: all 0.3s ease;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .nav-btn-bottom:hover { background: var(--accent-cyan); color: #FFFFFF; border-color: var(--accent-cyan); box-shadow: 0 10px 15px -3px ${theme.rgbaLight}; transform: translateY(-2px); }
        
        /* Animation states */
        .active .animate-item { animation: fadeInUp 0.5s forwards; opacity: 0; }
        .active .animate-delay-1 { animation-delay: 0.1s; }
        .active .animate-delay-2 { animation-delay: 0.22s; }
        .active .animate-delay-3 { animation-delay: 0.35s; }
        .active .animate-delay-4 { animation-delay: 0.48s; }
        .active .animate-delay-5 { animation-delay: 0.6s; }
        .active .animate-delay-6 { animation-delay: 0.72s; }
        .active .animate-delay-7 { animation-delay: 0.84s; }
        .active .animate-delay-8 { animation-delay: 0.96s; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>
<div id="slider-wrapper">
    <div id="progress-container"><div id="progress-bar"></div></div>
    <div class="top-header">
        <div class="brand-logo" id="header-brand-logo">
            <img src="https://i.ibb.co.com/kgV7WDhF/Logo-SYS.png" alt="Logo STIKOM Yos Sudarso" style="height: 36px; object-fit: contain;">
            <span style="border-left: 2px solid #374151; padding-left: 12px; margin-left: 5px; color: var(--text-main); font-weight: 700;">WebSlide</span>
        </div>
        <div class="header-controls">
            <button class="action-btn" id="btn-fullscreen" title="Layar Penuh"><i class="fa-solid fa-expand"></i> Fullscreen</button>
            <div class="font-control-group">
                <button class="font-btn" id="btn-font-down"><i class="fa-solid fa-minus"></i> A</button>
                <button class="font-btn" id="btn-font-reset">A</button>
                <button class="font-btn" id="btn-font-up"><i class="fa-solid fa-plus"></i> A</button>
            </div>
            <select class="slide-select-nav" id="slide-jump-menu">
                ${dropdownOptions}
            </select>
        </div>
    </div>

    ${slidesHtml}

    <div class="controls">
        <button class="nav-btn-bottom" id="prev-btn" title="Slide Sebelumnya"><i class="fa-solid fa-arrow-left"></i></button>
        <button class="nav-btn-bottom" id="next-btn" title="Slide Berikutnya"><i class="fa-solid fa-arrow-right"></i></button>
    </div>
</div>

<script>
    const slides = document.querySelectorAll(".slide");
    const progressBar = document.getElementById("progress-bar");
    const jumpMenu = document.getElementById("slide-jump-menu");
    const headerLogo = document.getElementById("header-brand-logo");
    const sliderWrapper = document.getElementById("slider-wrapper");
    const fullscreenBtn = document.getElementById("btn-fullscreen");
    let currentSlide = 0;

    function goToSlide(index) {
        if (index < 0 || index >= slides.length) return;
        slides.forEach((slide, idx) => {
            slide.classList.remove("active", "prev-slide");
            if (idx < index) slide.classList.add("prev-slide");
        });
        currentSlide = index;
        slides[currentSlide].classList.add("active");
        
        // Hide logo on Cover Slide (Slide 1)
        if (currentSlide === 0) {
            headerLogo.style.opacity = "0";
            headerLogo.style.pointerEvents = "none";
        } else {
            headerLogo.style.opacity = "1";
            headerLogo.style.pointerEvents = "auto";
        }
        jumpMenu.value = currentSlide;
        progressBar.style.width = ((currentSlide + 1) / slides.length * 100) + "%";
    }

    document.getElementById("next-btn").addEventListener("click", () => currentSlide < slides.length - 1 && goToSlide(currentSlide + 1));
    document.getElementById("prev-btn").addEventListener("click", () => currentSlide > 0 && goToSlide(currentSlide - 1));
    jumpMenu.addEventListener("change", (e) => { goToSlide(parseInt(e.target.value)); });
    
    document.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); currentSlide < slides.length - 1 && goToSlide(currentSlide + 1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); currentSlide > 0 && goToSlide(currentSlide - 1); }
    });
    
    fullscreenBtn.addEventListener("click", () => {
        if (!document.fullscreenElement) {
            sliderWrapper.requestFullscreen().catch(err => { alert(\`Gagal: \${err.message}\`); });
        } else { document.exitFullscreen(); }
    });
    
    document.addEventListener("fullscreenchange", () => {
        if (document.fullscreenElement) {
            fullscreenBtn.innerHTML = '<i class="fa-solid fa-compress"></i> Exit Fullscreen';
            fullscreenBtn.style.backgroundColor = "${theme.rgbaLight}";
            fullscreenBtn.style.color = "var(--accent-cyan)";
        } else {
            fullscreenBtn.innerHTML = '<i class="fa-solid fa-expand"></i> Fullscreen';
            fullscreenBtn.style.backgroundColor = "#FFFFFF";
            fullscreenBtn.style.color = "var(--text-main)";
        }
    });
    
    // Swipe gestures
    let touchstartX = 0;
    document.addEventListener('touchstart', e => {
        touchstartX = e.touches[0].clientX;
    }, {passive: true});
    
    document.addEventListener('touchend', e => {
        const touchendX = e.changedTouches[0].clientX;
        const diffX = touchendX - touchstartX;
        if (Math.abs(diffX) > 50) {
            if (diffX < 0) { // Swipe left, next slide
                currentSlide < slides.length - 1 && goToSlide(currentSlide + 1);
            } else { // Swipe right, prev slide
                currentSlide > 0 && goToSlide(currentSlide - 1);
            }
        }
    }, {passive: true});

    goToSlide(0);

    let fontMultiplier = 1.05;
    const rootStyle = document.documentElement.style;
    document.getElementById("btn-font-up").addEventListener("click", () => {
        if (fontMultiplier < 1.45) { fontMultiplier += 0.05; rootStyle.setProperty('--fs-mult', fontMultiplier.toFixed(2)); }
    });
    document.getElementById("btn-font-down").addEventListener("click", () => {
        if (fontMultiplier > 0.85) { fontMultiplier -= 0.05; rootStyle.setProperty('--fs-mult', fontMultiplier.toFixed(2)); }
    });
    document.getElementById("btn-font-reset").addEventListener("click", () => {
        fontMultiplier = 1.05; rootStyle.setProperty('--fs-mult', fontMultiplier.toFixed(2));
    });
</script>
</body>
</html>`;
}
