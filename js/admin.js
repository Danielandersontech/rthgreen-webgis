// ============================================
// ADMIN.JS
// JavaScript untuk Panel Admin
// WebGIS RTH Kota Pekanbaru
// 
// CATATAN: Halaman ini hanya untuk Admin
// Akses via URL langsung: /admin.html
// ============================================

// ============================================
// VARIABEL GLOBAL
// ============================================
let rthData = [];      // Data RTH untuk referensi nama
let laporanData = [];  // Data laporan untuk tabel
let rthDataLoaded = false; // Flag untuk memastikan data RTH sudah dimuat

// ============================================
// INISIALISASI
// Dijalankan saat halaman selesai dimuat
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    // PENTING: Load data RTH TERLEBIH DAHULU sebelum load data lain
    await loadRthData();
    
    // Setelah RTH data siap, baru load yang lain
    loadStatistics();
    loadLaporanTable();
    
    // Setup event listeners
    setupEventListeners();
});

// ============================================
// LOAD DATA RTH
// Untuk referensi nama RTH di tabel
// ============================================
async function loadRthData() {
    try {
        // Prioritas 1: Supabase
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
        
        // Fallback: GeoJSON
        if (!rthData || rthData.length === 0) {
            const response = await fetch('data/rth_pekanbaru.geojson');
            const geojson = await response.json();
            rthData = geojson.features.map(f => ({
                id: f.properties.OBJECTID.toString(),
                objectid: f.properties.OBJECTID,
                nama_rth: f.properties.Nama_RTH,
                jenis_rth: f.properties.Jenis_RTH
            }));
        }
        
        // Set flag
        rthDataLoaded = true;
        console.log('RTH Data loaded for Admin:', rthData.length, 'items');
        
    } catch (error) {
        console.error('Error loading RTH:', error);
    }
}

// ============================================
// LOAD STATISTICS
// Mengambil dan menampilkan statistik
// ============================================
async function loadStatistics() {
    try {
        let laporanStats, reviewStats;
        
        if (window.supabaseDB && window.supabaseDB.isConnected()) {
            // Ambil dari Supabase
            laporanStats = await window.supabaseDB.getStatistikLaporan();
            reviewStats = await window.supabaseDB.getStatistikReview();
        } else {
            // Mode demo - hitung dari localStorage
            const laporan = JSON.parse(localStorage.getItem('rth_laporan') || '[]');
            const review = JSON.parse(localStorage.getItem('rth_review') || '[]');
            
            laporanStats = {
                total: laporan.length,
                baru: laporan.filter(l => l.status === 'baru').length,
                diproses: laporan.filter(l => l.status === 'diproses').length,
                selesai: laporan.filter(l => l.status === 'selesai').length
            };
            
            const totalRating = review.reduce((sum, r) => sum + r.rating, 0);
            reviewStats = {
                total: review.length,
                rata_rata: review.length > 0 ? (totalRating / review.length).toFixed(1) : '-'
            };
        }
        
        // Update UI dengan data statistik
        document.getElementById('totalLaporan').textContent = laporanStats.total || 0;
        document.getElementById('laporanBaru').textContent = laporanStats.baru || 0;
        document.getElementById('laporanProses').textContent = laporanStats.diproses || 0;
        document.getElementById('laporanSelesai').textContent = laporanStats.selesai || 0;
        document.getElementById('totalReview').textContent = reviewStats.total || 0;
        document.getElementById('avgRating').textContent = reviewStats.rata_rata || '-';
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
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
    
    // Filter status change
    document.getElementById('filterStatus').addEventListener('change', function() {
        renderLaporanTable();  // Re-render tabel dengan filter baru
    });
    
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
    if (tabId === 'laporan') loadLaporanTable();
    if (tabId === 'rating') loadRatingList();
}

// ============================================
// KELOLA LAPORAN
// Fungsi untuk menampilkan dan mengelola laporan
// ============================================

// Load data laporan untuk tabel
async function loadLaporanTable() {
    const container = document.getElementById('laporanTable');
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    try {
        // Pastikan data RTH sudah dimuat
        if (!rthDataLoaded || rthData.length === 0) {
            await loadRthData();
        }
        
        // Ambil data laporan
        if (window.supabaseDB && window.supabaseDB.isConnected()) {
            laporanData = await window.supabaseDB.getAllLaporan();
        } else {
            laporanData = JSON.parse(localStorage.getItem('rth_laporan') || '[]');
        }
        
        // Render tabel
        renderLaporanTable();
        
    } catch (error) {
        console.error('Error loading laporan:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Gagal Memuat Data</h3>
            </div>
        `;
    }
}

// Render tabel laporan ke HTML
function renderLaporanTable() {
    const container = document.getElementById('laporanTable');
    const filterStatus = document.getElementById('filterStatus').value;
    
    // Filter data berdasarkan status
    let filteredData = laporanData;
    if (filterStatus) {
        filteredData = laporanData.filter(l => l.status === filterStatus);
    }
    
    // Update info filter
    document.getElementById('filterInfo').textContent = 
        `Menampilkan ${filteredData.length} dari ${laporanData.length} laporan`;
    
    // Empty state
    if (filteredData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-alt"></i>
                <h3>Tidak Ada Laporan</h3>
                <p>Tidak ada laporan yang sesuai dengan filter.</p>
            </div>
        `;
        return;
    }
    
    // Build tabel HTML
    let html = `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Tanggal</th>
                        <th>Pelapor</th>
                        <th>Lokasi RTH</th>
                        <th>Kategori</th>
                        <th>Status</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    filteredData.forEach(laporan => {
        // Cari nama RTH dengan berbagai cara
        let rthName = 'Unknown';
        
        // Cara 1: Dari relasi Supabase (jika ada)
        if (laporan.rth && laporan.rth.nama_rth) {
            rthName = laporan.rth.nama_rth;
        }
        // Cara 2: Dari field rth_name yang disimpan
        else if (laporan.rth_name) {
            rthName = laporan.rth_name;
        }
        // Cara 3: Cari dari rthData lokal berdasarkan rth_id
        else if (laporan.rth_id) {
            rthName = getRthName(laporan.rth_id);
        }
        
        const tanggal = formatDate(laporan.created_at);
        const statusClass = `status-${laporan.status || 'baru'}`;
        
        html += `
            <tr>
                <td style="white-space: nowrap;">${tanggal}</td>
                <td>${laporan.nama_pelapor}</td>
                <td>
                    <i class="fas fa-map-marker-alt" style="color: var(--primary); margin-right: 5px;"></i>
                    ${rthName}
                </td>
                <td>${laporan.kategori}</td>
                <td><span class="status-badge ${statusClass}">${laporan.status || 'baru'}</span></td>
                <td>
                    <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                        ${laporan.status !== 'baru' ? `
                            <button class="btn btn-info btn-sm" onclick="updateStatus('${laporan.id}', 'baru')">
                                Baru
                            </button>
                        ` : ''}
                        ${laporan.status !== 'diproses' ? `
                            <button class="btn btn-warning btn-sm" onclick="updateStatus('${laporan.id}', 'diproses')">
                                Proses
                            </button>
                        ` : ''}
                        ${laporan.status !== 'selesai' ? `
                            <button class="btn btn-success btn-sm" onclick="updateStatus('${laporan.id}', 'selesai')">
                                Selesai
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// Update status laporan
async function updateStatus(id, newStatus) {
    try {
        if (window.supabaseDB && window.supabaseDB.isConnected()) {
            // Update di Supabase
            await window.supabaseDB.updateStatusLaporan(id, newStatus);
        } else {
            // Mode demo - update di localStorage
            const laporan = JSON.parse(localStorage.getItem('rth_laporan') || '[]');
            const index = laporan.findIndex(l => l.id === id);
            if (index !== -1) {
                laporan[index].status = newStatus;
                localStorage.setItem('rth_laporan', JSON.stringify(laporan));
            }
        }
        
        // Tampilkan notifikasi
        showAlert('success', `Status berhasil diubah ke "${newStatus}"`);
        
        // Reload data
        loadStatistics();
        loadLaporanTable();
        
    } catch (error) {
        console.error('Error updating status:', error);
        showAlert('error', 'Gagal mengubah status');
    }
}

// Expose updateStatus ke global scope agar bisa dipanggil dari onclick
window.updateStatus = updateStatus;

// ============================================
// REKAP RATING
// Fungsi untuk menampilkan rekap rating RTH
// ============================================

async function loadRatingList() {
    const container = document.getElementById('ratingList');
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    try {
        // Pastikan data RTH sudah dimuat
        if (!rthDataLoaded || rthData.length === 0) {
            await loadRthData();
        }
        
        let ratingStats = [];
        let totalReview = 0;
        let totalRating = 0;
        
        if (window.supabaseDB && window.supabaseDB.isConnected()) {
            // Ambil dari Supabase
            ratingStats = await window.supabaseDB.getRatingPerRth();
            const reviews = await window.supabaseDB.getAllReview();
            totalReview = reviews.length;
            totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
        } else {
            // Mode demo
            const reviews = JSON.parse(localStorage.getItem('rth_review') || '[]');
            totalReview = reviews.length;
            totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
            
            // Hitung statistik per RTH
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
                .map(s => ({ ...s, rata_rata: (s.total_rating / s.count).toFixed(1) }))
                .sort((a, b) => b.rata_rata - a.rata_rata);
        }
        
        // Update ringkasan
        const avgRating = totalReview > 0 ? (totalRating / totalReview).toFixed(1) : '-';
        document.getElementById('summaryAvg').textContent = avgRating;
        document.getElementById('summaryTotal').textContent = totalReview;
        document.getElementById('summaryRth').textContent = ratingStats.length;
        document.getElementById('summaryStars').innerHTML = 
            avgRating !== '-' ? renderStars(Math.round(parseFloat(avgRating))) : '';
        
        // Render list rating
        renderRatingList(container, ratingStats);
        
    } catch (error) {
        console.error('Error loading rating:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-star"></i>
                <h3>Belum Ada Data Rating</h3>
            </div>
        `;
    }
}

// Render list rating ke HTML
function renderRatingList(container, stats) {
    if (stats.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-star"></i>
                <h3>Belum Ada Data Rating</h3>
                <p>Belum ada review yang dikirim untuk RTH manapun.</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="grid-2">';
    
    // Warna medali untuk top 3
    const medalColors = ['#f1c40f', '#95a5a6', '#cd7f32'];
    
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
                    <div class="review-count">${stat.count} review</div>
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
    
    console.log('RTH not found for ID:', rthId, 'Available IDs sample:', rthData.slice(0, 5).map(r => r.objectid || r.id));
    return 'Unknown';
}

// Format tanggal ke format Indonesia
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Render bintang rating
function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star"></i>';
        } else {
            stars += '<i class="fas fa-star empty"></i>';
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
            <i class="fas fa-${icons[type] || 'info-circle'}"></i>
            ${message}
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', alertHtml);
    
    setTimeout(() => {
        const alert = document.getElementById(`alert-${alertId}`);
        if (alert) alert.remove();
    }, 3000);
}