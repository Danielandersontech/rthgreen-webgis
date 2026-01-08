// ============================================
// REVIEW.JS
// JavaScript untuk Halaman Review
// WebGIS RTH Kota Pekanbaru
// ============================================

// ============================================
// VARIABEL GLOBAL
// ============================================
let rthData = [];  // Data RTH untuk dropdown
let rthDataLoaded = false; // Flag untuk memastikan data RTH sudah dimuat

// ============================================
// INISIALISASI
// Dijalankan saat halaman selesai dimuat
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Load data RTH untuk dropdown
    loadRthData();
    
    // Setup event listeners
    setupEventListeners();
    
    // Cek koneksi database
    if (!window.supabaseDB || !window.supabaseDB.isConnected()) {
        showAlert('warning', 'Mode Demo: Data disimpan di browser (localStorage).');
    }
});

// ============================================
// LOAD DATA RTH
// Mengambil data RTH untuk dropdown
// ============================================
async function loadRthData() {
    try {
        // Prioritas 1: Ambil dari Supabase
        if (window.supabaseDB && window.supabaseDB.isConnected()) {
            const dbData = await window.supabaseDB.getAllRthFromDB();
            if (dbData && dbData.length > 0) {
                rthData = dbData.map(rth => ({
                    id: rth.objectid?.toString() || rth.id?.toString(),
                    objectid: rth.objectid,
                    nama_rth: rth.nama_rth,
                    jenis_rth: rth.jenis_rth
                }));
            }
        }
        
        // Fallback: Ambil dari file GeoJSON lokal
        if (!rthData || rthData.length === 0) {
            const response = await fetch('data/rth_pekanbaru.geojson');
            const geojson = await response.json();
            
            // Konversi format GeoJSON
            rthData = geojson.features.map(f => ({
                id: f.properties.OBJECTID.toString(),
                objectid: f.properties.OBJECTID,
                nama_rth: f.properties.Nama_RTH,
                jenis_rth: f.properties.Jenis_RTH
            }));
        }
        
        // Set flag bahwa data sudah dimuat
        rthDataLoaded = true;
        console.log('RTH Data loaded:', rthData.length, 'items');
        
        // Isi dropdown
        populateRthDropdowns();
        
    } catch (error) {
        console.error('Error loading RTH data:', error);
        showAlert('error', 'Gagal memuat data RTH');
    }
}

// Fungsi untuk mengisi dropdown RTH
function populateRthDropdowns() {
    const selectForm = document.getElementById('rthSelect');    // Dropdown di form
    const selectFilter = document.getElementById('filterRth');  // Dropdown filter
    
    // Urutkan berdasarkan nama
    rthData.sort((a, b) => a.nama_rth.localeCompare(b.nama_rth));
    
    // Isi dropdown form
    selectForm.innerHTML = '<option value="">-- Pilih Lokasi RTH --</option>';
    rthData.forEach(rth => {
        const option = document.createElement('option');
        // Gunakan objectid sebagai value (konsisten dengan database)
        option.value = rth.objectid?.toString() || rth.id;
        option.textContent = `${rth.nama_rth} (${rth.jenis_rth})`;
        selectForm.appendChild(option);
    });
    
    // Isi dropdown filter
    selectFilter.innerHTML = '<option value="">Semua RTH</option>';
    rthData.forEach(rth => {
        const option = document.createElement('option');
        option.value = rth.objectid?.toString() || rth.id;
        option.textContent = rth.nama_rth;
        selectFilter.appendChild(option);
    });
}

// ============================================
// EVENT LISTENERS
// Setup semua event listener
// ============================================
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            switchTab(tabId);
        });
    });
    
    // Form submit
    document.getElementById('formReview').addEventListener('submit', handleSubmit);
    
    // Filter RTH change
    document.getElementById('filterRth').addEventListener('change', loadReviewList);
    
    // Mobile navigation toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
}

// Fungsi untuk berpindah tab
function switchTab(tabId) {
    // Update tombol tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabId) btn.classList.add('active');
    });
    
    // Update konten tab
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-${tabId}`).classList.add('active');
    
    // Load data sesuai tab
    if (tabId === 'list') loadReviewList();
    if (tabId === 'rekap') loadRekapRating();
}

// ============================================
// FORM SUBMIT
// Fungsi untuk mengirim review
// ============================================
async function handleSubmit(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
    
    try {
        // Ambil nilai dari form
        const nama = document.getElementById('namaReviewer').value.trim();
        const rthId = document.getElementById('rthSelect').value;
        const rating = document.querySelector('input[name="rating"]:checked')?.value;
        const komentar = document.getElementById('komentarReview').value.trim();
        
        // Validasi rating
        if (!rating) {
            showAlert('error', 'Silakan berikan rating');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim Review';
            return;
        }
        
        // Cari nama RTH untuk disimpan juga
        const rthName = getRthName(rthId);
        
        // Siapkan data review
        const review = {
            nama: nama,
            rth_id: rthId,
            rth_name: rthName,  // Simpan juga nama RTH untuk backup
            rating: parseInt(rating),
            komentar: komentar,
            created_at: new Date().toISOString()
        };
        
        // Simpan review
        if (window.supabaseDB && window.supabaseDB.isConnected()) {
            await window.supabaseDB.insertReview(review);
        } else {
            // Mode demo - localStorage
            const existing = JSON.parse(localStorage.getItem('rth_review') || '[]');
            review.id = Date.now().toString();
            existing.unshift(review);
            localStorage.setItem('rth_review', JSON.stringify(existing));
        }
        
        showAlert('success', 'Review berhasil dikirim! Terima kasih atas ulasan Anda.');
        
        // Reset form
        e.target.reset();
        
    } catch (error) {
        console.error('Error submitting review:', error);
        showAlert('error', 'Gagal mengirim review. Silakan coba lagi.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim Review';
    }
}

// ============================================
// LOAD & RENDER REVIEW LIST
// Fungsi untuk menampilkan daftar review
// ============================================

async function loadReviewList() {
    const container = document.getElementById('reviewList');
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    try {
        // Pastikan data RTH sudah dimuat terlebih dahulu
        if (!rthDataLoaded || rthData.length === 0) {
            await loadRthData();
        }
        
        let reviewData;
        const filterRthId = document.getElementById('filterRth').value;
        
        // Ambil data
        if (window.supabaseDB && window.supabaseDB.isConnected()) {
            if (filterRthId) {
                // Filter berdasarkan RTH
                reviewData = await window.supabaseDB.getReviewByRth(filterRthId);
            } else {
                // Semua review
                reviewData = await window.supabaseDB.getAllReview();
            }
        } else {
            // Mode demo
            reviewData = JSON.parse(localStorage.getItem('rth_review') || '[]');
            if (filterRthId) {
                reviewData = reviewData.filter(r => r.rth_id === filterRthId);
            }
        }
        
        renderReviewList(container, reviewData);
        
    } catch (error) {
        console.error('Error loading review:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Gagal Memuat Data</h3>
            </div>
        `;
    }
}

// Render daftar review ke HTML
function renderReviewList(container, data) {
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-star"></i>
                <h3>Belum Ada Review</h3>
                <p>Jadilah yang pertama memberikan review!</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="grid-2">';
    
    data.forEach(review => {
        // Cari nama RTH dengan berbagai cara
        let rthName = 'Unknown';
        
        // Cara 1: Dari relasi Supabase (jika ada)
        if (review.rth && review.rth.nama_rth) {
            rthName = review.rth.nama_rth;
        }
        // Cara 2: Dari field rth_name yang disimpan
        else if (review.rth_name) {
            rthName = review.rth_name;
        }
        // Cara 3: Cari dari rthData lokal
        else if (review.rth_id) {
            rthName = getRthName(review.rth_id);
        }
        
        const date = formatDate(review.created_at);
        const stars = renderStars(review.rating);
        
        html += `
            <div class="review-card">
                <div class="review-card-header">
                    <span class="review-card-author">${review.nama}</span>
                    <span class="review-card-date">${date}</span>
                </div>
                <div class="review-card-rating">
                    <div class="rating-display">${stars}</div>
                </div>
                <div class="review-card-rth">
                    <i class="fas fa-map-marker-alt"></i> ${rthName}
                </div>
                <div class="review-card-comment">${review.komentar}</div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// ============================================
// LOAD & RENDER REKAP RATING
// Fungsi untuk menampilkan rekap rating per RTH
// ============================================

async function loadRekapRating() {
    const container = document.getElementById('rekapRating');
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    try {
        // Pastikan data RTH sudah dimuat
        if (!rthDataLoaded || rthData.length === 0) {
            await loadRthData();
        }
        
        let ratingStats;
        
        if (window.supabaseDB && window.supabaseDB.isConnected()) {
            ratingStats = await window.supabaseDB.getRatingPerRth();
        } else {
            // Mode demo - hitung manual
            const reviews = JSON.parse(localStorage.getItem('rth_review') || '[]');
            const statsMap = {};
            
            reviews.forEach(r => {
                if (!statsMap[r.rth_id]) {
                    statsMap[r.rth_id] = {
                        rth_id: r.rth_id,
                        nama_rth: r.rth_name || getRthName(r.rth_id),
                        total_rating: 0,
                        count: 0
                    };
                }
                statsMap[r.rth_id].total_rating += r.rating;
                statsMap[r.rth_id].count += 1;
            });
            
            ratingStats = Object.values(statsMap)
                .map(s => ({
                    ...s,
                    rata_rata: (s.total_rating / s.count).toFixed(1)
                }))
                .sort((a, b) => b.rata_rata - a.rata_rata);
        }
        
        renderRekapRating(container, ratingStats);
        
    } catch (error) {
        console.error('Error loading rekap:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-bar"></i>
                <h3>Gagal Memuat Data</h3>
            </div>
        `;
    }
}

// Render rekap rating ke HTML
function renderRekapRating(container, stats) {
    if (!stats || stats.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-bar"></i>
                <h3>Belum Ada Data Rating</h3>
                <p>Belum ada review yang diberikan untuk RTH.</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="grid-2">';
    
    // Warna medali untuk top 3
    const medalColors = ['#f1c40f', '#95a5a6', '#cd7f32'];  // Emas, Perak, Perunggu
    
    stats.forEach((stat, index) => {
        // Cari nama RTH jika belum ada
        let namaRth = stat.nama_rth;
        if (!namaRth || namaRth === 'Unknown') {
            namaRth = getRthName(stat.rth_id);
        }
        
        const stars = renderStars(Math.round(parseFloat(stat.rata_rata)));
        const medalColor = index < 3 ? medalColors[index] : 'var(--light)';
        const medalText = index < 3 ? 'white' : 'var(--dark)';
        
        html += `
            <div class="rating-card">
                <div class="rating-card-info">
                    <span style="display: inline-block; padding: 3px 10px; background: ${medalColor}; color: ${medalText}; border-radius: 15px; font-size: 0.75rem; font-weight: 600; margin-bottom: 8px;">
                        #${index + 1}
                    </span>
                    <h4>${namaRth}</h4>
                    <div class="rating-display">${stars}</div>
                    <span class="review-count">${stat.count} review</span>
                </div>
                <div class="rating-card-score">
                    <div class="score">${stat.rata_rata}</div>
                    <div class="label">dari 5</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// ============================================
// HELPER FUNCTIONS
// Fungsi-fungsi pembantu
// ============================================

// Cari nama RTH berdasarkan ID
function getRthName(rthId) {
    if (!rthId) return 'Unknown';
    
    // Konversi ke string untuk perbandingan yang konsisten
    const searchId = rthId.toString();
    
    // Cari di rthData dengan berbagai kemungkinan match
    const rth = rthData.find(r => {
        const id1 = r.id?.toString() || '';
        const id2 = r.objectid?.toString() || '';
        return id1 === searchId || id2 === searchId;
    });
    
    if (rth) {
        return rth.nama_rth;
    }
    
    console.log('RTH not found for ID:', rthId, 'Available IDs:', rthData.map(r => r.objectid || r.id));
    return 'Unknown';
}

// Format tanggal ke format Indonesia
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

// Render bintang rating
function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star"></i>';  // Bintang penuh
        } else {
            stars += '<i class="fas fa-star empty"></i>';  // Bintang kosong
        }
    }
    return stars;
}

// Tampilkan alert/notifikasi
function showAlert(type, message) {
    const container = document.getElementById('alertContainer');
    const alertId = Date.now();
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle'
    };
    
    const alertHtml = `
        <div id="alert-${alertId}" class="alert alert-${type}">
            <i class="fas fa-${icons[type]}"></i>
            ${message}
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', alertHtml);
    
    setTimeout(() => {
        const alert = document.getElementById(`alert-${alertId}`);
        if (alert) alert.remove();
    }, 5000);
}