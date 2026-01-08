// ============================================
// SUPABASE-CONFIG.JS
// Konfigurasi dan Helper Functions untuk Supabase
// WebGIS RTH Kota Pekanbaru
// ============================================

// ============================================
// KONFIGURASI SUPABASE
// Ganti dengan credentials project Anda
// ============================================
const SUPABASE_URL = 'https://lzzdxqhidqasblxktykv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6emR4cWhpZHFhc2JseGt0eWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4ODQ3MzcsImV4cCI6MjA4MzQ2MDczN30.Xys9hMegrCbjR73x-h1uVcZqBxteYX0hh2em9dnHp_Q';

// ============================================
// INISIALISASI SUPABASE CLIENT
// Menggunakan nama 'supabaseClient' untuk menghindari
// conflict dengan library global 'supabase'
// ============================================
let supabaseClient = null;

// Fungsi untuk inisialisasi Supabase
function initSupabase() {
    // Cek apakah library Supabase sudah di-load
    if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
        // Buat client dengan URL dan API Key
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client initialized');
        return true;
    }
    console.error('❌ Supabase library not loaded');
    return false;
}

// Jalankan inisialisasi saat file di-load
initSupabase();

// ============================================
// HELPER FUNCTIONS - RTH
// Fungsi untuk mengambil data RTH
// ============================================

// Ambil semua data RTH dari database
async function getAllRthFromDB() {
    // Pastikan client sudah terinisialisasi
    if (!supabaseClient) initSupabase();
    if (!supabaseClient) return [];
    
    // Query ke tabel 'rth', urutkan berdasarkan objectid
    const { data, error } = await supabaseClient
        .from('rth')
        .select('*')
        .order('objectid');
    
    // Handle error
    if (error) {
        console.error('Error fetching RTH:', error);
        return [];
    }
    
    return data || [];
}

// Ambil RTH berdasarkan objectid
async function getRthByObjectId(objectid) {
    if (!supabaseClient) return null;
    
    const { data, error } = await supabaseClient
        .from('rth')
        .select('*')
        .eq('objectid', objectid)
        .single();  // Hanya ambil 1 record
    
    if (error) return null;
    return data;
}

// ============================================
// HELPER FUNCTIONS - LAPORAN
// Fungsi untuk CRUD data Laporan
// ============================================

// Insert laporan baru
async function insertLaporan(laporan) {
    // Pastikan client tersedia
    if (!supabaseClient) initSupabase();
    if (!supabaseClient) throw new Error('Supabase not available');
    
    // Siapkan data untuk insert
    // parseInt untuk memastikan rth_id bertipe integer
    const dataToInsert = {
        nama_pelapor: laporan.nama_pelapor,
        rth_id: parseInt(laporan.rth_id),
        kategori: laporan.kategori,
        deskripsi: laporan.deskripsi,
        foto_url: laporan.foto_url || null,
        status: 'baru'  // Status default
    };
    
    console.log('📤 Inserting laporan:', dataToInsert);
    
    // Insert ke database
    const { data, error } = await supabaseClient
        .from('laporan')
        .insert([dataToInsert])
        .select()
        .single();
    
    // Handle error
    if (error) {
        console.error('❌ Error inserting laporan:', error);
        throw error;
    }
    
    console.log('✅ Laporan inserted:', data);
    return data;
}

// Ambil semua laporan, urutkan dari terbaru
async function getAllLaporan() {
    if (!supabaseClient) initSupabase();
    if (!supabaseClient) return [];
    
    const { data, error } = await supabaseClient
        .from('laporan')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching laporan:', error);
        return [];
    }
    return data || [];
}

// Update status laporan (baru -> diproses -> selesai)
async function updateStatusLaporan(id, status) {
    if (!supabaseClient) return null;
    
    const { data, error } = await supabaseClient
        .from('laporan')
        .update({ status: status })
        .eq('id', id)
        .select()
        .single();
    
    if (error) return null;
    return data;
}

// Hapus laporan berdasarkan ID
async function deleteLaporan(id) {
    if (!supabaseClient) return false;
    
    const { error } = await supabaseClient
        .from('laporan')
        .delete()
        .eq('id', id);
    
    return !error;  // Return true jika tidak ada error
}

// Ambil laporan berdasarkan RTH ID
async function getLaporanByRth(rthId) {
    if (!supabaseClient) return [];
    
    const { data, error } = await supabaseClient
        .from('laporan')
        .select('*')
        .eq('rth_id', parseInt(rthId))
        .order('created_at', { ascending: false });
    
    if (error) return [];
    return data || [];
}

// ============================================
// HELPER FUNCTIONS - REVIEW
// Fungsi untuk CRUD data Review
// ============================================

// Insert review baru
async function insertReview(review) {
    if (!supabaseClient) initSupabase();
    if (!supabaseClient) throw new Error('Supabase not available');
    
    // Siapkan data
    const dataToInsert = {
        nama: review.nama,
        rth_id: parseInt(review.rth_id),
        rating: parseInt(review.rating),
        komentar: review.komentar || ''
    };
    
    console.log('📤 Inserting review:', dataToInsert);
    
    const { data, error } = await supabaseClient
        .from('review')
        .insert([dataToInsert])
        .select()
        .single();
    
    if (error) {
        console.error('❌ Error inserting review:', error);
        throw error;
    }
    
    console.log('✅ Review inserted:', data);
    return data;
}

// Ambil semua review
async function getAllReview() {
    if (!supabaseClient) initSupabase();
    if (!supabaseClient) return [];
    
    const { data, error } = await supabaseClient
        .from('review')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) return [];
    return data || [];
}

// Ambil review berdasarkan RTH ID
async function getReviewByRth(rthId) {
    if (!supabaseClient) return [];
    
    const { data, error } = await supabaseClient
        .from('review')
        .select('*')
        .eq('rth_id', parseInt(rthId))
        .order('created_at', { ascending: false });
    
    if (error) return [];
    return data || [];
}

// Hitung rata-rata rating per RTH
async function getRatingPerRth() {
    if (!supabaseClient) return [];
    
    // Ambil semua rating
    const { data, error } = await supabaseClient
        .from('review')
        .select('rth_id, rating');
    
    if (error) return [];
    
    // Hitung rata-rata per RTH menggunakan Map
    const ratingMap = {};
    (data || []).forEach(r => {
        if (!ratingMap[r.rth_id]) {
            ratingMap[r.rth_id] = {
                rth_id: r.rth_id,
                nama_rth: 'RTH #' + r.rth_id,
                total_rating: 0,
                count: 0
            };
        }
        ratingMap[r.rth_id].total_rating += r.rating;
        ratingMap[r.rth_id].count += 1;
    });
    
    // Konversi ke array dan hitung rata-rata
    return Object.values(ratingMap)
        .map(r => ({ ...r, rata_rata: (r.total_rating / r.count).toFixed(1) }))
        .sort((a, b) => b.rata_rata - a.rata_rata);  // Urutkan dari tertinggi
}

// ============================================
// HELPER FUNCTIONS - UPLOAD FOTO
// Fungsi untuk upload foto ke Supabase Storage
// ============================================

async function uploadFoto(file) {
    // Pastikan client tersedia
    if (!supabaseClient) {
        console.error('❌ Supabase not initialized for upload');
        initSupabase();
    }
    if (!supabaseClient) {
        console.error('❌ Cannot upload - Supabase not available');
        return null;
    }
    
    // Ambil ekstensi file asli (jpg, png, dll)
    const fileExt = file.name.split('.').pop().toLowerCase();
    
    // Buat nama file unik dengan timestamp + random string
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `laporan/${fileName}`;
    
    // Log info upload
    console.log('📤 Uploading foto...');
    console.log('   File name:', file.name);
    console.log('   File type:', file.type);
    console.log('   File size:', (file.size / 1024).toFixed(2), 'KB');
    console.log('   Target path:', filePath);
    
    try {
        // Upload ke Supabase Storage bucket 'foto-laporan'
        const { data, error } = await supabaseClient.storage
            .from('foto-laporan')
            .upload(filePath, file, {
                cacheControl: '3600',  // Cache 1 jam
                upsert: false          // Jangan timpa jika ada
            });
        
        // Handle error upload
        if (error) {
            console.error('❌ Upload error:', error.message);
            return null;  // Return null agar laporan tetap bisa dikirim
        }
        
        console.log('✅ Upload success:', data);
        
        // Dapatkan URL publik
        const { data: urlData } = supabaseClient.storage
            .from('foto-laporan')
            .getPublicUrl(filePath);
        
        console.log('✅ Public URL:', urlData.publicUrl);
        return urlData.publicUrl;
        
    } catch (err) {
        console.error('❌ Upload exception:', err);
        return null;
    }
}

// ============================================
// HELPER FUNCTIONS - STATISTIK
// Fungsi untuk mengambil data statistik
// ============================================

// Statistik laporan (total, baru, diproses, selesai)
async function getStatistikLaporan() {
    if (!supabaseClient) return { total: 0, baru: 0, diproses: 0, selesai: 0 };
    
    // Ambil semua status laporan
    const { data, error } = await supabaseClient
        .from('laporan')
        .select('status');
    
    if (error) return { total: 0, baru: 0, diproses: 0, selesai: 0 };
    
    const list = data || [];
    
    // Hitung per status
    return {
        total: list.length,
        baru: list.filter(l => l.status === 'baru').length,
        diproses: list.filter(l => l.status === 'diproses').length,
        selesai: list.filter(l => l.status === 'selesai').length
    };
}

// Statistik review (total dan rata-rata rating)
async function getStatistikReview() {
    if (!supabaseClient) return { total: 0, rata_rata: '-' };
    
    const { data, error } = await supabaseClient
        .from('review')
        .select('rating');
    
    if (error) return { total: 0, rata_rata: '-' };
    
    const list = data || [];
    const total = list.length;
    const totalRating = list.reduce((sum, r) => sum + r.rating, 0);
    
    return {
        total: total,
        rata_rata: total > 0 ? (totalRating / total).toFixed(1) : '-'
    };
}

// ============================================
// FUNGSI CEK KONEKSI
// Untuk memastikan koneksi ke Supabase berjalan
// ============================================

// Cek apakah Supabase terkoneksi
function isSupabaseConnected() {
    if (!supabaseClient) initSupabase();
    return supabaseClient !== null;
}

// Test koneksi dengan query sederhana
async function testConnection() {
    if (!supabaseClient) initSupabase();
    if (!supabaseClient) return false;
    
    try {
        // Coba query 1 record dari tabel rth
        const { data, error } = await supabaseClient
            .from('rth')
            .select('objectid')
            .limit(1);
        
        if (error) {
            console.error('❌ Test failed:', error);
            return false;
        }
        
        console.log('✅ Connection OK');
        return true;
    } catch (e) {
        console.error('❌ Test error:', e);
        return false;
    }
}

// ============================================
// EXPORT - Expose functions ke window object
// Agar bisa diakses dari file JS lain
// ============================================

window.supabaseDB = {
    // Client
    client: supabaseClient,
    
    // Connection
    isConnected: isSupabaseConnected,
    testConnection,
    
    // RTH
    getAllRthFromDB,
    getRthByObjectId,
    
    // Laporan
    insertLaporan,
    getAllLaporan,
    updateStatusLaporan,
    deleteLaporan,
    getLaporanByRth,
    
    // Review
    insertReview,
    getAllReview,
    getReviewByRth,
    getRatingPerRth,
    
    // Upload
    uploadFoto,
    
    // Statistik
    getStatistikLaporan,
    getStatistikReview
};

// Log saat file di-load
console.log('📦 Supabase Config Loaded');

// Test koneksi otomatis
testConnection();
