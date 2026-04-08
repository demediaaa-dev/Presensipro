const API = {
    // Ganti dengan URL Web App yang Anda dapatkan saat Deploy di Google Apps Script
    url: "https://script.google.com/macros/s/AKfycbwelVQVDDIr5tTZ4_vbMfNie6inB4u2cyDROysZD_dktnWV5KtqOvVXKC92_aRBfNBIRg/exec",

    async call(data) {
        try {
            // Gunakan mode: 'no-cors' tidak disarankan jika ingin membaca JSON res, 
            // biarkan default dan pastikan di kode.gs sudah ada ContentService
            const response = await fetch(this.url, {
                method: "POST",
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error("API Call Error:", error);
            return { success: false, message: "Koneksi ke server gagal" };
        }
    }
};