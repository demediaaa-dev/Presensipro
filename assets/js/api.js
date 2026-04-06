const API_URL = "https://script.google.com/macros/s/AKfycbzCY_l2Vl02eNHeciDxbsiNnV2BEoC6QFtKBP6IvjKg9_RYfpNndA2-EOB1sHOkORNHjw/exec";

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
