const API_URL = "https://script.google.com/macros/s/AKfycbxAyCT8PcnXAP5RVOzeYu1OGi909-FfD6FaFqf3-rU77T5tX_oWK4CguOdRqQmiVhiuxw/exec";

const API = {
  async call(data) { // Diubah dari 'post' ke 'call' agar sinkron dengan app.js
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch (e) {
      console.error(e);
      return { success: false, message: "Gagal terhubung ke server" };
    }
  }
};
