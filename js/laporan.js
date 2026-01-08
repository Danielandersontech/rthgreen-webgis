// ============================================
// LAPORAN.JS
// JavaScript untuk Halaman Laporan
// WebGIS RTH Kota Pekanbaru
// ============================================

// ============================================
// VARIABEL GLOBAL
// ============================================
let rthData = [];        // Data RTH untuk dropdown
let selectedFile = null; // File foto yang dipilih

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
// Mengambil data RTH untuk dropdown lokasi
// ============================================
async function loadRthData() {
    try {
        // Prioritas 1: Ambil dari Supabase
        if (window.supabaseDB && window.supabaseDB.isConnected()) {
            rthData = await window.supabaseDB.getAllRthFromDB();
        }
        
        // Fallback: Ambil dari file GeoJSON lokal
        if (!rthData || rthData.length === 0) {
            const response = await fetch('data/rth_pekanbaru.geojson');
            const geojson = await response.json();
            
            // Konversi format GeoJSON ke format yang sama dengan database
            rthData = geojson.features.map(f => ({
                id: f.properties.OBJECTID.toString(),
                objectid: f.properties.OBJECTID,
                nama_rth: f.properties.Nama_RTH,
                jenis_rth: f.properties.Jenis_RTH,
                luas_m2: f.properties.Luas_m2
            }));
        }
        
        // Isi dropdown dengan data RTH
        populateRthDropdown();
        
    } catch (error) {
        console.error('Error loading RTH data:', error);
        showAlert('error', 'Gagal memuat data RTH');
    }
}

// Fungsi untuk mengisi dropdown RTH
function populateRthDropdown() {
    const select = document.getElementById('lokasiRth');
    
    // Reset dropdown
    select.innerHTML = '<option value="">-- Pilih Lokasi RTH --</option>';
    
    // Urutkan berdasarkan nama
    rthData.sort((a, b) => a.nama_rth.localeCompare(b.nama_rth));
    
    // Tambahkan setiap RTH sebagai option
    rthData.forEach(rth => {
        const option = document.createElement('option');
        option.value = rth.id || rth.objectid;
        option.textContent = `${rth.nama_rth} (${rth.jenis_rth})`;
        select.appendChild(option);
    });
}

// ============================================
// EVENT LISTENERS
// Setup semua event listener
// ============================================
function setupEventListeners() {
    // Tab switching - perpindahan antar tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            switchTab(tabId);
        });
    });
    
    // Form submit - kirim laporan
    document.getElementById('formLaporan').addEventListener('submit', handleSubmit);
    
    // File upload - klik area upload
    const fileUpload = document.getElementById('fileUpload');
    const fileInput = document.getElementById('fotoLaporan');
    
    // Klik untuk pilih file
    fileUpload.addEventListener('click', () => fileInput.click());
    
    // Drag over - highlight area
    fileUpload.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUpload.style.borderColor = 'var(--primary)';
    });
    
    // Drag leave - reset highlight
    fileUpload.addEventListener('dragleave', () => {
        fileUpload.style.borderColor = '';
    });
    
    // Drop - handle file yang di-drop
    fileUpload.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUpload.style.borderColor = '';
        if (e.dataTransfer.files.length) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });
    
    // Change - file dipilih via input
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileSelect(e.target.files[0]);
        }
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
    // Update tombol tab - hapus active dari semua, tambahkan ke yang diklik
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabId) btn.classList.add('active');
    });
    
    // Update konten tab
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab-${tabId}`).classList.add('active');
    
    // Load data jika tab list aktif
    if (tabId === 'list') {
        loadLaporanList();
    }
}

// ============================================
// FILE HANDLING
// Fungsi untuk menangani file upload
// ============================================

// Handle file yang dipilih
function handleFileSelect(file) {
    // Validasi: harus gambar
    if (!file.type.startsWith('image/')) {
        showAlert('error', 'Hanya file gambar yang diperbolehkan');
        return;
    }
    
    // Validasi: max 5MB
    if (file.size > 5 * 1024 * 1024) {
        showAlert('error', 'Ukuran file maksimal 5MB');
        return;
    }
    
    // Simpan file
    selectedFile = file;
    
    // Tampilkan preview
    const preview = document.getElementById('filePreview');
    const reader = new FileReader();
    
    reader.onload = (e) => {
        preview.innerHTML = `
            <img src="${e.target.result}" alt="Preview">
            <div class="file-name">
                <i class="fas fa-image"></i>
                <span>${file.name}</span>
                <i class="fas fa-times remove-file" onclick="removeFile()"></i>
            </div>
        `;
    };
    
    reader.readAsDataURL(file);
}

// Hapus file yang dipilih
function removeFile() {
    selectedFile = null;
    document.getElementById('filePreview').innerHTML = '';
    document.getElementById('fotoLaporan').value = '';
}

// ============================================
// FORM SUBMIT
// Fungsi untuk mengirim laporan
// ============================================
async function handleSubmit(e) {
    e.preventDefault();  // Cegah reload halaman
    
    // Ambil tombol submit dan ubah state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
    
    try {
        // Ambil nilai dari form
        const namaPelapor = document.getElementById('namaPelapor').value.trim();
        const rthId = document.getElementById('lokasiRth').value;
        const kategori = document.getElementById('kategoriLaporan').value;
        const deskripsi = document.getElementById('deskripsiMasalah').value.trim();
        
        let fotoUrl = null;
        
        // Upload foto jika ada dan Supabase tersedia
        if (selectedFile && window.supabaseDB && window.supabaseDB.isConnected()) {
            fotoUrl = await window.supabaseDB.uploadFoto(selectedFile);
        }
        
        // Siapkan data laporan
        const laporan = {
            nama_pelapor: namaPelapor,
            rth_id: rthId,
            kategori: kategori,
            deskripsi: deskripsi,
            foto_url: fotoUrl,
            status: 'baru',
            created_at: new Date().toISOString()
        };
        
        // Simpan laporan
        if (window.supabaseDB && window.supabaseDB.isConnected()) {
            // Simpan ke Supabase
            await window.supabaseDB.insertLaporan(laporan);
        } else {
            // Mode demo - simpan ke localStorage
            const existing = JSON.parse(localStorage.getItem('rth_laporan') || '[]');
            laporan.id = Date.now().toString();
            existing.unshift(laporan);  // Tambahkan di awal
            localStorage.setItem('rth_laporan', JSON.stringify(existing));
        }
        
        // Tampilkan pesan sukses
        showAlert('success', 'Laporan berhasil dikirim! Terima kasih atas partisipasi Anda.');
        
        // Reset form
        e.target.reset();
        removeFile();
        
    } catch (error) {
        console.error('Error submitting laporan:', error);
        showAlert('error', 'Gagal mengirim laporan. Silakan coba lagi.');
    } finally {
        // Kembalikan state tombol
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim Laporan';
    }
}

// ============================================
// LOAD & RENDER LIST
// Fungsi untuk menampilkan daftar laporan
// ============================================

// Load daftar laporan
async function loadLaporanList() {
    const container = document.getElementById('laporanList');
    
    // Tampilkan loading
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    try {
        let laporanData;
        
        // Ambil data dari Supabase atau localStorage
        if (window.supabaseDB && window.supabaseDB.isConnected()) {
            laporanData = await window.supabaseDB.getAllLaporan();
        } else {
            laporanData = JSON.parse(localStorage.getItem('rth_laporan') || '[]');
        }
        
        // Render list
        renderLaporanList(container, laporanData);
        
    } catch (error) {
        console.error('Error loading laporan:', error);
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <h3>Gagal Memuat Data</h3>
                <p>Silakan coba lagi nanti.</p>
            </div>
        `;
    }
}

// Render daftar laporan ke HTML
function renderLaporanList(container, data) {
    // Tampilkan empty state jika tidak ada data
    if (!data || data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-alt"></i>
                <h3>Belum Ada Laporan</h3>
                <p>Jadilah yang pertama melaporkan kondisi RTH!</p>
            </div>
        `;
        return;
    }
    
    // Build HTML list
    let html = '<div class="list-container">';
    
    data.forEach(laporan => {
        // Cari nama RTH
        const rthName = laporan.rth?.nama_rth || getRthName(laporan.rth_id);
        const date = formatDate(laporan.created_at);
        const statusClass = `status-${laporan.status}`;
        
        html += `
            <div class="list-item">
                <div class="list-item-header">
                    <span class="list-item-title">${laporan.kategori}</span>
                    <span class="status-badge ${statusClass}">${laporan.status}</span>
                </div>
                <div class="list-item-meta">
                    <span><i class="fas fa-user"></i> ${laporan.nama_pelapor}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${rthName}</span>
                    <span><i class="fas fa-calendar"></i> ${date}</span>
                </div>
                <div class="list-item-content">
                    ${laporan.deskripsi}
                </div>
                ${laporan.foto_url ? `
                    <div class="list-item-footer">
                        <a href="${laporan.foto_url}" target="_blank" class="btn btn-sm btn-info">
                            <i class="fas fa-image"></i> Lihat Foto
                        </a>
                    </div>
                ` : ''}
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
    const rth = rthData.find(r => r.id === rthId || r.objectid?.toString() === rthId);
    return rth ? rth.nama_rth : 'Unknown';
}

// Format tanggal ke format Indonesia
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Tampilkan alert/notifikasi
function showAlert(type, message) {
    const container = document.getElementById('alertContainer');
    const alertId = Date.now();
    
    // Tentukan icon berdasarkan type
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
    
    // Auto remove setelah 5 detik
    setTimeout(() => {
        const alert = document.getElementById(`alert-${alertId}`);
        if (alert) alert.remove();
    }, 5000);
}
