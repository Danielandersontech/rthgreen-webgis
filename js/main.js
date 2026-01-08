// ============================================
// MAIN.JS
// JavaScript untuk Peta Interaktif Leaflet
// WebGIS RTH Kota Pekanbaru
// ============================================

// ============================================
// VARIABEL GLOBAL
// ============================================
var map;                // Instance peta Leaflet
var allData = [];       // Semua data RTH dari GeoJSON
var markers = [];       // Array marker yang ditampilkan
var markerCluster;      // Layer group untuk clustering

// State filter saat ini
var currentFilters = {
    layers: ['Taman Kota', 'Jalur Hijau Di Jalan', 'Taman', 'Kebun Bibit', 'Hutan Kota'],
    fasilitas: [],
    luas: 'all',
    pengunjung: 'all',
    search: ''
};

// Konfigurasi warna berdasarkan jenis RTH
var colorConfig = {
    'Taman Kota': { color: '#27ae60', icon: 'fa-tree' },
    'Jalur Hijau Di Jalan': { color: '#3498db', icon: 'fa-road' },
    'Taman': { color: '#9b59b6', icon: 'fa-spa' },
    'Kebun Bibit': { color: '#e67e22', icon: 'fa-seedling' },
    'Hutan Kota': { color: '#16a085', icon: 'fa-mountain' }
};

// Konfigurasi basemap
var basemaps = {
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }),
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri'
    }),
    topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenTopoMap'
    }),
    dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO'
    })
};

// ============================================
// INISIALISASI PETA
// ============================================
function initMap() {
    // Buat peta dengan center di Pekanbaru
    map = L.map('map', {
        center: [0.5071, 101.4478],  // Koordinat Pekanbaru
        zoom: 13,
        zoomControl: false           // Disable default zoom control
    });

    // Tambahkan basemap default (OSM)
    basemaps.osm.addTo(map);

    // Tambahkan zoom control di kanan bawah
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    // Inisialisasi marker cluster
    markerCluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        iconCreateFunction: function(cluster) {
            var count = cluster.getChildCount();
            var size = 'small';
            if (count >= 10) size = 'medium';
            if (count >= 50) size = 'large';
            
            return L.divIcon({
                html: '<div>' + count + '</div>',
                className: 'marker-cluster marker-cluster-' + size,
                iconSize: L.point(40, 40)
            });
        }
    });

    map.addLayer(markerCluster);

    // Load data GeoJSON
    loadData();

    // Setup event listeners
    setupEventListeners();
}

// ============================================
// LOAD DATA GEOJSON
// ============================================
function loadData() {
    fetch('data/rth_pekanbaru.geojson')
        .then(function(response) {
            return response.json();
        })
        .then(function(geojson) {
            allData = geojson.features;
            console.log('Data loaded: ' + allData.length + ' lokasi RTH');
            
            renderMarkers();
            updateStatistics();
        })
        .catch(function(error) {
            console.error('Error loading data:', error);
            alert('Gagal memuat data RTH. Pastikan file GeoJSON tersedia.');
        });
}

// ============================================
// MEMBUAT MARKER
// ============================================
function createMarker(feature) {
    var props = feature.properties;
    var coords = feature.geometry.coordinates;
    var config = colorConfig[props.Jenis_RTH] || { color: '#95a5a6', icon: 'fa-map-marker' };
    
    // Tentukan ukuran marker berdasarkan luas
    var sizeClass = 'marker-small';
    var iconSize = [24, 24];
    
    if (props.Kls_Luas === 'Sedang') {
        sizeClass = 'marker-medium';
        iconSize = [30, 30];
    } else if (props.Kls_Luas === 'Besar') {
        sizeClass = 'marker-large';
        iconSize = [36, 36];
    } else if (props.Kls_Luas === 'Sangat Besar') {
        sizeClass = 'marker-xlarge';
        iconSize = [42, 42];
    }
    
    // Buat class nama untuk marker
    var markerClass = 'marker-' + props.Jenis_RTH.toLowerCase().replace(/ /g, '-');
    
    // Buat div icon custom
    var icon = L.divIcon({
        className: '',
        html: '<div class="custom-marker ' + markerClass + ' ' + sizeClass + '" style="background: ' + config.color + ';">' +
                   '<i class="fas ' + config.icon + '"></i>' +
               '</div>',
        iconSize: iconSize,
        iconAnchor: [iconSize[0]/2, iconSize[1]/2]
    });
    
    // Buat marker (Leaflet menggunakan [lat, lng])
    var marker = L.marker([coords[1], coords[0]], { icon: icon });
    
    // Tambahkan popup
    marker.bindPopup(createPopupContent(props));
    
    // Event klik untuk info panel
    marker.on('click', function() {
        showInfoPanel(props);
    });
    
    // Simpan properties ke marker
    marker.properties = props;
    
    return marker;
}

// ============================================
// MEMBUAT KONTEN POPUP
// ============================================
function createPopupContent(props) {
    var config = colorConfig[props.Jenis_RTH] || { color: '#95a5a6' };
    
    var html = '<div class="popup-content">' +
        '<div class="popup-title" style="border-color: ' + config.color + ';">' +
            props.Nama_RTH +
        '</div>' +
        '<div class="popup-row">' +
            '<span class="popup-label">Jenis RTH:</span>' +
            '<span class="popup-value">' + props.Jenis_RTH + '</span>' +
        '</div>' +
        '<div class="popup-row">' +
            '<span class="popup-label">Luas:</span>' +
            '<span class="popup-value">' + formatNumber(props.Luas_m2) + ' m²</span>' +
        '</div>' +
        '<div class="popup-row">' +
            '<span class="popup-label">Vegetasi:</span>' +
            '<span class="popup-value">' + props.Vegetasi + '</span>' +
        '</div>' +
        '<div class="popup-row">' +
            '<span class="popup-label">Pengunjung:</span>' +
            '<span class="popup-value">' + props.Pengunjung + '/hari</span>' +
        '</div>' +
        '<button class="popup-btn" onclick=\'showInfoPanel(' + JSON.stringify(props).replace(/'/g, "\\'") + ')\'>' +
            '<i class="fas fa-info-circle"></i> Detail Lengkap' +
        '</button>' +
    '</div>';
    
    return html;
}

// ============================================
// MENAMPILKAN INFO PANEL
// ============================================
function showInfoPanel(props) {
    var infoPanel = document.getElementById('infoPanel');
    var infoTitle = document.getElementById('infoTitle');
    var infoContent = document.getElementById('infoContent');
    
    infoTitle.textContent = props.Nama_RTH;
    
    var html = '<div class="info-row">' +
            '<span class="info-label">Jenis RTH</span>' +
            '<span class="info-value">' + props.Jenis_RTH + '</span>' +
        '</div>' +
        '<div class="info-row">' +
            '<span class="info-label">Luas</span>' +
            '<span class="info-value">' + formatNumber(props.Luas_m2) + ' m² (' + props.Kls_Luas + ')</span>' +
        '</div>' +
        '<div class="info-row">' +
            '<span class="info-label">Jenis Vegetasi</span>' +
            '<span class="info-value">' + props.Vegetasi + '</span>' +
        '</div>' +
        '<div class="info-row">' +
            '<span class="info-label">Tempat Duduk</span>' +
            '<span class="info-value">' +
                '<span class="info-badge ' + (props.Tmp_Duduk === 'Ada' ? 'badge-ada' : 'badge-tidak') + '">' +
                    props.Tmp_Duduk +
                '</span>' +
            '</span>' +
        '</div>' +
        '<div class="info-row">' +
            '<span class="info-label">Tempat Sampah</span>' +
            '<span class="info-value">' +
                '<span class="info-badge ' + (props.Tmp_Sampah === 'Ada' ? 'badge-ada' : 'badge-tidak') + '">' +
                    props.Tmp_Sampah +
                '</span>' +
            '</span>' +
        '</div>' +
        '<div class="info-row">' +
            '<span class="info-label">Penerangan</span>' +
            '<span class="info-value">' +
                '<span class="info-badge ' + (props.Penerangan === 'Ada' ? 'badge-ada' : 'badge-tidak') + '">' +
                    props.Penerangan +
                '</span>' +
            '</span>' +
        '</div>' +
        '<div class="info-row">' +
            '<span class="info-label">Frekuensi Pengunjung</span>' +
            '<span class="info-value">' + props.Pengunjung + ' orang/hari (' + props.Kls_Pngnjg + ')</span>' +
        '</div>';
    
    infoContent.innerHTML = html;
    infoPanel.classList.add('active');
}

// ============================================
// RENDER MARKERS BERDASARKAN FILTER
// ============================================
function renderMarkers() {
    // Hapus semua marker
    markerCluster.clearLayers();
    markers = [];
    
    // Filter data
    var filteredData = allData.filter(function(feature) {
        var props = feature.properties;
        
        // Filter Layer (Jenis RTH)
        if (currentFilters.layers.indexOf(props.Jenis_RTH) === -1) {
            return false;
        }
        
        // Filter Fasilitas
        if (currentFilters.fasilitas.length > 0) {
            var hasFasilitas = true;
            for (var i = 0; i < currentFilters.fasilitas.length; i++) {
                var f = currentFilters.fasilitas[i];
                if (f === 'tempat_duduk' && props.Tmp_Duduk !== 'Ada') hasFasilitas = false;
                if (f === 'tempat_sampah' && props.Tmp_Sampah !== 'Ada') hasFasilitas = false;
                if (f === 'penerangan' && props.Penerangan !== 'Ada') hasFasilitas = false;
            }
            if (!hasFasilitas) return false;
        }
        
        // Filter Luas
        if (currentFilters.luas !== 'all' && props.Kls_Luas !== currentFilters.luas) {
            return false;
        }
        
        // Filter Pengunjung
        if (currentFilters.pengunjung !== 'all' && props.Kls_Pngnjg !== currentFilters.pengunjung) {
            return false;
        }
        
        // Filter Search
        if (currentFilters.search) {
            var searchLower = currentFilters.search.toLowerCase();
            if (props.Nama_RTH.toLowerCase().indexOf(searchLower) === -1) {
                return false;
            }
        }
        
        return true;
    });
    
    // Buat markers
    for (var i = 0; i < filteredData.length; i++) {
        var marker = createMarker(filteredData[i]);
        markers.push(marker);
        markerCluster.addLayer(marker);
    }
    
    updateStatistics();
    
    // Fit bounds pada initial load
    if (markers.length > 0 && allData.length === filteredData.length) {
        var group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

// ============================================
// UPDATE STATISTIK
// ============================================
function updateStatistics() {
    // Total yang tampil
    document.getElementById('total-visible').textContent = markers.length;
    
    // Total luas (konversi ke hektar)
    var totalLuas = 0;
    for (var i = 0; i < markers.length; i++) {
        totalLuas += markers[i].properties.Luas_m2;
    }
    document.getElementById('total-luas').textContent = (totalLuas / 10000).toFixed(2);
    
    // Hitung per kategori
    var counts = {
        'Taman Kota': 0,
        'Jalur Hijau Di Jalan': 0,
        'Taman': 0,
        'Kebun Bibit': 0,
        'Hutan Kota': 0
    };
    
    for (var j = 0; j < markers.length; j++) {
        var jenis = markers[j].properties.Jenis_RTH;
        if (counts.hasOwnProperty(jenis)) {
            counts[jenis]++;
        }
    }
    
    // Update elemen count
    document.getElementById('count-taman-kota').textContent = counts['Taman Kota'];
    document.getElementById('count-jalur-hijau').textContent = counts['Jalur Hijau Di Jalan'];
    document.getElementById('count-taman').textContent = counts['Taman'];
    document.getElementById('count-kebun-bibit').textContent = counts['Kebun Bibit'];
    document.getElementById('count-hutan-kota').textContent = counts['Hutan Kota'];
}

// ============================================
// SETUP EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('collapsed');
        setTimeout(function() { map.invalidateSize(); }, 300);
    });
    
    // Mobile sidebar toggle
    document.getElementById('mobileSidebarToggle').addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('active');
    });
    
    // Legend toggle
    document.getElementById('legendToggle').addEventListener('click', function() {
        var content = document.getElementById('legendContent');
        var icon = this.querySelector('i');
        content.classList.toggle('collapsed');
        icon.classList.toggle('fa-minus');
        icon.classList.toggle('fa-plus');
    });
    
    // Info panel close
    document.getElementById('infoClose').addEventListener('click', function() {
        document.getElementById('infoPanel').classList.remove('active');
    });
    
    // Layer checkboxes
    var layerCheckboxes = document.querySelectorAll('[data-layer]');
    for (var i = 0; i < layerCheckboxes.length; i++) {
        layerCheckboxes[i].addEventListener('change', function() {
            var layer = this.getAttribute('data-layer');
            if (this.checked) {
                if (currentFilters.layers.indexOf(layer) === -1) {
                    currentFilters.layers.push(layer);
                }
            } else {
                var idx = currentFilters.layers.indexOf(layer);
                if (idx > -1) {
                    currentFilters.layers.splice(idx, 1);
                }
            }
            renderMarkers();
        });
    }
    
    // Fasilitas checkboxes
    var fasilitasCheckboxes = document.querySelectorAll('[data-filter]');
    for (var j = 0; j < fasilitasCheckboxes.length; j++) {
        fasilitasCheckboxes[j].addEventListener('change', function() {
            var filter = this.getAttribute('data-filter');
            if (this.checked) {
                if (currentFilters.fasilitas.indexOf(filter) === -1) {
                    currentFilters.fasilitas.push(filter);
                }
            } else {
                var idx = currentFilters.fasilitas.indexOf(filter);
                if (idx > -1) {
                    currentFilters.fasilitas.splice(idx, 1);
                }
            }
            renderMarkers();
        });
    }
    
    // Luas filter
    document.getElementById('filter-luas').addEventListener('change', function() {
        currentFilters.luas = this.value;
        renderMarkers();
    });
    
    // Pengunjung filter
    document.getElementById('filter-pengunjung').addEventListener('change', function() {
        currentFilters.pengunjung = this.value;
        renderMarkers();
    });
    
    // Search input dengan debounce
    var searchTimeout;
    document.getElementById('searchInput').addEventListener('input', function() {
        var self = this;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function() {
            currentFilters.search = self.value;
            renderMarkers();
        }, 300);
    });
    
    // Basemap select
    document.getElementById('basemap-select').addEventListener('change', function() {
        for (var key in basemaps) {
            if (map.hasLayer(basemaps[key])) {
                map.removeLayer(basemaps[key]);
            }
        }
        basemaps[this.value].addTo(map);
    });
    
    // Reset filters
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    // Export data
    document.getElementById('exportData').addEventListener('click', exportData);
    
    // Mobile navigation
    var hamburger = document.querySelector('.hamburger');
    var navMenu = document.querySelector('.nav-menu');
    
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
    
    // Tutup sidebar saat klik peta (mobile)
    map.on('click', function() {
        if (window.innerWidth <= 968) {
            document.getElementById('sidebar').classList.remove('active');
        }
    });
}

// ============================================
// RESET FILTERS
// ============================================
function resetFilters() {
    currentFilters = {
        layers: ['Taman Kota', 'Jalur Hijau Di Jalan', 'Taman', 'Kebun Bibit', 'Hutan Kota'],
        fasilitas: [],
        luas: 'all',
        pengunjung: 'all',
        search: ''
    };
    
    // Reset UI
    var layerCheckboxes = document.querySelectorAll('[data-layer]');
    for (var i = 0; i < layerCheckboxes.length; i++) {
        layerCheckboxes[i].checked = true;
    }
    
    var filterCheckboxes = document.querySelectorAll('[data-filter]');
    for (var j = 0; j < filterCheckboxes.length; j++) {
        filterCheckboxes[j].checked = false;
    }
    
    document.getElementById('filter-luas').value = 'all';
    document.getElementById('filter-pengunjung').value = 'all';
    document.getElementById('searchInput').value = '';
    
    renderMarkers();
    
    if (markers.length > 0) {
        var group = new L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

// ============================================
// EXPORT DATA KE CSV
// ============================================
function exportData() {
    if (markers.length === 0) {
        alert('Tidak ada data untuk diekspor');
        return;
    }
    
    var headers = ['Nama RTH', 'Jenis RTH', 'Luas (m2)', 'Vegetasi', 'Tempat Duduk', 'Tempat Sampah', 'Penerangan', 'Pengunjung/hari'];
    var csvRows = [headers.join(',')];
    
    for (var i = 0; i < markers.length; i++) {
        var p = markers[i].properties;
        var row = [
            '"' + p.Nama_RTH + '"',
            '"' + p.Jenis_RTH + '"',
            p.Luas_m2,
            '"' + p.Vegetasi + '"',
            '"' + p.Tmp_Duduk + '"',
            '"' + p.Tmp_Sampah + '"',
            '"' + p.Penerangan + '"',
            p.Pengunjung
        ];
        csvRows.push(row.join(','));
    }
    
    var csv = csvRows.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    var url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'rth_pekanbaru_export_' + new Date().toISOString().slice(0,10) + '.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function formatNumber(num) {
    return new Intl.NumberFormat('id-ID').format(num);
}

// Expose showInfoPanel ke global untuk popup button
window.showInfoPanel = showInfoPanel;

// ============================================
// INISIALISASI SAAT DOM READY
// ============================================
document.addEventListener('DOMContentLoaded', initMap);
